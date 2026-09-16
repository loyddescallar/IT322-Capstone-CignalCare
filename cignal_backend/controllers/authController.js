const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret, getJwtExpiry } = require('../utils/authConfig');
const { getCurrentTermsVersion } = require('../utils/termsConfig');
const {
  findForAdminLogin,
  findByAccountNumber,
  findByCcaNumber,
  getPublicPrepaidAccount,
  acceptTerms,
  findById,
  findByAccountIdOrCca,
  completeCustomerPasswordChange,
  recoverCustomerAccount,
  setCustomerEmailVerificationChallenge,
  rollbackCustomerEmailVerificationChallenge,
  incrementEmailVerificationAttempts,
  markCustomerEmailVerified,
  setCustomerPasswordResetChallenge,
  rollbackCustomerPasswordResetChallenge,
  incrementPasswordResetAttempts,
  updateVerifiedPhone,
  updateVerifiedEmail,
} = require('../models/userModel');
const {
  hasConfiguredAdminSecurity,
  findSecurityByUsername,
  findSecurityByUserId,
  recordFailedAttempt,
  clearFailedAttempts,
  incrementSessionVersion,
  replaceRecoveryCodes,
  findUnusedRecoveryCode,
  writeAudit,
  getRecentAuditLogs,
  completeBootstrap,
  completeRecovery,
  changePasswordAndRevokeSessions,
  updateAdminEmail,
} = require('../models/adminSecurityModel');
const {
  ACCOUNT_NUMBER_RE,
  validateNewPassword,
  generateRecoveryCode: generateCustomerRecoveryCode,
  hashRecoveryCode: hashCustomerRecoveryCode,
} = require('../utils/subscriberAccount');
const {
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
} = require('../utils/customerEmailSecurity');
const {
  isEmailDeliveryConfigured,
  sendOtpEmail,
} = require('../services/emailService');
const {
  normalizePhilippinePhone,
  maskPhone,
  isSmsDeliveryConfigured,
  sendOtpSms,
} = require('../services/smsService');
const {
  generateRecoveryOtp,
  hashRecoveryOtp,
  safeHashEquals: safeRecoveryHashEquals,
  challengeExpiry,
  getChallenge,
  saveChallenge,
  rollbackChallenge,
  incrementChallengeAttempts,
  clearChallenge,
} = require('../models/accountRecoveryModel');
const {
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
} = require('../utils/adminSecurity');

const pendingAdminSetups = new Map();
const pendingAdminRecoveries = new Map();
const PENDING_TTL_MS = 10 * 60 * 1000;
const CURRENT_TERMS_VERSION = getCurrentTermsVersion();
const CCA_RECOVERY_PURPOSE = 'account_number_recovery';
const CUSTOMER_PHONE_VERIFY_PURPOSE = 'verify_phone';
const CUSTOMER_SMS_PASSWORD_PURPOSE = 'password_recovery';
const ADMIN_LOGIN_OTP_PURPOSE = 'admin_login';
const ADMIN_EMAIL_VERIFY_PURPOSE = 'admin_email_verification';
const ADMIN_PHONE_VERIFY_PURPOSE = 'admin_phone_verification';

function maskName(value) {
  return String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.length <= 1 ? '*' : `${part[0]}${'*'.repeat(Math.min(8, part.length - 1))}`)
    .join(' ');
}

function maskAccountNumber(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const visible = Math.min(3, raw.length);
  return `${'*'.repeat(Math.max(0, raw.length - visible))}${raw.slice(-visible)}`;
}

function passwordFingerprint(passwordHash) {
  return crypto
    .createHash('sha256')
    .update(String(passwordHash || ''))
    .digest('hex')
    .slice(0, 24);
}

function signToken(user, extra = {}) {
  return jwt.sign(
    {
      id: user.id,
      accountName: user.accountName,
      accountNumber: user.accountNumber,
      ccaNumber: user.ccaNumber,
      role: user.role,
      location: user.location,
      status: user.status,
      ...extra,
    },
    getJwtSecret(),
    { expiresIn: getJwtExpiry() }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    accountName: user.accountName,
    accountNumber: user.accountNumber,
    ccaNumber: user.ccaNumber,
    address: user.address,
    phone: user.phone,
    email: user.email || null,
    emailVerified: Boolean(user.email_verified_at),
    recoveryPhoneVerified: Boolean(user.recovery_phone_verified_at),
    termsAccepted: user.role !== 'user' || String(user.terms_version || '') === CURRENT_TERMS_VERSION,
    termsVersion: user.terms_version || null,
    termsAcceptedAt: user.terms_accepted_at || null,
    role: user.role,
    location: user.location,
    status: user.status,
  };
}

function requestMeta(req) {
  return {
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.headers['user-agent'] || null,
  };
}

function isLocked(security) {
  return security?.locked_until && new Date(security.locked_until).getTime() > Date.now();
}

function cleanupPending(map) {
  const now = Date.now();
  for (const [key, value] of map.entries()) {
    if (!value || value.expiresAt <= now) map.delete(key);
  }
}

async function login(req, res) {
  try {
    const accountNumber = String(req.body.accountNumber || '').trim();
    const password = String(req.body.password || '');
    if (!ACCOUNT_NUMBER_RE.test(accountNumber)) return res.status(400).json({ error: 'Enter a valid Account Number of up to 9 digits.' });
    if (!password) return res.status(400).json({ error: 'Password is required.' });

    const user = await findByAccountNumber(accountNumber);
    if (!user) return res.status(401).json({ error: 'Invalid Account Number or password.' });
    if (!user.password_hash) {
      return res.status(403).json({ error: 'Login credentials have not been issued for this subscriber. Please contact Descallar Satellite Services.' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) return res.status(401).json({ error: 'Invalid Account Number or password.' });

    if (Boolean(user.must_change_password)) {
      const expiresAt = user.temporary_password_expires_at
        ? new Date(user.temporary_password_expires_at).getTime()
        : 0;

      if (!expiresAt || expiresAt <= Date.now()) {
        return res.status(403).json({
          error: 'This temporary password has expired. Use your recovery code to reset your password, or contact Descallar Satellite Services if you no longer have the recovery code.',
          temporaryPasswordExpired: true,
        });
      }

      const passwordChangeToken = jwt.sign(
        {
          id: user.id,
          role: 'user',
          purpose: 'password_change',
          credentialFingerprint: passwordFingerprint(user.password_hash),
        },
        getJwtSecret(),
        { expiresIn: '20m' }
      );
      return res.json({ mustChangePassword: true, passwordChangeToken, user: publicUser(user) });
    }

    return res.json({
      token: signToken(user, { sessionVersion: Number(user.auth_session_version || 1) }),
      user: publicUser(user),
    });
  } catch (err) {
    console.error('LOGIN ERROR', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
}

async function register(_req, res) {
  return res.status(410).json({
    error: 'Public registration is disabled. CignalCare+ accounts are issued to verified Descallar Satellite Services subscribers.',
  });
}

async function changePassword(req, res) {
  try {
    const header = String(req.headers.authorization || '');
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Password-change session is required.' });
    const payload = jwt.verify(header.slice(7).trim(), getJwtSecret());
    if (payload.purpose !== 'password_change' || payload.role !== 'user') {
      return res.status(403).json({ error: 'Invalid password-change session.' });
    }

    const password = String(req.body.password || '');
    const error = validateNewPassword(password);
    if (error) return res.status(400).json({ error });

    const user = await findById(payload.id);
    if (!user || user.role !== 'user' || String(user.status || '').toLowerCase() !== 'active') {
      return res.status(401).json({ error: 'Account is unavailable.' });
    }

    if (!Boolean(user.must_change_password)) {
      return res.status(409).json({
        error: 'This temporary password-change session has already been used. Please log in normally.',
      });
    }

    if (
      !payload.credentialFingerprint ||
      payload.credentialFingerprint !== passwordFingerprint(user.password_hash)
    ) {
      return res.status(401).json({
        error: 'Temporary credentials have changed. Please log in again using the latest credentials.',
      });
    }

    if (await bcrypt.compare(password, user.password_hash)) {
      return res.status(400).json({ error: 'Your new password must be different from the temporary password.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const sessionVersion = await completeCustomerPasswordChange(user.id, hash);
    const updated = {
      ...user,
      password_hash: hash,
      must_change_password: false,
      temporary_password_expires_at: null,
      auth_session_version: sessionVersion,
    };
    return res.json({
      message: 'Password updated successfully.',
      token: signToken(updated, { sessionVersion }),
      user: publicUser(updated),
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Password-change session expired. Please log in again.' });
    }
    console.error('CHANGE PASSWORD ERROR', err);
    return res.status(500).json({ error: 'Unable to change password.' });
  }
}


async function recoverCustomerPassword(req, res) {
  try {
    const accountNumber = String(req.body.accountNumber || '').trim();
    const recoveryCode = String(req.body.recoveryCode || '').trim();
    const password = String(req.body.password || '');

    if (!ACCOUNT_NUMBER_RE.test(accountNumber)) {
      return res.status(400).json({ error: 'Enter a valid Account Number of up to 9 digits.' });
    }

    const passwordError = validateNewPassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });
    if (!recoveryCode) return res.status(400).json({ error: 'Recovery code is required.' });

    const user = await findByAccountNumber(accountNumber);
    const submittedHash = hashCustomerRecoveryCode(recoveryCode);
    const storedHash = String(user?.recovery_code_hash || '');

    let recoveryMatches = false;
    if (storedHash.length === submittedHash.length && storedHash.length > 0) {
      recoveryMatches = crypto.timingSafeEqual(
        Buffer.from(storedHash, 'utf8'),
        Buffer.from(submittedHash, 'utf8')
      );
    }

    if (!user || !recoveryMatches) {
      return res.status(401).json({
        error: 'Invalid Account Number or recovery code. If you no longer have your recovery code, contact Descallar Satellite Services.',
      });
    }

    if (user.password_hash && await bcrypt.compare(password, user.password_hash)) {
      return res.status(400).json({
        error: 'Your new password must be different from your current or temporary password.',
      });
    }

    const newRecoveryCode = generateCustomerRecoveryCode();
    const passwordHash = await bcrypt.hash(password, 10);
    const sessionVersion = await recoverCustomerAccount(
      user.id,
      passwordHash,
      hashCustomerRecoveryCode(newRecoveryCode)
    );

    const updated = {
      ...user,
      password_hash: passwordHash,
      must_change_password: false,
      temporary_password_expires_at: null,
      auth_session_version: sessionVersion,
    };

    return res.json({
      message: 'Password reset successfully. All older customer sessions have been revoked.',
      token: signToken(updated, { sessionVersion }),
      user: publicUser(updated),
      recoveryCode: newRecoveryCode,
    });
  } catch (error) {
    console.error('CUSTOMER RECOVERY ERROR:', error);
    return res.status(500).json({ error: 'Unable to recover the customer account.' });
  }
}


async function customerSecurityInfo(req, res) {
  try {
    const user = await findById(req.user.id);
    if (!user || user.role !== 'user') return res.status(404).json({ error: 'Customer account not found.' });

    return res.json({
      accountNumber: user.accountNumber,
      email: user.email || '',
      emailVerified: Boolean(user.email_verified_at),
      emailVerifiedAt: user.email_verified_at || null,
      emailDeliveryConfigured: isEmailDeliveryConfigured(),
      phone: user.phone || '',
      recoveryPhone: user.recovery_phone || '',
      phoneVerified: Boolean(user.recovery_phone_verified_at),
      phoneVerifiedAt: user.recovery_phone_verified_at || null,
      smsDeliveryConfigured: isSmsDeliveryConfigured(),
    });
  } catch (error) {
    console.error('CUSTOMER SECURITY INFO ERROR:', error);
    return res.status(500).json({ error: 'Unable to load account security information.' });
  }
}

async function requestCustomerEmailVerification(req, res) {
  try {
    if (!isEmailDeliveryConfigured()) {
      return res.status(503).json({
        error: 'Email delivery is not configured yet. You can still use your recovery code for account recovery.',
      });
    }

    const user = await findById(req.user.id);
    if (!user || user.role !== 'user') return res.status(404).json({ error: 'Customer account not found.' });

    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });

    const sameEmail = normalizeEmail(user.email) === email;
    if (sameEmail && user.email_verified_at) {
      return res.status(409).json({ error: 'This email address is already verified.' });
    }

    if (secondsSince(user.email_verification_last_sent_at) < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = OTP_RESEND_COOLDOWN_SECONDS - secondsSince(user.email_verification_last_sent_at);
      return res.status(429).json({ error: `Please wait ${Math.max(1, wait)} seconds before requesting another code.` });
    }

    const code = generateEmailOtp();
    const expiresAt = otpExpiry();
    const codeHash = hashEmailOtp({
      userId: user.id,
      email,
      purpose: 'verify_email',
      code,
    });

    const previousEmailSecurity = {
      email: user.email || null,
      emailVerifiedAt: user.email_verified_at || null,
      emailVerificationCodeHash: user.email_verification_code_hash || null,
      emailVerificationExpiresAt: user.email_verification_expires_at || null,
      emailVerificationAttempts: Number(user.email_verification_attempts || 0),
      emailVerificationLastSentAt: user.email_verification_last_sent_at || null,
      passwordResetCodeHash: user.password_reset_code_hash || null,
      passwordResetExpiresAt: user.password_reset_expires_at || null,
      passwordResetAttempts: Number(user.password_reset_attempts || 0),
      passwordResetLastSentAt: user.password_reset_last_sent_at || null,
    };

    // Save first so a successfully delivered code is already verifiable.
    await setCustomerEmailVerificationChallenge(user.id, email, codeHash, expiresAt);

    try {
      await sendOtpEmail({ to: email, code, purpose: 'verify_email' });
    } catch (deliveryError) {
      try {
        // Restore only if this request's OTP is still the active challenge.
        await rollbackCustomerEmailVerificationChallenge(
          user.id,
          codeHash,
          previousEmailSecurity
        );
      } catch (rollbackError) {
        console.error('CUSTOMER EMAIL VERIFICATION ROLLBACK ERROR:', rollbackError);
      }
      throw deliveryError;
    }

    return res.json({
      message: `Verification code sent to ${maskEmail(email)}. It expires in 10 minutes.`,
      maskedEmail: maskEmail(email),
    });
  } catch (error) {
    console.error('REQUEST CUSTOMER EMAIL VERIFICATION ERROR:', error);
    return res.status(500).json({ error: 'Unable to send the verification code right now.' });
  }
}

async function confirmCustomerEmailVerification(req, res) {
  try {
    const code = String(req.body.code || '').trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit verification code.' });

    const user = await findById(req.user.id);
    if (!user || user.role !== 'user') return res.status(404).json({ error: 'Customer account not found.' });
    if (!user.email || !user.email_verification_code_hash || !user.email_verification_expires_at) {
      return res.status(400).json({ error: 'Request a new verification code first.' });
    }
    if (Number(user.email_verification_attempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new verification code.' });
    }
    if (new Date(user.email_verification_expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Verification code expired. Request a new code.' });
    }

    const submittedHash = hashEmailOtp({
      userId: user.id,
      email: user.email,
      purpose: 'verify_email',
      code,
    });

    if (!safeHashEquals(submittedHash, user.email_verification_code_hash)) {
      await incrementEmailVerificationAttempts(user.id);
      return res.status(400).json({ error: 'Incorrect verification code.' });
    }

    const updated = await markCustomerEmailVerified(user.id);
    return res.json({
      message: 'Email verified successfully. It can now be used for password recovery.',
      user: publicUser(updated),
    });
  } catch (error) {
    console.error('CONFIRM CUSTOMER EMAIL VERIFICATION ERROR:', error);
    return res.status(500).json({ error: 'Unable to verify the email address.' });
  }
}


async function requestCustomerPhoneVerification(req, res) {
  try {
    if (!isSmsDeliveryConfigured()) {
      return res.status(503).json({ error: 'SMS delivery is not configured yet. Email and recovery-code options remain available.' });
    }
    const user = await findById(req.user.id);
    if (!user || user.role !== 'user') return res.status(404).json({ error: 'Customer account not found.' });

    const phone = normalizePhilippinePhone(req.body.phone);
    if (!phone) return res.status(400).json({ error: 'Enter a valid Philippine mobile number.' });

    const existing = await getChallenge(user.id, CUSTOMER_PHONE_VERIFY_PURPOSE, 'sms');
    if (existing?.last_sent_at && secondsSince(existing.last_sent_at) < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = OTP_RESEND_COOLDOWN_SECONDS - secondsSince(existing.last_sent_at);
      return res.status(429).json({ error: `Please wait ${Math.max(1, wait)} seconds before requesting another code.` });
    }

    const code = generateRecoveryOtp();
    const codeHash = hashRecoveryOtp({ userId: user.id, context: phone, channel: 'sms', code });
    const expiresAt = challengeExpiry();
    await saveChallenge({
      userId: user.id,
      purpose: CUSTOMER_PHONE_VERIFY_PURPOSE,
      channel: 'sms',
      codeHash,
      expiresAt,
      targetValue: phone,
    });

    try {
      await sendOtpSms({ to: phone, code, purpose: CUSTOMER_PHONE_VERIFY_PURPOSE });
    } catch (deliveryError) {
      await rollbackChallenge({ userId: user.id, purpose: CUSTOMER_PHONE_VERIFY_PURPOSE, channel: 'sms', codeHash }).catch(() => {});
      throw deliveryError;
    }

    return res.json({ message: `Verification code sent to ${maskPhone(phone)}.` });
  } catch (error) {
    console.error('REQUEST CUSTOMER PHONE VERIFICATION ERROR:', error);
    return res.status(500).json({ error: 'Unable to send the SMS verification code right now.' });
  }
}

async function confirmCustomerPhoneVerification(req, res) {
  try {
    const code = String(req.body.code || '').trim();
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit verification code.' });

    const user = await findById(req.user.id);
    if (!user || user.role !== 'user') return res.status(404).json({ error: 'Customer account not found.' });
    const challenge = await getChallenge(user.id, CUSTOMER_PHONE_VERIFY_PURPOSE, 'sms');
    if (!challenge?.target_value || !challenge.code_hash || !challenge.expires_at) {
      return res.status(400).json({ error: 'Request a new SMS verification code first.' });
    }
    if (Number(challenge.attempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new verification code.' });
    }
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Verification code expired. Request a new code.' });
    }

    const submittedHash = hashRecoveryOtp({ userId: user.id, context: challenge.target_value, channel: 'sms', code });
    if (!safeRecoveryHashEquals(submittedHash, challenge.code_hash)) {
      await incrementChallengeAttempts(user.id, CUSTOMER_PHONE_VERIFY_PURPOSE, 'sms');
      return res.status(400).json({ error: 'Incorrect verification code.' });
    }

    const normalized = normalizePhilippinePhone(challenge.target_value);
    const localPhone = normalized ? `0${normalized.slice(3)}` : null;
    if (!localPhone) return res.status(400).json({ error: 'The verified phone number is invalid.' });
    await updateVerifiedPhone(user.id, localPhone, 'user');
    await clearChallenge(user.id, CUSTOMER_PHONE_VERIFY_PURPOSE, 'sms');
    const updated = await findById(user.id);
    return res.json({ message: 'Mobile number verified successfully. It can now be used for SMS recovery.', user: publicUser(updated) });
  } catch (error) {
    console.error('CONFIRM CUSTOMER PHONE VERIFICATION ERROR:', error);
    return res.status(500).json({ error: 'Unable to verify the mobile number.' });
  }
}


async function customerRecoveryOptions(req, res) {
  try {
    const accountNumber = String(req.body.accountNumber || '').trim();
    if (!ACCOUNT_NUMBER_RE.test(accountNumber)) {
      return res.status(400).json({ error: 'Enter a valid Account Number of up to 9 digits.' });
    }

    const user = await findByAccountNumber(accountNumber);
    const emailVerified = Boolean(user?.email && user?.email_verified_at);
    const phoneVerified = Boolean(user?.recovery_phone && user?.recovery_phone_verified_at && normalizePhilippinePhone(user.recovery_phone));
    const emailDeliveryConfigured = isEmailDeliveryConfigured();
    const smsDeliveryConfigured = isSmsDeliveryConfigured();
    const recoveryCodeAvailable = Boolean(user?.recovery_code_hash);

    return res.json({
      emailVerified,
      emailAvailable: emailVerified && emailDeliveryConfigured,
      maskedEmail: emailVerified ? maskEmail(user.email) : null,
      phoneVerified,
      smsAvailable: phoneVerified && smsDeliveryConfigured,
      maskedPhone: phoneVerified ? maskPhone(user.recovery_phone) : null,
      recoveryCodeAvailable,
      emailDeliveryConfigured,
      smsDeliveryConfigured,
    });
  } catch (error) {
    console.error('CUSTOMER RECOVERY OPTIONS ERROR:', error);
    return res.status(500).json({ error: 'Unable to check recovery options right now.' });
  }
}

async function startCustomerEmailRecovery(req, res) {
  try {
    if (!isEmailDeliveryConfigured()) {
      return res.status(503).json({
        error: 'Email recovery is temporarily unavailable. Use your recovery code instead.',
      });
    }

    const accountNumber = String(req.body.accountNumber || '').trim();
    if (!ACCOUNT_NUMBER_RE.test(accountNumber)) {
      return res.status(400).json({ error: 'Enter a valid Account Number of up to 9 digits.' });
    }

    const genericMessage = 'If this account has a verified recovery email, a 6-digit reset code has been sent.';
    const user = await findByAccountNumber(accountNumber);

    if (!user || !user.email || !user.email_verified_at) {
      return res.status(400).json({
        error: 'Verified email recovery is not available for this account. Use your recovery code or contact Descallar Satellite Services.',
      });
    }

    if (secondsSince(user.password_reset_last_sent_at) < OTP_RESEND_COOLDOWN_SECONDS) {
      return res.json({ message: genericMessage });
    }

    const code = generateEmailOtp();
    const expiresAt = otpExpiry();
    const codeHash = hashEmailOtp({
      userId: user.id,
      email: user.email,
      purpose: 'password_reset',
      code,
    });

    const previousPasswordReset = {
      codeHash: user.password_reset_code_hash || null,
      expiresAt: user.password_reset_expires_at || null,
      attempts: Number(user.password_reset_attempts || 0),
      lastSentAt: user.password_reset_last_sent_at || null,
    };

    // Save first so a successfully delivered code is already verifiable.
    await setCustomerPasswordResetChallenge(user.id, codeHash, expiresAt);

    try {
      await sendOtpEmail({ to: user.email, code, purpose: 'password_reset' });
    } catch (deliveryError) {
      try {
        // Restore only if this request's OTP is still the active challenge.
        await rollbackCustomerPasswordResetChallenge(
          user.id,
          codeHash,
          previousPasswordReset
        );
      } catch (rollbackError) {
        console.error('CUSTOMER PASSWORD RESET ROLLBACK ERROR:', rollbackError);
      }
      throw deliveryError;
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    console.error('START CUSTOMER EMAIL RECOVERY ERROR:', error);
    return res.status(500).json({ error: 'Unable to start email recovery right now.' });
  }
}

async function completeCustomerEmailRecovery(req, res) {
  try {
    const accountNumber = String(req.body.accountNumber || '').trim();
    const code = String(req.body.code || '').trim();
    const password = String(req.body.password || '');

    if (!ACCOUNT_NUMBER_RE.test(accountNumber)) {
      return res.status(400).json({ error: 'Enter a valid Account Number of up to 9 digits.' });
    }
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit reset code.' });

    const passwordError = validateNewPassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const user = await findByAccountNumber(accountNumber);
    const invalidMessage = 'Invalid or expired reset code. Request a new code or use your recovery code instead.';

    if (!user || !user.email || !user.email_verified_at || !user.password_reset_code_hash || !user.password_reset_expires_at) {
      return res.status(400).json({ error: invalidMessage });
    }
    if (Number(user.password_reset_attempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new reset code.' });
    }
    if (new Date(user.password_reset_expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ error: invalidMessage });
    }

    const submittedHash = hashEmailOtp({
      userId: user.id,
      email: user.email,
      purpose: 'password_reset',
      code,
    });

    if (!safeHashEquals(submittedHash, user.password_reset_code_hash)) {
      await incrementPasswordResetAttempts(user.id);
      return res.status(400).json({ error: invalidMessage });
    }

    if (user.password_hash && await bcrypt.compare(password, user.password_hash)) {
      return res.status(400).json({ error: 'Your new password must be different from your current or temporary password.' });
    }

    const newRecoveryCode = generateCustomerRecoveryCode();
    const passwordHash = await bcrypt.hash(password, 10);
    const sessionVersion = await recoverCustomerAccount(
      user.id,
      passwordHash,
      hashCustomerRecoveryCode(newRecoveryCode)
    );

    const updated = await findById(user.id);
    return res.json({
      message: 'Password reset successfully. All older customer sessions have been revoked.',
      token: signToken(updated, { sessionVersion }),
      user: publicUser(updated),
      recoveryCode: newRecoveryCode,
    });
  } catch (error) {
    console.error('COMPLETE CUSTOMER EMAIL RECOVERY ERROR:', error);
    return res.status(500).json({ error: 'Unable to complete email recovery.' });
  }
}


async function startCustomerSmsRecovery(req, res) {
  try {
    if (!isSmsDeliveryConfigured()) return res.status(503).json({ error: 'SMS recovery is temporarily unavailable.' });
    const accountNumber = String(req.body.accountNumber || '').trim();
    if (!ACCOUNT_NUMBER_RE.test(accountNumber)) return res.status(400).json({ error: 'Enter a valid Account Number of up to 9 digits.' });

    const user = await findByAccountNumber(accountNumber);
    if (!user || !user.recovery_phone || !user.recovery_phone_verified_at || !normalizePhilippinePhone(user.recovery_phone)) {
      return res.status(400).json({ error: 'Verified SMS recovery is not available for this account.' });
    }

    const existing = await getChallenge(user.id, CUSTOMER_SMS_PASSWORD_PURPOSE, 'sms');
    if (existing?.last_sent_at && secondsSince(existing.last_sent_at) < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = OTP_RESEND_COOLDOWN_SECONDS - secondsSince(existing.last_sent_at);
      return res.status(429).json({ error: `Please wait ${Math.max(1, wait)} seconds before requesting another code.` });
    }

    const code = generateRecoveryOtp();
    const codeHash = hashRecoveryOtp({ userId: user.id, context: accountNumber, channel: 'sms', code });
    const expiresAt = challengeExpiry();
    await saveChallenge({ userId: user.id, purpose: CUSTOMER_SMS_PASSWORD_PURPOSE, channel: 'sms', codeHash, expiresAt, targetValue: user.recovery_phone });
    try {
      await sendOtpSms({ to: user.recovery_phone, code, purpose: 'password_reset' });
    } catch (deliveryError) {
      await rollbackChallenge({ userId: user.id, purpose: CUSTOMER_SMS_PASSWORD_PURPOSE, channel: 'sms', codeHash }).catch(() => {});
      throw deliveryError;
    }
    return res.json({ message: `Reset code sent to ${maskPhone(user.recovery_phone)}.` });
  } catch (error) {
    console.error('START CUSTOMER SMS RECOVERY ERROR:', error);
    return res.status(500).json({ error: 'Unable to start SMS recovery right now.' });
  }
}

async function completeCustomerSmsRecovery(req, res) {
  try {
    const accountNumber = String(req.body.accountNumber || '').trim();
    const code = String(req.body.code || '').trim();
    const password = String(req.body.password || '');
    if (!ACCOUNT_NUMBER_RE.test(accountNumber)) return res.status(400).json({ error: 'Enter a valid Account Number of up to 9 digits.' });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit reset code.' });
    const passwordError = validateNewPassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const user = await findByAccountNumber(accountNumber);
    if (!user?.recovery_phone_verified_at) return res.status(400).json({ error: 'Verified SMS recovery is not available for this account.' });
    const challenge = await getChallenge(user.id, CUSTOMER_SMS_PASSWORD_PURPOSE, 'sms');
    if (!challenge?.code_hash || !challenge.expires_at) return res.status(400).json({ error: 'Request a new SMS reset code first.' });
    if (Number(challenge.attempts || 0) >= OTP_MAX_ATTEMPTS) return res.status(429).json({ error: 'Too many incorrect attempts. Request a new reset code.' });
    if (new Date(challenge.expires_at).getTime() <= Date.now()) return res.status(400).json({ error: 'Reset code expired. Request a new code.' });

    const submittedHash = hashRecoveryOtp({ userId: user.id, context: accountNumber, channel: 'sms', code });
    if (!safeRecoveryHashEquals(submittedHash, challenge.code_hash)) {
      await incrementChallengeAttempts(user.id, CUSTOMER_SMS_PASSWORD_PURPOSE, 'sms');
      return res.status(400).json({ error: 'Incorrect or expired reset code.' });
    }
    if (user.password_hash && await bcrypt.compare(password, user.password_hash)) {
      return res.status(400).json({ error: 'Your new password must be different from your current or temporary password.' });
    }

    const newRecoveryCode = generateCustomerRecoveryCode();
    const passwordHash = await bcrypt.hash(password, 10);
    const sessionVersion = await recoverCustomerAccount(user.id, passwordHash, hashCustomerRecoveryCode(newRecoveryCode));
    await clearChallenge(user.id, CUSTOMER_SMS_PASSWORD_PURPOSE, 'sms');
    const updated = await findById(user.id);
    return res.json({
      message: 'Password reset successfully. All older customer sessions have been revoked.',
      token: signToken(updated, { sessionVersion }),
      user: publicUser(updated),
      recoveryCode: newRecoveryCode,
    });
  } catch (error) {
    console.error('COMPLETE CUSTOMER SMS RECOVERY ERROR:', error);
    return res.status(500).json({ error: 'Unable to complete SMS recovery.' });
  }
}


async function publicPrepaidInquiry(req, res) {
  try {
    const accountNumber = String(req.body.accountNumber || '').trim();
    if (!ACCOUNT_NUMBER_RE.test(accountNumber)) {
      return res.status(400).json({ error: 'Enter a valid Account Number of up to 9 digits.' });
    }

    const account = await getPublicPrepaidAccount(accountNumber);
    if (!account) return res.status(404).json({ error: 'No prepaid account record was found.' });

    const expiryTime = account.expiry_date ? new Date(account.expiry_date).getTime() : 0;
    const hasExpiry = Number.isFinite(expiryTime) && expiryTime > 0;
    const expired = hasExpiry && expiryTime <= Date.now();
    const status = !account.last_load_date
      ? 'Inactive'
      : expired
        ? 'Expired'
        : String(account.prepaid_status || '').toLowerCase() === 'active'
          ? 'Active'
          : 'Inactive';
    const daysRemaining = status === 'Active'
      ? Math.max(0, Math.ceil((expiryTime - Date.now()) / 86400000))
      : 0;

    return res.json({
      accountNumberMasked: maskAccountNumber(account.accountNumber),
      planName: account.plan_name || null,
      status,
      expiryDate: account.expiry_date || null,
      daysRemaining,
      lastLoadAmount: account.last_load_amount == null ? null : Number(account.last_load_amount),
      lastLoadDate: account.last_load_date || null,
    });
  } catch (error) {
    console.error('PUBLIC PREPAID INQUIRY ERROR:', error);
    return res.status(500).json({ error: 'Unable to check prepaid status right now.' });
  }
}

async function publicCcaInquiry(req, res) {
  try {
    const ccaNumber = String(req.body.ccaNumber || '').trim();
    if (!/^\d{1,11}$/.test(ccaNumber)) {
      return res.status(400).json({ error: 'Enter a valid CCA Number of up to 11 digits.' });
    }

    const user = await findByCcaNumber(ccaNumber);
    if (!user) return res.status(404).json({ error: 'No subscriber record was found for that CCA Number.' });

    const emailAvailable = Boolean(user.email && user.email_verified_at && isEmailDeliveryConfigured());
    const smsAvailable = Boolean(user.recovery_phone_verified_at && normalizePhilippinePhone(user.recovery_phone) && isSmsDeliveryConfigured());

    return res.json({
      subscriber: {
        name: maskName(user.accountName),
        accountNumberMasked: maskAccountNumber(user.accountNumber),
        location: user.location || null,
        status: user.status || 'active',
      },
      recovery: {
        emailAvailable,
        maskedEmail: user.email && user.email_verified_at ? maskEmail(user.email) : null,
        smsAvailable,
        maskedPhone: user.recovery_phone && user.recovery_phone_verified_at ? maskPhone(user.recovery_phone) : null,
        recoveryCodeAvailable: Boolean(user.recovery_code_hash),
        emailDeliveryConfigured: isEmailDeliveryConfigured(),
        smsDeliveryConfigured: isSmsDeliveryConfigured(),
      },
    });
  } catch (error) {
    console.error('PUBLIC CCA INQUIRY ERROR:', error);
    return res.status(500).json({ error: 'Unable to check the CCA record right now.' });
  }
}

async function startPublicCcaRecovery(req, res) {
  try {
    const ccaNumber = String(req.body.ccaNumber || '').trim();
    const channel = String(req.body.channel || '').trim().toLowerCase();
    if (!/^\d{1,11}$/.test(ccaNumber)) {
      return res.status(400).json({ error: 'Enter a valid CCA Number of up to 11 digits.' });
    }
    if (!['email', 'sms'].includes(channel)) {
      return res.status(400).json({ error: 'Choose email or SMS verification.' });
    }

    const user = await findByCcaNumber(ccaNumber);
    if (!user) return res.status(404).json({ error: 'Unable to start account recovery.' });

    if (channel === 'email' && (!user.email || !user.email_verified_at || !isEmailDeliveryConfigured())) {
      return res.status(400).json({ error: 'Verified email recovery is not available for this subscriber.' });
    }
    if (channel === 'sms' && (!user.recovery_phone_verified_at || !normalizePhilippinePhone(user.recovery_phone) || !isSmsDeliveryConfigured())) {
      return res.status(400).json({ error: 'SMS recovery is not available for this subscriber.' });
    }

    const existing = await getChallenge(user.id, CCA_RECOVERY_PURPOSE, channel);
    if (existing?.last_sent_at && secondsSince(existing.last_sent_at) < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = OTP_RESEND_COOLDOWN_SECONDS - secondsSince(existing.last_sent_at);
      return res.status(429).json({ error: `Please wait ${Math.max(1, wait)} seconds before requesting another code.` });
    }

    const code = generateRecoveryOtp();
    const codeHash = hashRecoveryOtp({ userId: user.id, ccaNumber, channel, code });
    const expiresAt = challengeExpiry();
    await saveChallenge({ userId: user.id, purpose: CCA_RECOVERY_PURPOSE, channel, codeHash, expiresAt });

    try {
      if (channel === 'email') {
        await sendOtpEmail({ to: user.email, code, purpose: CCA_RECOVERY_PURPOSE });
      } else {
        await sendOtpSms({ to: user.recovery_phone, code, purpose: CCA_RECOVERY_PURPOSE });
      }
    } catch (deliveryError) {
      try {
        await rollbackChallenge({ userId: user.id, purpose: CCA_RECOVERY_PURPOSE, channel, codeHash });
      } catch (rollbackError) {
        console.error('CCA RECOVERY OTP ROLLBACK ERROR:', rollbackError);
      }
      throw deliveryError;
    }

    return res.json({
      message: channel === 'email'
        ? `Verification code sent to ${maskEmail(user.email)}.`
        : `Verification code sent to ${maskPhone(user.recovery_phone)}.`,
    });
  } catch (error) {
    console.error('START PUBLIC CCA RECOVERY ERROR:', error);
    return res.status(500).json({ error: 'Unable to send the recovery code right now.' });
  }
}

async function verifyPublicCcaRecovery(req, res) {
  try {
    const ccaNumber = String(req.body.ccaNumber || '').trim();
    const channel = String(req.body.channel || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    if (!/^\d{1,11}$/.test(ccaNumber)) {
      return res.status(400).json({ error: 'Enter a valid CCA Number of up to 11 digits.' });
    }

    const user = await findByCcaNumber(ccaNumber);
    if (!user) return res.status(400).json({ error: 'Unable to verify account recovery.' });

    if (channel === 'recovery_code') {
      if (!code || !user.recovery_code_hash) {
        return res.status(400).json({ error: 'A valid recovery code is required.' });
      }
      const submittedHash = hashCustomerRecoveryCode(code);
      if (!safeRecoveryHashEquals(submittedHash, user.recovery_code_hash)) {
        return res.status(400).json({ error: 'Invalid recovery code.' });
      }
      return res.json({ accountNumber: user.accountNumber });
    }

    if (!['email', 'sms'].includes(channel) || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Enter the 6-digit verification code.' });
    }

    const challenge = await getChallenge(user.id, CCA_RECOVERY_PURPOSE, channel);
    if (!challenge || !challenge.code_hash || !challenge.expires_at) {
      return res.status(400).json({ error: 'Request a new verification code first.' });
    }
    if (Number(challenge.attempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new verification code.' });
    }
    if (new Date(challenge.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ error: 'Verification code expired. Request a new code.' });
    }

    const submittedHash = hashRecoveryOtp({ userId: user.id, ccaNumber, channel, code });
    if (!safeRecoveryHashEquals(submittedHash, challenge.code_hash)) {
      await incrementChallengeAttempts(user.id, CCA_RECOVERY_PURPOSE, channel);
      return res.status(400).json({ error: 'Incorrect verification code.' });
    }

    await clearChallenge(user.id, CCA_RECOVERY_PURPOSE, channel);
    return res.json({ accountNumber: user.accountNumber });
  } catch (error) {
    console.error('VERIFY PUBLIC CCA RECOVERY ERROR:', error);
    return res.status(500).json({ error: 'Unable to verify account recovery right now.' });
  }
}

async function customerTermsStatus(req, res) {
  try {
    const user = await findById(req.user.id);
    if (!user || user.role !== 'user') return res.status(404).json({ error: 'Customer account not found.' });
    return res.json({
      currentVersion: CURRENT_TERMS_VERSION,
      acceptedVersion: user.terms_version || null,
      acceptedAt: user.terms_accepted_at || null,
      required: String(user.terms_version || '') !== CURRENT_TERMS_VERSION,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load the Terms status.' });
  }
}

async function acceptCustomerTerms(req, res) {
  try {
    if (req.body.accepted !== true) {
      return res.status(400).json({ error: 'You must confirm that you agree before continuing.' });
    }
    const updated = await acceptTerms(req.user.id, CURRENT_TERMS_VERSION);
    if (!updated) return res.status(404).json({ error: 'Customer account not found.' });
    return res.json({
      message: 'Terms of Use and Privacy Notice accepted.',
      user: publicUser(updated),
      currentVersion: CURRENT_TERMS_VERSION,
    });
  } catch (error) {
    console.error('ACCEPT CUSTOMER TERMS ERROR:', error);
    return res.status(500).json({ error: 'Unable to save your acceptance right now.' });
  }
}

async function adminSecurityStatus(_req, res) {
  try {
    return res.json({ configured: await hasConfiguredAdminSecurity() });
  } catch (error) {
    console.error('ADMIN SECURITY STATUS ERROR:', error);
    return res.status(500).json({ error: 'Unable to check admin security status.' });
  }
}

async function adminBootstrapStart(req, res) {
  try {
    cleanupPending(pendingAdminSetups);
    if (await hasConfiguredAdminSecurity()) {
      return res.status(409).json({ error: 'Secure admin authentication is already configured.' });
    }

    const legacyName = String(req.body.legacyUsername || '').trim();
    const legacyId = String(req.body.legacyAdminId || '').trim();
    const username = normalizeAdminUsername(req.body.username);
    const usernameError = validateAdminUsername(username);
    if (usernameError) return res.status(400).json({ error: usernameError });

    const legacyAdmin = await findForAdminLogin(legacyName, legacyId);
    if (!legacyAdmin) return res.status(401).json({ error: 'Invalid existing admin credentials.' });
    if (await findSecurityByUsername(username)) return res.status(409).json({ error: 'That admin username is already in use.' });

    const secret = generateTotpSecret();
    const setupId = crypto.randomUUID();
    pendingAdminSetups.set(setupId, {
      userId: legacyAdmin.id,
      username,
      secret,
      expiresAt: Date.now() + PENDING_TTL_MS,
    });

    const setupToken = jwt.sign(
      { id: legacyAdmin.id, purpose: 'admin_bootstrap', setupId },
      getJwtSecret(),
      { expiresIn: '10m' }
    );

    await writeAudit({ userId: legacyAdmin.id, action: 'ADMIN_SECURITY_SETUP_STARTED', ...requestMeta(req) });
    return res.json({ setupToken, secret, provisioningUri: buildOtpAuthUri(username, secret) });
  } catch (error) {
    console.error('ADMIN BOOTSTRAP START ERROR:', error);
    return res.status(500).json({ error: 'Unable to start secure admin setup.' });
  }
}

async function adminBootstrapComplete(req, res) {
  try {
    cleanupPending(pendingAdminSetups);
    const payload = jwt.verify(String(req.body.setupToken || ''), getJwtSecret());
    if (payload.purpose !== 'admin_bootstrap' || !payload.setupId) return res.status(401).json({ error: 'Invalid setup session.' });

    const pending = pendingAdminSetups.get(payload.setupId);
    if (!pending || pending.userId !== payload.id || pending.expiresAt <= Date.now()) {
      return res.status(401).json({ error: 'Admin setup session expired. Start again.' });
    }
    if (await hasConfiguredAdminSecurity()) return res.status(409).json({ error: 'Secure admin authentication is already configured.' });

    const password = String(req.body.password || '');
    const passwordError = validateAdminPassword(password);
    if (passwordError) return res.status(400).json({ error: passwordError });

    let email;
    try { email = safeRecoveryEmail(req.body.email); } catch (error) { return res.status(400).json({ error: error.message }); }
    if (!verifyTotp(req.body.totpCode, pending.secret)) return res.status(400).json({ error: 'Invalid authenticator code.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const recoveryCodes = generateRecoveryCodes();
    const recoveryHashes = recoveryCodes.map(hashRecoveryCode);
    await completeBootstrap({
      userId: pending.userId,
      username: pending.username,
      passwordHash,
      email,
      totpSecretEnc: encryptTotpSecret(pending.secret),
      recoveryHashes,
    });
    pendingAdminSetups.delete(payload.setupId);

    const user = await findById(pending.userId);
    const security = await findSecurityByUserId(pending.userId);
    const token = signToken(user, { sessionVersion: Number(security.session_version || 1) });
    await writeAudit({ userId: user.id, action: 'ADMIN_SECURITY_SETUP_COMPLETED', ...requestMeta(req) });
    return res.json({ token, user: publicUser(user), recoveryCodes });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Admin setup session expired. Start again.' });
    }
    console.error('ADMIN BOOTSTRAP COMPLETE ERROR:', error);
    return res.status(500).json({ error: 'Unable to complete secure admin setup.' });
  }
}

async function adminLogin(req, res) {
  const meta = requestMeta(req);
  try {
    const username = normalizeAdminUsername(req.body.username);
    const password = String(req.body.password || '');
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

    const security = await findSecurityByUsername(username);
    if (!security || String(security.status || '').toLowerCase() !== 'active' || !security.password_hash) {
      await writeAudit({ userId: security?.user_id || null, action: 'ADMIN_LOGIN_FAILED', details: 'Unknown username, unavailable account, or missing password.', ...meta });
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    if (isLocked(security)) {
      await writeAudit({ userId: security.user_id, action: 'ADMIN_LOGIN_BLOCKED_LOCKED', ...meta });
      return res.status(429).json({ error: 'Admin login is temporarily locked after repeated failed attempts. Try again later.' });
    }

    const matches = await bcrypt.compare(password, security.password_hash);
    if (!matches) {
      const lockedUntil = await recordFailedAttempt(security.user_id);
      await writeAudit({ userId: security.user_id, action: 'ADMIN_LOGIN_FAILED', details: lockedUntil ? 'Account temporarily locked after repeated failures.' : 'Incorrect password.', ...meta });
      return res.status(401).json({ error: 'Invalid admin credentials.' });
    }

    const methods = [];
    if (Boolean(security.totp_enabled) && security.totp_secret_enc) methods.push({ id: 'totp', label: 'Authenticator App' });
    if (security.email && security.email_verified_at && isEmailDeliveryConfigured()) {
      methods.push({ id: 'email', label: 'Email OTP', destination: maskEmail(security.email) });
    }
    if (security.recovery_phone && security.recovery_phone_verified_at && normalizePhilippinePhone(security.recovery_phone) && isSmsDeliveryConfigured()) {
      methods.push({ id: 'sms', label: 'SMS OTP', destination: maskPhone(security.recovery_phone) });
    }
    if (!methods.length) {
      return res.status(403).json({ error: 'No verified Admin two-factor method is available. Use account recovery or configure a security method.' });
    }

    const challengeToken = jwt.sign(
      { id: security.user_id, role: 'admin', purpose: 'admin_2fa', sessionVersion: Number(security.session_version || 1) },
      getJwtSecret(),
      { expiresIn: '5m' }
    );
    return res.json({ requiresTwoFactor: true, challengeToken, methods });
  } catch (error) {
    console.error('ADMIN LOGIN ERROR:', error);
    return res.status(500).json({ error: 'Unable to process admin login.' });
  }
}

async function adminSendTwoFactor(req, res) {
  try {
    const payload = jwt.verify(String(req.body.challengeToken || ''), getJwtSecret());
    if (payload.purpose !== 'admin_2fa' || payload.role !== 'admin') return res.status(401).json({ error: 'Invalid verification session.' });
    const method = String(req.body.method || '').trim().toLowerCase();
    if (!['email', 'sms'].includes(method)) return res.status(400).json({ error: 'Choose Email OTP or SMS OTP.' });

    const security = await findSecurityByUserId(payload.id);
    if (!security || String(security.status || '').toLowerCase() !== 'active') return res.status(401).json({ error: 'Admin account is unavailable.' });
    if (Number(payload.sessionVersion || 0) !== Number(security.session_version || 1)) return res.status(401).json({ error: 'Verification session is no longer valid.' });
    if (isLocked(security)) return res.status(429).json({ error: 'Admin login is temporarily locked. Try again later.' });

    if (method === 'email' && (!security.email || !security.email_verified_at || !isEmailDeliveryConfigured())) {
      return res.status(400).json({ error: 'Verified Admin email OTP is not available.' });
    }
    if (method === 'sms' && (!security.recovery_phone || !security.recovery_phone_verified_at || !normalizePhilippinePhone(security.recovery_phone) || !isSmsDeliveryConfigured())) {
      return res.status(400).json({ error: 'Verified Admin SMS OTP is not available.' });
    }

    const existing = await getChallenge(security.user_id, ADMIN_LOGIN_OTP_PURPOSE, method);
    if (existing?.last_sent_at && secondsSince(existing.last_sent_at) < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = OTP_RESEND_COOLDOWN_SECONDS - secondsSince(existing.last_sent_at);
      return res.status(429).json({ error: `Please wait ${Math.max(1, wait)} seconds before requesting another code.` });
    }

    const code = generateRecoveryOtp();
    const context = security.username;
    const codeHash = hashRecoveryOtp({ userId: security.user_id, context, channel: method, code });
    const expiresAt = challengeExpiry();
    const target = method === 'email' ? security.email : security.recovery_phone;
    await saveChallenge({ userId: security.user_id, purpose: ADMIN_LOGIN_OTP_PURPOSE, channel: method, codeHash, expiresAt, targetValue: target });
    try {
      if (method === 'email') await sendOtpEmail({ to: security.email, code, purpose: 'admin_login' });
      else await sendOtpSms({ to: security.recovery_phone, code, purpose: 'admin_login' });
    } catch (deliveryError) {
      await rollbackChallenge({ userId: security.user_id, purpose: ADMIN_LOGIN_OTP_PURPOSE, channel: method, codeHash }).catch(() => {});
      throw deliveryError;
    }
    await writeAudit({ userId: security.user_id, action: 'ADMIN_OTP_SENT', details: `Method: ${method}`, ...requestMeta(req) });
    return res.json({ message: method === 'email' ? `Code sent to ${maskEmail(security.email)}.` : `Code sent to ${maskPhone(security.recovery_phone)}.` });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Admin verification session expired. Log in again.' });
    console.error('ADMIN SEND 2FA ERROR:', error);
    return res.status(500).json({ error: 'Unable to send the Admin verification code.' });
  }
}


async function adminVerifyTwoFactor(req, res) {
  const meta = requestMeta(req);
  try {
    const payload = jwt.verify(String(req.body.challengeToken || ''), getJwtSecret());
    if (payload.purpose !== 'admin_2fa' || payload.role !== 'admin') return res.status(401).json({ error: 'Invalid verification session.' });

    const security = await findSecurityByUserId(payload.id);
    if (!security || String(security.status || '').toLowerCase() !== 'active') return res.status(401).json({ error: 'Admin account is unavailable.' });
    if (Number(payload.sessionVersion || 0) !== Number(security.session_version || 1)) return res.status(401).json({ error: 'Verification session is no longer valid.' });
    if (isLocked(security)) return res.status(429).json({ error: 'Admin login is temporarily locked. Try again later.' });

    const method = String(req.body.method || 'totp').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    let verified = false;
    let failureLabel = 'verification code';

    if (method === 'totp') {
      if (!security.totp_enabled || !security.totp_secret_enc) return res.status(400).json({ error: 'Authenticator verification is not enabled.' });
      let secret;
      try { secret = decryptTotpSecret(security.totp_secret_enc); } catch (_error) { return res.status(500).json({ error: 'Unable to verify two-factor authentication.' }); }
      verified = verifyTotp(code, secret);
      failureLabel = 'authenticator code';
    } else if (['email', 'sms'].includes(method)) {
      if (!/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit verification code.' });
      const challenge = await getChallenge(security.user_id, ADMIN_LOGIN_OTP_PURPOSE, method);
      if (!challenge?.code_hash || !challenge.expires_at) return res.status(400).json({ error: 'Request a new verification code first.' });
      if (Number(challenge.attempts || 0) >= OTP_MAX_ATTEMPTS) return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
      if (new Date(challenge.expires_at).getTime() <= Date.now()) return res.status(400).json({ error: 'Verification code expired. Request a new code.' });
      const submittedHash = hashRecoveryOtp({ userId: security.user_id, context: security.username, channel: method, code });
      verified = safeRecoveryHashEquals(submittedHash, challenge.code_hash);
      if (!verified) await incrementChallengeAttempts(security.user_id, ADMIN_LOGIN_OTP_PURPOSE, method);
      failureLabel = `${method} OTP`;
    } else {
      return res.status(400).json({ error: 'Unsupported Admin verification method.' });
    }

    if (!verified) {
      const lockedUntil = await recordFailedAttempt(security.user_id);
      await writeAudit({ userId: security.user_id, action: 'ADMIN_2FA_FAILED', details: lockedUntil ? 'Account temporarily locked.' : `Incorrect ${failureLabel}.`, ...meta });
      return res.status(401).json({ error: `Invalid ${failureLabel}.` });
    }

    if (['email', 'sms'].includes(method)) await clearChallenge(security.user_id, ADMIN_LOGIN_OTP_PURPOSE, method);
    await clearFailedAttempts(security.user_id);
    const user = await findById(security.user_id);
    const token = signToken(user, { sessionVersion: Number(security.session_version || 1) });
    await writeAudit({ userId: user.id, action: 'ADMIN_LOGIN_SUCCESS', ...meta });
    return res.json({ token, user: publicUser(user) });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Admin verification session expired. Log in again.' });
    }
    console.error('ADMIN 2FA ERROR:', error);
    return res.status(500).json({ error: 'Unable to verify admin login.' });
  }
}

async function adminRecoveryStart(req, res) {
  try {
    cleanupPending(pendingAdminRecoveries);
    const username = normalizeAdminUsername(req.body.username);
    const recoveryCode = String(req.body.recoveryCode || '').trim().toUpperCase();
    const newPassword = String(req.body.newPassword || '');
    const passwordError = validateAdminPassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });

    const security = await findSecurityByUsername(username);
    if (!security || String(security.status || '').toLowerCase() !== 'active') {
      return res.status(401).json({ error: 'Invalid recovery information.' });
    }
    const recovery = await findUnusedRecoveryCode(security.user_id, hashRecoveryCode(recoveryCode));
    if (!recovery) {
      await writeAudit({ userId: security.user_id, action: 'ADMIN_RECOVERY_FAILED', details: 'Invalid recovery code.', ...requestMeta(req) });
      return res.status(401).json({ error: 'Invalid recovery information.' });
    }

    const secret = generateTotpSecret();
    const recoveryId = crypto.randomUUID();
    pendingAdminRecoveries.set(recoveryId, {
      userId: security.user_id,
      codeId: recovery.code_id,
      passwordHash: await bcrypt.hash(newPassword, 12),
      secret,
      username: security.username,
      expiresAt: Date.now() + PENDING_TTL_MS,
    });
    const recoveryToken = jwt.sign(
      { id: security.user_id, purpose: 'admin_recovery', recoveryId },
      getJwtSecret(),
      { expiresIn: '10m' }
    );

    await writeAudit({ userId: security.user_id, action: 'ADMIN_RECOVERY_STARTED', ...requestMeta(req) });
    return res.json({ recoveryToken, secret, provisioningUri: buildOtpAuthUri(security.username, secret) });
  } catch (error) {
    console.error('ADMIN RECOVERY START ERROR:', error);
    return res.status(500).json({ error: 'Unable to start admin account recovery.' });
  }
}

async function adminRecoveryComplete(req, res) {
  try {
    cleanupPending(pendingAdminRecoveries);
    const payload = jwt.verify(String(req.body.recoveryToken || ''), getJwtSecret());
    if (payload.purpose !== 'admin_recovery' || !payload.recoveryId) return res.status(401).json({ error: 'Invalid recovery session.' });
    const pending = pendingAdminRecoveries.get(payload.recoveryId);
    if (!pending || pending.userId !== payload.id || pending.expiresAt <= Date.now()) return res.status(401).json({ error: 'Recovery session expired. Start again.' });
    if (!verifyTotp(req.body.totpCode, pending.secret)) return res.status(400).json({ error: 'Invalid authenticator code.' });

    const recoveryCodes = generateRecoveryCodes();
    await completeRecovery({
      userId: pending.userId,
      passwordHash: pending.passwordHash,
      totpSecretEnc: encryptTotpSecret(pending.secret),
      consumedCodeId: pending.codeId,
      recoveryHashes: recoveryCodes.map(hashRecoveryCode),
    });
    pendingAdminRecoveries.delete(payload.recoveryId);

    const user = await findById(pending.userId);
    const security = await findSecurityByUserId(pending.userId);
    const token = signToken(user, { sessionVersion: Number(security.session_version || 1) });
    await writeAudit({ userId: user.id, action: 'ADMIN_RECOVERY_COMPLETED', details: 'Password, 2FA secret, recovery codes, and sessions were rotated.', ...requestMeta(req) });
    return res.json({ token, user: publicUser(user), recoveryCodes });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Recovery session expired. Start again.' });
    console.error('ADMIN RECOVERY COMPLETE ERROR:', error);
    return res.status(500).json({ error: 'Unable to complete admin account recovery.' });
  }
}

async function adminSecurityInfo(req, res) {
  try {
    const security = await findSecurityByUserId(req.user.id);
    if (!security) return res.status(404).json({ error: 'Admin security profile not found.' });
    return res.json({
      security: {
        username: security.username,
        recoveryEmail: security.email || null,
        emailVerified: Boolean(security.email_verified_at),
        recoveryPhone: security.recovery_phone || null,
        phoneVerified: Boolean(security.recovery_phone_verified_at),
        emailOtpAvailable: Boolean(security.email && security.email_verified_at && isEmailDeliveryConfigured()),
        smsOtpAvailable: Boolean(security.recovery_phone && security.recovery_phone_verified_at && normalizePhilippinePhone(security.recovery_phone) && isSmsDeliveryConfigured()),
        twoFactorEnabled: Boolean(security.totp_enabled),
        lastLoginAt: security.last_login_at || null,
        lastPasswordChangeAt: security.last_password_change_at || null,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load admin security settings.' });
  }
}

async function verifyCurrentAdminFactors(userId, password, totpCode) {
  const security = await findSecurityByUserId(userId);
  if (!security || !security.password_hash || !security.totp_secret_enc) return { error: 'Admin security profile is unavailable.' };
  if (!(await bcrypt.compare(String(password || ''), security.password_hash))) return { error: 'Current password is incorrect.' };
  const secret = decryptTotpSecret(security.totp_secret_enc);
  if (!verifyTotp(totpCode, secret)) return { error: 'Authenticator code is invalid.' };
  return { security };
}

async function adminChangePassword(req, res) {
  try {
    const verification = await verifyCurrentAdminFactors(req.user.id, req.body.currentPassword, req.body.totpCode);
    if (verification.error) return res.status(400).json({ error: verification.error });
    const newPassword = String(req.body.newPassword || '');
    const passwordError = validateAdminPassword(newPassword);
    if (passwordError) return res.status(400).json({ error: passwordError });
    if (await bcrypt.compare(newPassword, verification.security.password_hash)) return res.status(400).json({ error: 'New password must be different from the current password.' });

    const version = await changePasswordAndRevokeSessions(req.user.id, await bcrypt.hash(newPassword, 12));
    const user = await findById(req.user.id);
    const token = signToken(user, { sessionVersion: version });
    await writeAudit({ userId: req.user.id, action: 'ADMIN_PASSWORD_CHANGED', details: 'All older admin sessions were revoked.', ...requestMeta(req) });
    return res.json({ message: 'Admin password updated. Other sessions were revoked.', token, user: publicUser(user) });
  } catch (error) {
    console.error('ADMIN CHANGE PASSWORD ERROR:', error);
    return res.status(500).json({ error: 'Unable to change admin password.' });
  }
}

async function adminRegenerateRecoveryCodes(req, res) {
  try {
    const verification = await verifyCurrentAdminFactors(req.user.id, req.body.currentPassword, req.body.totpCode);
    if (verification.error) return res.status(400).json({ error: verification.error });
    const recoveryCodes = generateRecoveryCodes();
    await replaceRecoveryCodes(req.user.id, recoveryCodes.map(hashRecoveryCode));
    await writeAudit({ userId: req.user.id, action: 'ADMIN_RECOVERY_CODES_ROTATED', ...requestMeta(req) });
    return res.json({ recoveryCodes });
  } catch (error) {
    console.error('ADMIN RECOVERY CODE ROTATION ERROR:', error);
    return res.status(500).json({ error: 'Unable to regenerate recovery codes.' });
  }
}

async function adminRevokeSessions(req, res) {
  try {
    const verification = await verifyCurrentAdminFactors(req.user.id, req.body.currentPassword, req.body.totpCode);
    if (verification.error) return res.status(400).json({ error: verification.error });
    const version = await incrementSessionVersion(req.user.id);
    const user = await findById(req.user.id);
    const token = signToken(user, { sessionVersion: version });
    await writeAudit({ userId: req.user.id, action: 'ADMIN_SESSIONS_REVOKED', ...requestMeta(req) });
    return res.json({ message: 'All older admin sessions have been revoked.', token, user: publicUser(user) });
  } catch (error) {
    console.error('ADMIN SESSION REVOCATION ERROR:', error);
    return res.status(500).json({ error: 'Unable to revoke admin sessions.' });
  }
}

async function adminUpdateEmail(req, res) {
  try {
    const verification = await verifyCurrentAdminFactors(req.user.id, req.body.currentPassword, req.body.totpCode);
    if (verification.error) return res.status(400).json({ error: verification.error });
    let email;
    try { email = safeRecoveryEmail(req.body.email); } catch (error) { return res.status(400).json({ error: error.message }); }
    await updateAdminEmail(req.user.id, email);
    await writeAudit({ userId: req.user.id, action: 'ADMIN_RECOVERY_EMAIL_UPDATED', ...requestMeta(req) });
    return res.json({ message: 'Recovery contact email updated.', recoveryEmail: email });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to update recovery email.' });
  }
}

async function adminContactVerificationStart(req, res) {
  try {
    const verification = await verifyCurrentAdminFactors(req.user.id, req.body.currentPassword, req.body.totpCode);
    if (verification.error) return res.status(400).json({ error: verification.error });
    const channel = String(req.body.channel || '').trim().toLowerCase();
    if (!['email', 'sms'].includes(channel)) return res.status(400).json({ error: 'Choose email or SMS.' });

    let target;
    let purpose;
    if (channel === 'email') {
      target = normalizeEmail(req.body.value);
      if (!isValidEmail(target)) return res.status(400).json({ error: 'Enter a valid email address.' });
      if (!isEmailDeliveryConfigured()) return res.status(503).json({ error: 'Email delivery is not configured.' });
      purpose = ADMIN_EMAIL_VERIFY_PURPOSE;
    } else {
      target = normalizePhilippinePhone(req.body.value);
      if (!target) return res.status(400).json({ error: 'Enter a valid Philippine mobile number.' });
      if (!isSmsDeliveryConfigured()) return res.status(503).json({ error: 'SMS delivery is not configured.' });
      purpose = ADMIN_PHONE_VERIFY_PURPOSE;
    }

    const existing = await getChallenge(req.user.id, purpose, channel);
    if (existing?.last_sent_at && secondsSince(existing.last_sent_at) < OTP_RESEND_COOLDOWN_SECONDS) {
      const wait = OTP_RESEND_COOLDOWN_SECONDS - secondsSince(existing.last_sent_at);
      return res.status(429).json({ error: `Please wait ${Math.max(1, wait)} seconds before requesting another code.` });
    }
    const code = generateRecoveryOtp();
    const codeHash = hashRecoveryOtp({ userId: req.user.id, context: target, channel, code });
    const expiresAt = challengeExpiry();
    await saveChallenge({ userId: req.user.id, purpose, channel, codeHash, expiresAt, targetValue: target });
    try {
      if (channel === 'email') await sendOtpEmail({ to: target, code, purpose: 'admin_contact_verification' });
      else await sendOtpSms({ to: target, code, purpose: 'admin_contact_verification' });
    } catch (deliveryError) {
      await rollbackChallenge({ userId: req.user.id, purpose, channel, codeHash }).catch(() => {});
      throw deliveryError;
    }
    return res.json({ message: channel === 'email' ? `Verification code sent to ${maskEmail(target)}.` : `Verification code sent to ${maskPhone(target)}.` });
  } catch (error) {
    console.error('ADMIN CONTACT VERIFICATION START ERROR:', error);
    return res.status(500).json({ error: 'Unable to send the contact verification code.' });
  }
}

async function adminContactVerificationConfirm(req, res) {
  try {
    const channel = String(req.body.channel || '').trim().toLowerCase();
    const code = String(req.body.code || '').trim();
    if (!['email', 'sms'].includes(channel) || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Enter the 6-digit verification code.' });
    const purpose = channel === 'email' ? ADMIN_EMAIL_VERIFY_PURPOSE : ADMIN_PHONE_VERIFY_PURPOSE;
    const challenge = await getChallenge(req.user.id, purpose, channel);
    if (!challenge?.target_value || !challenge.code_hash || !challenge.expires_at) return res.status(400).json({ error: 'Request a new verification code first.' });
    if (Number(challenge.attempts || 0) >= OTP_MAX_ATTEMPTS) return res.status(429).json({ error: 'Too many incorrect attempts. Request a new code.' });
    if (new Date(challenge.expires_at).getTime() <= Date.now()) return res.status(400).json({ error: 'Verification code expired. Request a new code.' });
    const submittedHash = hashRecoveryOtp({ userId: req.user.id, context: challenge.target_value, channel, code });
    if (!safeRecoveryHashEquals(submittedHash, challenge.code_hash)) {
      await incrementChallengeAttempts(req.user.id, purpose, channel);
      return res.status(400).json({ error: 'Incorrect verification code.' });
    }

    if (channel === 'email') await updateVerifiedEmail(req.user.id, normalizeEmail(challenge.target_value), 'admin');
    else {
      const normalized = normalizePhilippinePhone(challenge.target_value);
      if (!normalized) return res.status(400).json({ error: 'The verified mobile number is invalid.' });
      await updateVerifiedPhone(req.user.id, `0${normalized.slice(3)}`, 'admin');
    }
    await clearChallenge(req.user.id, purpose, channel);
    await writeAudit({ userId: req.user.id, action: 'ADMIN_2FA_CONTACT_VERIFIED', details: `Verified ${channel} contact.`, ...requestMeta(req) });
    return res.json({ message: channel === 'email' ? 'Admin email verified for OTP login.' : 'Admin mobile number verified for SMS OTP login.' });
  } catch (error) {
    console.error('ADMIN CONTACT VERIFICATION CONFIRM ERROR:', error);
    return res.status(500).json({ error: 'Unable to verify the Admin contact.' });
  }
}


async function adminAuditLogs(req, res) {
  try {
    return res.json({ logs: await getRecentAuditLogs(req.user.id, 40) });
  } catch (error) {
    return res.status(500).json({ error: 'Unable to load admin audit logs.' });
  }
}

async function me(req, res) {
  try {
    const user = await findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: publicUser(user) });
  } catch (err) { return res.status(500).json({ error: 'Server error' }); }
}

async function lookupByAccountId(req, res) {
  try {
    const accountId = String(req.params.accountId || '').trim();
    if (!/^\d{1,11}$/.test(accountId)) {
      return res.status(400).json({ error: 'Enter a valid Account Number or CCA Number.' });
    }
    const own = await findById(req.user.id);
    if (!own || own.role !== 'user') return res.status(404).json({ error: 'Account not found' });
    if (accountId !== String(own.accountNumber) && accountId !== String(own.ccaNumber)) {
      return res.status(403).json({ error: 'You can only retrieve your own subscriber record.' });
    }
    return res.json({ user: publicUser(own) });
  } catch (err) { return res.status(500).json({ error: 'Server error' }); }
}

module.exports = {
  login,
  register,
  changePassword,
  recoverCustomerPassword,
  customerSecurityInfo,
  requestCustomerEmailVerification,
  confirmCustomerEmailVerification,
  requestCustomerPhoneVerification,
  confirmCustomerPhoneVerification,
  customerRecoveryOptions,
  startCustomerEmailRecovery,
  completeCustomerEmailRecovery,
  startCustomerSmsRecovery,
  completeCustomerSmsRecovery,
  publicPrepaidInquiry,
  publicCcaInquiry,
  startPublicCcaRecovery,
  verifyPublicCcaRecovery,
  customerTermsStatus,
  acceptCustomerTerms,
  adminSecurityStatus,
  adminBootstrapStart,
  adminBootstrapComplete,
  adminLogin,
  adminSendTwoFactor,
  adminVerifyTwoFactor,
  adminRecoveryStart,
  adminRecoveryComplete,
  adminSecurityInfo,
  adminChangePassword,
  adminRegenerateRecoveryCodes,
  adminRevokeSessions,
  adminUpdateEmail,
  adminContactVerificationStart,
  adminContactVerificationConfirm,
  adminAuditLogs,
  me,
  lookupByAccountId,
};
