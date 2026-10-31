'use strict';
// Pure checks: no provider calls, no credential output, no file or DB mutations.
const PRESENT = v => Boolean(String(v || '').trim());
const YES = v => String(v || '').trim().toLowerCase() === 'true';
const result = (status, detail) => ({ status, detail });

function validateUpstash(env) {
  const raw = String(env.UPSTASH_REDIS_REST_URL || '').trim();
  const token = String(env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!raw && !token) return result('NOT_CONFIGURED', 'Shared atomic quotas are not configured.');
  if (!raw || !token) return result('INVALID', 'Shared quota URL/token pair is incomplete.');
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || !/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.upstash\.io$/i.test(u.hostname) ||
        u.username || u.password || u.port || !['', '/'].includes(u.pathname) || u.search || u.hash) {
      return result('INVALID', 'Redis endpoint is not an allowed Upstash REST host.');
    }
    return result('CONFIGURED_NOT_PROBED', 'Redis credentials are present and endpoint shape is allowed; live quotas not proven.');
  } catch { return result('INVALID', 'Invalid shared quota endpoint.'); }
}

function validateAlert(env) {
  const raw = String(env.CIGNALCARE_ALERT_WEBHOOK_URL || '').trim();
  const host = String(env.CIGNALCARE_ALERT_WEBHOOK_HOST || '').trim().toLowerCase();
  if (!raw && !host) return result('NOT_CONFIGURED', 'External alert delivery is off; server logs still contain events.');
  if (!raw || !host) return result('INVALID', 'Both alert URL and exact allowed host are required.');
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.hostname.toLowerCase() !== host || u.username || u.password || u.port) {
      return result('INVALID', 'Alert URL must be HTTPS and match its allowlisted host.');
    }
    return result('CONFIGURED_NOT_PROBED', 'Alert URL/host are configured; delivery has not been proven.');
  } catch { return result('INVALID', 'Invalid external alert endpoint.'); }
}

function validateOrigins(env) {
  const values = [env.CORS_ORIGIN, env.FRONTEND_URL].filter(PRESENT).flatMap(v => String(v).split(','))
    .map(v => v.trim()).filter(Boolean);
  if (!values.length) return result('NOT_CONFIGURED', 'No explicit frontend CORS origins set.');
  const valid = values.every(v => {
    try {
      const u = new URL(v);
      return (u.protocol === 'https:' || (String(env.NODE_ENV).toLowerCase() !== 'production' && u.protocol === 'http:')) &&
        u.origin === v.replace(/\/$/, '') && !u.username && !u.password && !v.includes('*');
    } catch { return false; }
  });
  return valid ? result('CONFIGURED_NOT_PROBED', `Exactly ${new Set(values).size} configured origin(s); deployed browser behavior not probed.`)
    : result('INVALID', 'Origin settings contain an invalid, insecure, or wildcard URL.');
}

function evaluate(env) {
  const production = String(env.NODE_ENV || '').trim().toLowerCase() === 'production';
  const driver = String(env.DB_DRIVER || (PRESENT(env.DATABASE_URL) ? 'postgres' : 'mysql')).toLowerCase();
  const dbReady = driver === 'postgres' ? PRESENT(env.DATABASE_URL) :
    ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].every(k => PRESENT(env[k]));
  const cloudReady = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'].every(k => PRESENT(env[k]));
  const paymentReady = ['PAYMONGO_SECRET_KEY', 'PAYMONGO_WEBHOOK_SECRET'].every(k => PRESENT(env[k]));
  const payMode = !PRESENT(env.PAYMONGO_SECRET_KEY) ? 'not_configured' :
    String(env.PAYMONGO_SECRET_KEY).startsWith('sk_test_') ? 'test' :
    String(env.PAYMONGO_SECRET_KEY).startsWith('sk_live_') ? 'live' : 'unknown';
  const shared = validateUpstash(env), alert = validateAlert(env), origins = validateOrigins(env);
  const checks = {
    runtime: result(production ? 'PRODUCTION_ENV' : 'NON_PRODUCTION_ENV', production ? 'NODE_ENV is production.' : 'This report does not describe a deployed production runtime.'),
    database: result(dbReady ? 'CONFIGURED_NOT_PROBED' : 'NOT_CONFIGURED', dbReady ? `Database connection variables present (driver: ${driver}); no network call in default mode.` : `Database connection variables incomplete (driver: ${driver}).`),
    cloudinary: result(cloudReady ? 'CONFIGURED_NOT_PROBED' : 'NOT_CONFIGURED', cloudReady ? 'Cloudinary credentials present; authentication, private PDF delivery and security setting not verified.' : 'Cloudinary credentials incomplete.'),
    pdf_delivery: result(YES(env.CLOUDINARY_PDF_DELIVERY_CONFIRMED) ? 'OPERATOR_ATTESTED_NOT_PROBED' : 'NOT_CONFIRMED', YES(env.CLOUDINARY_PDF_DELIVERY_CONFIRMED) ? 'Flag is set, but the script cannot prove actual PDF download succeeds.' : 'PDF delivery must be verified in Cloudinary before enabling CLOUDINARY_PDF_DELIVERY_CONFIRMED=true.'),
    shared_quotas: shared,
    operational_alerts: alert,
    cors: origins,
    authentication: result(PRESENT(env.JWT_SECRET) ? 'CONFIGURED_NOT_PROBED' : 'NOT_CONFIGURED', PRESENT(env.JWT_SECRET) ? 'JWT secret present; strength and rotation not evaluated.' : 'Production requires a unique strong JWT secret.'),
    payment: result(paymentReady && (!production || payMode === 'live') && !YES(env.PAYMONGO_ALLOW_UNSIGNED_WEBHOOKS) ? 'CONFIGURED_NOT_PROBED' : 'REVIEW_REQUIRED', `PayMongo secret and webhook secret ${paymentReady ? 'present' : 'incomplete'}; key mode ${payMode}; unsigned webhook override ${YES(env.PAYMONGO_ALLOW_UNSIGNED_WEBHOOKS) ? 'enabled' : 'not enabled'}. No payment provider request performed.`),
    ai: result(String(env.CIGNALCARE_AI_MODE) === 'verified-free' ? 'OPERATOR_REVIEW_REQUIRED' : 'SAFELY_DISABLED', String(env.CIGNALCARE_AI_MODE) === 'verified-free' ? 'AI explicitly opted in; verify provider free-tier/billing and shared quotas before production.' : 'Gemini opt-in is off; deterministic fallback remains.'),
  };
  const blockers = [];
  if (production) {
    for (const key of ['database','cloudinary','shared_quotas','cors','authentication']) {
      if (['NOT_CONFIGURED', 'INVALID'].includes(checks[key].status)) blockers.push(key);
    }
    if (checks.payment.status === 'REVIEW_REQUIRED') blockers.push('payment');
    if (checks.pdf_delivery.status === 'NOT_CONFIRMED') blockers.push('pdf_delivery');
    if (checks.operational_alerts.status !== 'CONFIGURED_NOT_PROBED') blockers.push('operational_alerts');
    if (driver !== 'postgres') blockers.push('production_database_target_review');
  }
  return { environment: production ? 'production' : 'local_or_staging', database_driver: driver, checks, blockers };
}

function classifyLegacyTotals(row = {}) {
  const fields = ['total', 'protected', 'legacy_cloudinary', 'other_remote', 'local_or_unknown'];
  const values = {};
  for (const key of fields) {
    const value = Number(row[key] ?? 0);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error('Attachment inventory returned an invalid count.');
    values[key] = value;
  }
  return values;
}
module.exports = { evaluate, validateUpstash, validateAlert, validateOrigins, classifyLegacyTotals };
