const crypto = require('crypto');

const ACCOUNT_NUMBER_RE = /^\d{1,9}$/;
const CCA_NUMBER_RE = /^\d{1,11}$/;

function normalizeText(value) {
  return String(value ?? '').trim();
}

function validateSubscriberIdentifiers(accountNumber, ccaNumber) {
  const account = normalizeText(accountNumber);
  const cca = normalizeText(ccaNumber);
  const errors = [];

  if (!ACCOUNT_NUMBER_RE.test(account)) {
    errors.push('Account Number must contain digits only and be at most 9 digits.');
  }
  if (!CCA_NUMBER_RE.test(cca)) {
    errors.push('CCA Number must contain digits only and be at most 11 digits.');
  }

  return { accountNumber: account, ccaNumber: cca, errors };
}

function generateTemporaryPassword(length = 10) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const pick = (chars) => chars[crypto.randomInt(0, chars.length)];

  const chars = [pick(upper), pick(lower), pick(digits)];
  while (chars.length < length) chars.push(pick(all));

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

function validateNewPassword(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.';
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.';
  if (!/\d/.test(value)) return 'Password must include a number.';
  return '';
}

module.exports = {
  ACCOUNT_NUMBER_RE,
  CCA_NUMBER_RE,
  normalizeText,
  validateSubscriberIdentifiers,
  generateTemporaryPassword,
  validateNewPassword,
};
