const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret, getJwtExpiry } = require('../utils/authConfig');
const {
  findForAdminLogin,
  findByAccountNumber,
  findById,
  findByAccountIdOrCca,
  setPassword,
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
const { ACCOUNT_NUMBER_RE, validateNewPassword } = require('../utils/subscriberAccount');
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
    role: user.role,
    location: user.location,
    status: user.status,
  };
}

function requestMeta(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return {
    ipAddress: forwarded || req.ip || req.socket?.remoteAddress || null,
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

    return res.json({ token: signToken(user), user: publicUser(user) });
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
    await setPassword(user.id, hash, false);
    const updated = { ...user, must_change_password: false };
    return res.json({ message: 'Password updated successfully.', token: signToken(updated), user: publicUser(updated) });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Password-change session expired. Please log in again.' });
    }
    console.error('CHANGE PASSWORD ERROR', err);
    return res.status(500).json({ error: 'Unable to change password.' });
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

    if (!Boolean(security.totp_enabled) || !security.totp_secret_enc) {
      return res.status(403).json({ error: 'Admin two-factor authentication is not configured. Use account recovery or first-time setup.' });
    }

    const challengeToken = jwt.sign(
      { id: security.user_id, role: 'admin', purpose: 'admin_2fa', sessionVersion: Number(security.session_version || 1) },
      getJwtSecret(),
      { expiresIn: '5m' }
    );
    return res.json({ requiresTwoFactor: true, challengeToken });
  } catch (error) {
    console.error('ADMIN LOGIN ERROR:', error);
    return res.status(500).json({ error: 'Unable to process admin login.' });
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

    let secret;
    try { secret = decryptTotpSecret(security.totp_secret_enc); } catch (_error) { return res.status(500).json({ error: 'Unable to verify two-factor authentication.' }); }
    if (!verifyTotp(req.body.code, secret)) {
      const lockedUntil = await recordFailedAttempt(security.user_id);
      await writeAudit({ userId: security.user_id, action: 'ADMIN_2FA_FAILED', details: lockedUntil ? 'Account temporarily locked.' : 'Incorrect authenticator code.', ...meta });
      return res.status(401).json({ error: 'Invalid authenticator code.' });
    }

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
    const { password_hash, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err) { return res.status(500).json({ error: 'Server error' }); }
}

async function lookupByAccountId(req, res) {
  try {
    const accountId = String(req.params.accountId || '').trim();
    if (!/^\d{1,11}$/.test(accountId)) {
      return res.status(400).json({ error: 'Enter a valid Account Number or CCA Number.' });
    }

    const user = await findByAccountIdOrCca(accountId);
    if (!user) return res.status(404).json({ error: 'Account not found' });
    return res.json({ user: {
      accountName: user.accountName, accountNumber: user.accountNumber, ccaNumber: user.ccaNumber,
      phone: user.phone, location: user.location, status: user.status, lastLoadDate: user.lastLoadDate || null,
    } });
  } catch (err) { return res.status(500).json({ error: 'Server error' }); }
}

module.exports = {
  login,
  register,
  changePassword,
  adminSecurityStatus,
  adminBootstrapStart,
  adminBootstrapComplete,
  adminLogin,
  adminVerifyTwoFactor,
  adminRecoveryStart,
  adminRecoveryComplete,
  adminSecurityInfo,
  adminChangePassword,
  adminRegenerateRecoveryCodes,
  adminRevokeSessions,
  adminUpdateEmail,
  adminAuditLogs,
  me,
  lookupByAccountId,
};
