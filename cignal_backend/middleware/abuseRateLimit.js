'use strict';
const shared = require('../utils/sharedQuotaStore');
const { notifyOperational } = require('../utils/operationalAlert');
// Process-local defense-in-depth only. Configure a shared limiter at the edge
// (Redis / CDN / platform WAF) before scaling to multiple backend instances.
const buckets = new Map();
const MAX_BUCKETS = 20000;
const RULES = Object.freeze({
  ticketCreate: { windowMs: 60 * 60 * 1000, max: 12 },
  ticketMessage: { windowMs: 60 * 60 * 1000, max: 60 },
  attachmentRead: { windowMs: 60 * 60 * 1000, max: 300 },
  technicianCreate: { windowMs: 60 * 60 * 1000, max: 6 },
  manualLoad: { windowMs: 60 * 60 * 1000, max: 12 },
  checkout: { windowMs: 60 * 60 * 1000, max: 8 },
});
let lastAlertAt = 0;

function createAbuseRateLimit(scope) {
  if (!Object.prototype.hasOwnProperty.call(RULES, scope)) {
    throw new Error(`Unknown rate-limit scope: ${scope}`);
  }
  const rule = RULES[scope];
  return (req, res, next) => {
    const id = req.user?.id;
    if (id == null) return res.status(401).json({ error: 'Authentication required' });
    const blocked = (retry) => {
      res.setHeader('Retry-After', String(Math.max(1, retry)));
      if (Date.now() - lastAlertAt > 60000) {
        lastAlertAt = Date.now();
        console.warn('CIGNALCARE_ABUSE_RATE_LIMIT', { scope, status: 429 });
        notifyOperational('ABUSE_RATE_LIMIT', { scope, status: 429 });
      }
      return res.status(429).json({ error: 'Request limit reached. Please try again later.' });
    };
    const local = () => {
      const now = Date.now();
      if (buckets.size >= 1000) {
        for (const [key, entry] of buckets) if (!entry || entry.expiresAt <= now) buckets.delete(key);
      }
      const key = `${scope}:user:${String(id)}`;
      let bucket = buckets.get(key);
      if (!bucket || bucket.expiresAt <= now) {
        if (buckets.size >= MAX_BUCKETS && !buckets.has(key)) {
          if (now - lastAlertAt > 60000) {
            lastAlertAt = now;
            console.error('CIGNALCARE_ABUSE_LIMIT_STORE_FULL', { scope, buckets: buckets.size });
          }
          return res.status(503).json({ error: 'Request protection is temporarily busy.' });
        }
        bucket = { count: 0, expiresAt: now + rule.windowMs };
        buckets.set(key, bucket);
      }
      if (bucket.count >= rule.max) return blocked(Math.ceil((bucket.expiresAt - now) / 1000));
      bucket.count += 1;
      return next();
    };
    if (!shared.configured()) return local();
    const quotas = [{ key: shared.hashedKey('abuse:' + scope, id), max: rule.max, ttlSeconds: Math.ceil(rule.windowMs / 1000) }];
    shared.reserveSharedQuota(quotas).then(ok => ok ? local() : blocked(Math.ceil(rule.windowMs / 1000)))
      .catch(() => {
        notifyOperational('SHARED_QUOTA_UNAVAILABLE', { scope });
        res.status(503).json({ error: 'Request protection is temporarily unavailable.' });
      });
    return undefined;
  };
}

module.exports = { createAbuseRateLimit, RULES };
