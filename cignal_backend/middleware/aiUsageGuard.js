'use strict';
const shared = require('../utils/sharedQuotaStore');
const { notifyOperational } = require('../utils/operationalAlert');

// IMPORTANT: This guard limits requests *within a Node process*; it is NOT a
// distributed billing cap. Keep CIGNALCARE_AI_MODE unset/disabled until Google
// AI Studio's project tier and provider-side spend cap have been verified.
// A future paid rollout must use a persistent, atomic shared quota store.
const state = {
  day: '',
  total: 0,
  users: new Map(),
  minute: new Map(),
  active: 0,
  alerts: new Set(),
};

function readBoundedInt(name, fallback, min, max) {
  const raw = Number(process.env[name]);
  return Number.isSafeInteger(raw) && raw >= min && raw <= max ? raw : fallback;
}

function limits() {
  return {
    globalDaily: readBoundedInt('AI_GLOBAL_DAILY_CALLS', 100, 1, 200),
    userDaily: readBoundedInt('AI_USER_DAILY_CALLS', 10, 1, 20),
    userMinute: readBoundedInt('AI_USER_MINUTE_CALLS', 3, 1, 5),
    concurrency: readBoundedInt('AI_CONCURRENT_CALLS', 2, 1, 3),
  };
}

function aiEnabled() {
  // Not enough to have an API key: the operator must deliberately opt in.
  return process.env.CIGNALCARE_AI_MODE === 'verified-free' &&
    Boolean(String(process.env.GEMINI_API_KEY || '').trim());
}

function manilaDay(now) {
  return new Date(now + 8 * 3600000).toISOString().slice(0, 10);
}

function warnThresholds(day, total, limit) {
  for (const percent of [50, 80, 100]) {
    if (total < Math.ceil(limit * percent / 100)) continue;
    const key = `${day}:${percent}`;
    if (state.alerts.has(key)) continue;
    state.alerts.add(key);
    const details = { day, thresholdPercent: percent, acceptedRequests: total, dailyLimit: limit };
    console.warn('CIGNALCARE_AI_USAGE_ALERT', JSON.stringify(details));
    notifyOperational('AI_USAGE_THRESHOLD', details);
  }
}

function aiUsageGuard(req, res, next) {
  req.aiAccess = { allowed: false, reason: 'disabled' };
  if (!aiEnabled()) return next();

  const now = Date.now();
  const day = manilaDay(now);
  const policy = limits();
  if (state.day !== day) {
    state.day = day;
    state.total = 0;
    state.users.clear();
    state.minute.clear();
    state.alerts.clear();
  }

  // authRequired and requireRole('user') must run BEFORE this middleware.
  const userId = String(req.user?.id || '');
  if (!userId) return res.status(401).json({ error: 'Authentication is required.' });
  const minuteKey = `${userId}:${Math.floor(now / 60000)}`;
  if (state.minute.size > 1000) {
    for (const key of state.minute.keys()) if (!key.endsWith(`:${Math.floor(now / 60000)}`)) state.minute.delete(key);
  }
  const userDay = state.users.get(userId) || 0;
  const userMinute = state.minute.get(minuteKey) || 0;

  if (state.total >= policy.globalDaily || userDay >= policy.userDaily || userMinute >= policy.userMinute || state.active >= policy.concurrency) {
    req.aiAccess = { allowed: false, reason: 'quota' };
    res.setHeader('Retry-After', '60');
    return next(); // Support-draft will gracefully use its deterministic fallback.
  }

  // Reserve BEFORE external API call. Failures still consume a request slot,
  // discouraging user-triggered retries and preventing concurrent oversubscription.
  const reserveLocally = () => {
    // Re-check after asynchronous shared reservation, because other requests
    // may have arrived while the provider responded. Conservative rejections
    // may consume a shared slot, which is safer than overspending.
    if (state.total >= policy.globalDaily || (state.users.get(userId) || 0) >= policy.userDaily ||
        (state.minute.get(minuteKey) || 0) >= policy.userMinute || state.active >= policy.concurrency) {
      req.aiAccess = { allowed: false, reason: 'quota' };
      res.setHeader('Retry-After', '60');
      return next();
    }
    state.total += 1;
    state.users.set(userId, (state.users.get(userId) || 0) + 1);
    state.minute.set(minuteKey, (state.minute.get(minuteKey) || 0) + 1);
    state.active += 1;
    warnThresholds(day, state.total, policy.globalDaily);
    let released = false;
    const release = () => { if (!released) { released = true; state.active = Math.max(0, state.active - 1); } };
    res.once('finish', release);
    res.once('close', release);
    req.aiAccess = { allowed: true, reason: 'verified-free' };
    return next();
  };

  // Cloud AI must fail closed if shared atomic quota configuration is absent.
  // Local development maintains its existing process-local test behavior.
  if (!shared.configured()) {
    if (String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
      req.aiAccess = { allowed: false, reason: 'shared-quota-required' };
      return next();
    }
    return reserveLocally();
  }
  const ttl = shared.secondsToManilaMidnight(now);
  const quotas = [
    { key: shared.hashedKey('ai:global:' + day, 'all'), max: policy.globalDaily, ttlSeconds: ttl },
    { key: shared.hashedKey('ai:user:' + day, userId), max: policy.userDaily, ttlSeconds: ttl },
    { key: shared.hashedKey('ai:minute:' + Math.floor(now / 60000), userId), max: policy.userMinute, ttlSeconds: 70 },
  ];
  shared.reserveSharedQuota(quotas).then((allowed) => {
    if (!allowed) {
      req.aiAccess = { allowed: false, reason: 'quota' };
      res.setHeader('Retry-After', '60');
      return next();
    }
    return reserveLocally();
  }).catch(() => {
    req.aiAccess = { allowed: false, reason: 'shared-quota-unavailable' };
    notifyOperational('SHARED_QUOTA_UNAVAILABLE', { scope: 'ai' });
    return next(); // Built-in deterministic chatbot fallback remains available.
  });
  return undefined;
}

// Used by regression tests. No administrative API endpoint is exposed.
function resetForTests() {
  state.day = ''; state.total = 0; state.users.clear(); state.minute.clear(); state.alerts.clear(); state.active = 0;
}

module.exports = { aiUsageGuard, aiEnabled, limits, resetForTests };
