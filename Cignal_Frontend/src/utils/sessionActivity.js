// Pure functions shared by the inactivity guard and its regression tests.
// Automatic API polling never writes this state; only trusted human input does.
export const SESSION_ACTIVITY_KEY = 'cignalcare:last-human-activity:v1';
export const SESSION_WARNING_MS = 3 * 60 * 1000;
export const SESSION_TIMEOUT_MS = 5 * 60 * 1000;

function hashSessionToken(token) {
  // Fingerprint for differentiating logins; never save any part of the JWT here.
  // This is NOT a cryptographic verification or a replacement for server auth.
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function getSessionIdentity(token, user) {
  if (!token || !user?.id || !['user', 'admin'].includes(user?.role)) return null;
  return `${user.role}:${user.id}:${hashSessionToken(String(token))}`;
}

export function readLastHumanActivity(storage, identity) {
  if (!identity) return null;
  try {
    const record = JSON.parse(storage.getItem(SESSION_ACTIVITY_KEY) || 'null');
    if (record?.identity !== identity) return null;
    const at = Number(record?.at);
    // Sanity check protects against invalid or future-dated stored values.
    if (!Number.isSafeInteger(at) || at <= 0 || at > Date.now() + 2000) return null;
    return at;
  } catch {
    return null;
  }
}

export function saveLastHumanActivity(storage, identity, at = Date.now()) {
  if (!identity) return;
  storage.setItem(SESSION_ACTIVITY_KEY, JSON.stringify({ identity, at }));
}

export function getInactivityState(lastActivity, now = Date.now()) {
  const elapsed = Math.max(0, now - (Number(lastActivity) || now));
  return {
    warning: elapsed >= SESSION_WARNING_MS,
    expired: elapsed >= SESSION_TIMEOUT_MS,
    remainingMs: Math.max(0, SESSION_TIMEOUT_MS - elapsed),
  };
}
