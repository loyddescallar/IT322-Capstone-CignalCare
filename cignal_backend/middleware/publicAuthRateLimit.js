const buckets = new Map();

function clientKey(req, scope) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = forwarded || req.ip || req.socket?.remoteAddress || 'unknown';
  return `${scope}:${ip}`;
}

function cleanupExpired(now) {
  if (buckets.size < 500) return;
  for (const [key, value] of buckets.entries()) {
    if (!value || value.resetAt <= now) buckets.delete(key);
  }
}

function createRateLimiter({ scope, windowMs, maxRequests, message }) {
  return (req, res, next) => {
    const now = Date.now();
    cleanupExpired(now);
    const key = clientKey(req, scope);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    current.count += 1;
    if (current.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({ error: message });
    }

    return next();
  };
}

const customerLoginRateLimit = createRateLimiter({
  scope: 'customer-login',
  windowMs: 10 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many login attempts. Please wait a few minutes and try again.',
});

const passwordChangeRateLimit = createRateLimiter({
  scope: 'customer-password-change',
  windowMs: 10 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many password-change attempts. Please wait a few minutes and try again.',
});

const accountInquiryRateLimit = createRateLimiter({
  scope: 'account-inquiry',
  windowMs: 10 * 60 * 1000,
  maxRequests: 20,
  message: 'Too many account inquiries. Please wait a few minutes and try again.',
});


const customerRecoveryRateLimit = createRateLimiter({
  scope: 'customer-recovery',
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many account-recovery attempts. Please wait a few minutes and try again.',
});


const customerEmailRateLimit = createRateLimiter({
  scope: 'customer-email-security',
  windowMs: 15 * 60 * 1000,
  maxRequests: 12,
  message: 'Too many email verification or recovery attempts. Please wait a few minutes and try again.',
});

module.exports = {
  customerLoginRateLimit,
  passwordChangeRateLimit,
  accountInquiryRateLimit,
  customerRecoveryRateLimit,
  customerEmailRateLimit,
};
