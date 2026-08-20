const crypto = require('crypto');
const { getJwtSecret, isProduction } = require('./authConfig');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ADMIN_USERNAME_RE = /^[a-zA-Z0-9._-]{3,40}$/;

function normalizeAdminUsername(value) {
  return String(value || '').trim().toLowerCase();
}

function validateAdminUsername(value) {
  const username = normalizeAdminUsername(value);
  if (!ADMIN_USERNAME_RE.test(username)) {
    return 'Admin username must be 3–40 characters using letters, numbers, dot, underscore, or hyphen.';
  }
  return '';
}

function validateAdminPassword(password) {
  const value = String(password || '');
  if (value.length < 12) return 'Admin password must be at least 12 characters.';
  if (!/[A-Z]/.test(value)) return 'Admin password must include an uppercase letter.';
  if (!/[a-z]/.test(value)) return 'Admin password must include a lowercase letter.';
  if (!/\d/.test(value)) return 'Admin password must include a number.';
  if (!/[^A-Za-z0-9]/.test(value)) return 'Admin password must include a special character.';
  return '';
}

function getAdminSecurityKey() {
  const configured = String(process.env.ADMIN_SECURITY_KEY || '').trim();
  if (configured) return crypto.createHash('sha256').update(configured).digest();

  if (isProduction() && !getAdminSecurityKey.warned) {
    console.warn('ADMIN SECURITY WARNING: set ADMIN_SECURITY_KEY in production to isolate encrypted 2FA secrets from JWT_SECRET.');
    getAdminSecurityKey.warned = true;
  }

  return crypto.createHash('sha256').update(getJwtSecret()).digest();
}

function base32Encode(buffer) {
  let bits = '';
  for (const byte of buffer) bits += byte.toString(2).padStart(8, '0');
  let output = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    output += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  return output;
}

function base32Decode(value) {
  const clean = String(value || '').toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index < 0) throw new Error('Invalid Base32 value.');
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function generateTotpSecret() {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret, counter) {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const code = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, '0');
}

function verifyTotp(code, secret, window = 1, now = Date.now()) {
  const candidate = String(code || '').replace(/\s/g, '');
  if (!/^\d{6}$/.test(candidate)) return false;
  const counter = Math.floor(now / 1000 / 30);
  for (let offset = -window; offset <= window; offset += 1) {
    const expected = hotp(secret, counter + offset);
    const a = Buffer.from(candidate);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }
  return false;
}

function buildOtpAuthUri(username, secret) {
  const issuer = 'CignalCare+';
  const label = `${issuer}:${normalizeAdminUsername(username) || 'admin'}`;
  return `otpauth://totp/${encodeURIComponent(label)}?secret=${encodeURIComponent(secret)}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}

function encryptTotpSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getAdminSecurityKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(secret), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

function decryptTotpSecret(payload) {
  const [version, ivPart, tagPart, encryptedPart] = String(payload || '').split('.');
  if (version !== 'v1' || !ivPart || !tagPart || !encryptedPart) throw new Error('Invalid encrypted TOTP secret.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getAdminSecurityKey(), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function generateRecoveryCodes(count = 10) {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(9).toString('base64url').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
    return raw.match(/.{1,4}/g).join('-');
  });
}

function hashRecoveryCode(code) {
  // Recovery codes are high-entropy random secrets. A one-way SHA-256 hash
  // keeps the database from storing plaintext codes while allowing recovery
  // even if the separate TOTP encryption key is rotated or lost.
  return crypto
    .createHash('sha256')
    .update(String(code || '').trim().toUpperCase())
    .digest('hex');
}

function safeRecoveryEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email) return null;
  if (email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid recovery email address.');
  }
  return email;
}

module.exports = {
  normalizeAdminUsername,
  validateAdminUsername,
  validateAdminPassword,
  generateTotpSecret,
  verifyTotp,
  buildOtpAuthUri,
  encryptTotpSecret,
  decryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  safeRecoveryEmail,
};
