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
