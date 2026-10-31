'use strict';
// Optional atomic shared quotas via Upstash Redis REST. No credentials, DB
// migrations or Redis network operations occur unless explicitly configured.
const crypto = require('node:crypto');
const LUA = `
local n = #KEYS
for i=1,n do
  local current=tonumber(redis.call('GET', KEYS[i]) or '0')
  if current >= tonumber(ARGV[i]) then return 0 end
end
for i=1,n do
  local count=redis.call('INCR', KEYS[i])
  if count == 1 then redis.call('EXPIRE', KEYS[i], tonumber(ARGV[n+i])) end
end
return 1
`;

function getConfig() {
  const url = String(process.env.UPSTASH_REDIS_REST_URL || '').trim().replace(/\/$/, '');
  const token = String(process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url && !token) return null;
  if (!url || !token) throw new Error('Incomplete shared quota configuration.');
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('Invalid shared quota URL.'); }
  // For safety, do not forward credentials to arbitrary or user-controlled hosts.
  if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.upstash\.io$/i.test(parsed.hostname) ||
      parsed.port || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error('Shared quota URL must be an Upstash HTTPS Redis REST endpoint.');
  }
  return { url: parsed.origin, token };
}

function configured() { return Boolean(getConfig()); }

function hashedKey(scope, actor) {
  const safeScope = String(scope || '').replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, 90);
  if (!safeScope || !actor) throw new Error('Invalid quota key.');
  const hash = crypto.createHash('sha256').update(String(actor)).digest('hex').slice(0, 40);
  return `ccq:v1:${safeScope}:${hash}`;
}

function manilaDay(now) { return new Date(now + 8 * 3600000).toISOString().slice(0, 10); }
function secondsToManilaMidnight(now) {
  const secs = Math.floor((now + 8 * 3600000) / 1000) % 86400;
  return Math.max(1, 86400 - secs);
}

async function reserveSharedQuota(quotas, options = {}) {
  const config = getConfig();
  if (!config) throw new Error('Shared quota provider is not configured.');
  if (!Array.isArray(quotas) || !quotas.length || quotas.length > 5) throw new Error('Invalid quota request.');
  const keys = [];
  const limits = [];
  const ttls = [];
  for (const q of quotas) {
    if (!q || typeof q.key !== 'string' || !/^ccq:v1:[a-zA-Z0-9:_-]{2,200}$/.test(q.key) ||
        !Number.isSafeInteger(q.max) || q.max < 1 || q.max > 10000 ||
        !Number.isSafeInteger(q.ttlSeconds) || q.ttlSeconds < 1 || q.ttlSeconds > 90000) {
      throw new Error('Invalid quota definition.');
    }
    keys.push(q.key); limits.push(String(q.max)); ttls.push(String(q.ttlSeconds));
  }
  const fetcher = options.fetcher || globalThis.fetch;
  if (typeof fetcher !== 'function') throw new Error('Fetch is unavailable.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    // EVAL is atomic, so separate app replicas cannot exceed shared quotas.
    const response = await fetcher(config.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(['EVAL', LUA, keys.length, ...keys, ...limits, ...ttls]),
      signal: controller.signal,
      redirect: 'error',
    });
    if (!response.ok) throw new Error(`Shared quota provider returned HTTP ${response.status}.`);
    const output = await response.json();
    if (!output || output.error || (output.result !== 0 && output.result !== 1)) throw new Error('Invalid shared quota provider response.');
    return output.result === 1;
  } finally { clearTimeout(timer); }
}
module.exports = { configured, getConfig, hashedKey, manilaDay, secondsToManilaMidnight, reserveSharedQuota, LUA };
