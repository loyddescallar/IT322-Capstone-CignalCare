const shared = require('../utils/sharedQuotaStore');
const { notifyOperational } = require('../utils/operationalAlert');
const buckets = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;

function cleanupExpired(now) {
  if (buckets.size < 500) return;
  for (const [key, value] of buckets.entries()) {
    if (!value || value.resetAt <= now) buckets.delete(key);
  }
}

function adminAuthRateLimit(req, res, next) {
  if (shared.configured()) {
    const actor = req.ip || req.socket?.remoteAddress || 'unknown';
    shared.reserveSharedQuota([{ key: shared.hashedKey('auth:admin-login', actor), max: MAX_REQUESTS, ttlSeconds: Math.ceil(WINDOW_MS / 1000) }])
      .then(ok => {
        if (!ok) {
          res.setHeader('Retry-After', String(Math.ceil(WINDOW_MS / 1000)));
          notifyOperational('AUTH_RATE_LIMIT', { scope: 'admin-login', status: 429 });
          return res.status(429).json({ error: 'Too many admin authentication attempts. Try again later.' });
        }
        return next();
      }).catch(() => {
        notifyOperational('SHARED_QUOTA_UNAVAILABLE', { scope: 'admin-login' });
        res.status(503).json({ error: 'Authentication protection is temporarily unavailable.' });
      });
    return undefined;
  }
  const key = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  cleanupExpired(now);
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  current.count += 1;
  if (current.count > MAX_REQUESTS) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too many admin authentication attempts. Try again later.' });
  }

  return next();
}

module.exports = adminAuthRateLimit;
