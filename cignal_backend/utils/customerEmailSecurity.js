const crypto = require('crypto');
const { getJwtSecret } = require('./authConfig');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail(value) {
  return EMAIL_RE.test(normalizeEmail(value));
}

function generateEmailOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function otpSecret() {
  return String(process.env.EMAIL_OTP_SECRET || getJwtSecret());
}

function hashEmailOtp({ userId, email, purpose, code }) {
  return crypto
    .createHmac('sha256', otpSecret())
    .update(`${Number(userId)}|${normalizeEmail(email)}|${String(purpose)}|${String(code).trim()}`)
    .digest('hex');
}

function safeHashEquals(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function otpExpiry(from = Date.now()) {
  return new Date(Number(from) + OTP_TTL_MINUTES * 60 * 1000);
}

function secondsSince(value) {
  if (!value) return Number.POSITIVE_INFINITY;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - time) / 1000);
}

function maskEmail(value) {
  const email = normalizeEmail(value);
  const [local, domain] = email.split('@');
  if (!local || !domain) return '';
  const shown = local.length <= 2 ? `${local[0] || '*'}*` : `${local.slice(0, 2)}${'*'.repeat(Math.min(6, local.length - 2))}`;
  return `${shown}@${domain}`;
}

module.exports = {
  OTP_TTL_MINUTES,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  normalizeEmail,
  isValidEmail,
  generateEmailOtp,
  hashEmailOtp,
  safeHashEquals,
  otpExpiry,
  secondsSince,
  maskEmail,
};
