'use strict';
// Optional structured security alerts to an operator-configured HTTPS webhook.
// Logs remain available even when no webhook is configured; never include PII.
const recent = new Map();
function alertConfig() {
  const raw = String(process.env.CIGNALCARE_ALERT_WEBHOOK_URL || '').trim();
  if (!raw) return null;
  let url;
  try { url = new URL(raw); } catch { return null; }
  const allowedHost = String(process.env.CIGNALCARE_ALERT_WEBHOOK_HOST || '').trim().toLowerCase();
  if (!allowedHost || url.hostname.toLowerCase() !== allowedHost || url.protocol !== 'https:' || url.username || url.password) return null;
  return url.toString();
}
function notifyOperational(event, details = {}, options = {}) {
  const kind = String(event || '').replace(/[^A-Z0-9_]/g, '').slice(0, 65);
  if (!kind) return;
  const fields = {};
  for (const key of ['day', 'thresholdPercent', 'acceptedRequests', 'dailyLimit', 'scope', 'status']) {
    if (typeof details[key] === 'string' || typeof details[key] === 'number') fields[key] = details[key];
  }
  console.warn('CIGNALCARE_OPERATIONAL_ALERT', JSON.stringify({ kind, ...fields }));
  const url = alertConfig();
  if (!url) return;
  const now = Date.now();
  const id = `${kind}:${String(fields.day || '')}:${String(fields.thresholdPercent || '')}:${String(fields.scope || '')}`;
  if (recent.get(id) && now - recent.get(id) < 60000) return;
  recent.set(id, now);
  if (recent.size > 200) for (const [key, ts] of recent) if (ts < now - 3600000) recent.delete(key);
  const fetcher = options.fetcher || globalThis.fetch;
  if (typeof fetcher !== 'function') return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  // No token or URL is logged, webhook is opt-in, network failure cannot alter customer flow.
  Promise.resolve().then(() => fetcher(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ event:kind, ...fields }), signal:controller.signal, redirect:'error' }))
    .then(response => { if (!response.ok) console.warn('CIGNALCARE_ALERT_DELIVERY_FAILED', response.status); })
    .catch(() => console.warn('CIGNALCARE_ALERT_DELIVERY_FAILED'))
    .finally(() => clearTimeout(timer));
}
module.exports = { alertConfig, notifyOperational };
