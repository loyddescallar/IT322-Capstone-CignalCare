const crypto = require('crypto');
const pool = require('../config/db');

let schemaReady = false;

async function ensureAdminSecuritySchema() {
  if (schemaReady) return;

  await pool.query(`CREATE TABLE IF NOT EXISTS admin_security (
    user_id INTEGER PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    totp_secret_enc TEXT NULL,
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    session_version INTEGER NOT NULL DEFAULT 1,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP NULL,
    last_login_at TIMESTAMP NULL,
    last_password_change_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS admin_recovery_codes (
    code_id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`);

  await pool.query(`CREATE TABLE IF NOT EXISTS admin_audit_logs (
    event_id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NULL,
    action VARCHAR(100) NOT NULL,
    ip_address VARCHAR(80) NULL,
    user_agent VARCHAR(255) NULL,
    details TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
  )`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_audit_user_created ON admin_audit_logs (user_id, created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_admin_recovery_user_used ON admin_recovery_codes (user_id, used_at)`);
  schemaReady = true;
}

async function hasConfiguredAdminSecurity() {
  await ensureAdminSecuritySchema();
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM admin_security WHERE totp_enabled = TRUE`);
  return Number(rows[0]?.total || 0) > 0;
}

async function findSecurityByUsername(username) {
  await ensureAdminSecuritySchema();
  const [rows] = await pool.query(
    `SELECT s.*, u.accountName, u.accountNumber, u.ccaNumber, u.address, u.phone, u.email, u.password_hash, u.role, u.location, u.status
     FROM admin_security s
     JOIN users u ON u.id = s.user_id
     WHERE s.username = ? AND u.role = 'admin'
     LIMIT 1`,
    [username]
  );
  return rows[0] || null;
}

async function findSecurityByUserId(userId) {
  await ensureAdminSecuritySchema();
  const [rows] = await pool.query(
    `SELECT s.*, u.accountName, u.accountNumber, u.ccaNumber, u.address, u.phone, u.email, u.password_hash, u.role, u.location, u.status
     FROM admin_security s
     JOIN users u ON u.id = s.user_id
     WHERE s.user_id = ? AND u.role = 'admin'
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function createSecurity({ userId, username, totpSecretEnc }) {
  await ensureAdminSecuritySchema();
  await pool.query(
    `INSERT INTO admin_security
     (user_id, username, totp_secret_enc, totp_enabled, session_version, failed_attempts, locked_until, last_password_change_at, updated_at)
     VALUES (?, ?, ?, TRUE, 1, 0, NULL, NOW(), NOW())`,
    [userId, username, totpSecretEnc]
  );
}

async function updateAdminPasswordAndEmail(userId, passwordHash, email) {
  await pool.query(
    `UPDATE users SET password_hash = ?, email = ?, updated_at = NOW() WHERE id = ? AND role = 'admin'`,
    [passwordHash, email, userId]
  );
}

async function updateAdminEmail(userId, email) {
  await pool.query(`UPDATE users SET email = ?, updated_at = NOW() WHERE id = ? AND role = 'admin'`, [email, userId]);
}

async function updateAdminPassword(userId, passwordHash) {
  await pool.query(`UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ? AND role = 'admin'`, [passwordHash, userId]);
  await pool.query(`UPDATE admin_security SET last_password_change_at = NOW(), updated_at = NOW() WHERE user_id = ?`, [userId]);
}

async function setTotp(userId, encryptedSecret, enabled = true) {
  await ensureAdminSecuritySchema();
  await pool.query(
    `UPDATE admin_security SET totp_secret_enc = ?, totp_enabled = ?, failed_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE user_id = ?`,
    [encryptedSecret, Boolean(enabled), userId]
  );
}

async function recordFailedAttempt(userId, maxAttempts = 5, lockMinutes = 15) {
  const security = await findSecurityByUserId(userId);
  if (!security) return null;
  const attempts = Number(security.failed_attempts || 0) + 1;
  const lockedUntil = attempts >= maxAttempts ? new Date(Date.now() + lockMinutes * 60_000) : null;
  await pool.query(
    `UPDATE admin_security SET failed_attempts = ?, locked_until = ?, updated_at = NOW() WHERE user_id = ?`,
    [attempts >= maxAttempts ? 0 : attempts, lockedUntil, userId]
  );
  return lockedUntil;
}

async function clearFailedAttempts(userId) {
  await ensureAdminSecuritySchema();
  await pool.query(`UPDATE admin_security SET failed_attempts = 0, locked_until = NULL, last_login_at = NOW(), updated_at = NOW() WHERE user_id = ?`, [userId]);
}

async function incrementSessionVersion(userId) {
  await ensureAdminSecuritySchema();
  await pool.query(`UPDATE admin_security SET session_version = session_version + 1, updated_at = NOW() WHERE user_id = ?`, [userId]);
  const security = await findSecurityByUserId(userId);
  return Number(security?.session_version || 1);
}

async function replaceRecoveryCodes(userId, hashes) {
  await ensureAdminSecuritySchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM admin_recovery_codes WHERE user_id = ?`, [userId]);
    for (const hash of hashes) {
      await connection.query(
        `INSERT INTO admin_recovery_codes (code_id, user_id, code_hash, used_at) VALUES (?, ?, ?, NULL)`,
        [crypto.randomUUID(), userId, hash]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function findUnusedRecoveryCode(userId, codeHash) {
  await ensureAdminSecuritySchema();
  const [rows] = await pool.query(
    `SELECT code_id, user_id, code_hash FROM admin_recovery_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL LIMIT 1`,
    [userId, codeHash]
  );
  return rows[0] || null;
}

async function consumeRecoveryCode(codeId) {
  const [result] = await pool.query(
    `UPDATE admin_recovery_codes SET used_at = NOW() WHERE code_id = ? AND used_at IS NULL`,
    [codeId]
  );
  return Number(result.affectedRows || 0) === 1;
}

async function writeAudit({ userId = null, action, ipAddress = null, userAgent = null, details = null }) {
  try {
    await ensureAdminSecuritySchema();
    await pool.query(
      `INSERT INTO admin_audit_logs (event_id, user_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, String(action).slice(0, 100), ipAddress ? String(ipAddress).slice(0, 80) : null,
        userAgent ? String(userAgent).slice(0, 255) : null, details ? String(details).slice(0, 2000) : null]
    );
  } catch (error) {
    console.error('ADMIN AUDIT LOG ERROR:', error.message);
  }
}

async function getRecentAuditLogs(userId, limit = 30) {
  await ensureAdminSecuritySchema();
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const [rows] = await pool.query(
    `SELECT event_id, action, ip_address, user_agent, details, created_at
     FROM admin_audit_logs
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ${safeLimit}`,
    [userId]
  );
  return rows;
}

async function completeBootstrap({ userId, username, passwordHash, email, totpSecretEnc, recoveryHashes }) {
  await ensureAdminSecuritySchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO admin_security
       (user_id, username, totp_secret_enc, totp_enabled, session_version, failed_attempts, locked_until, last_password_change_at, updated_at)
       VALUES (?, ?, ?, TRUE, 1, 0, NULL, NOW(), NOW())`,
      [userId, username, totpSecretEnc]
    );
    await connection.query(
      `UPDATE users SET password_hash = ?, email = ?, updated_at = NOW() WHERE id = ? AND role = 'admin'`,
      [passwordHash, email, userId]
    );
    for (const hash of recoveryHashes) {
      await connection.query(
        `INSERT INTO admin_recovery_codes (code_id, user_id, code_hash, used_at) VALUES (?, ?, ?, NULL)`,
        [crypto.randomUUID(), userId, hash]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function completeRecovery({ userId, passwordHash, totpSecretEnc, consumedCodeId, recoveryHashes }) {
  await ensureAdminSecuritySchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [consumeResult] = await connection.query(
      `UPDATE admin_recovery_codes SET used_at = NOW() WHERE code_id = ? AND user_id = ? AND used_at IS NULL`,
      [consumedCodeId, userId]
    );
    if (Number(consumeResult.affectedRows || 0) !== 1) throw new Error('Recovery code is no longer valid.');

    await connection.query(
      `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ? AND role = 'admin'`,
      [passwordHash, userId]
    );
    await connection.query(
      `UPDATE admin_security
       SET totp_secret_enc = ?, totp_enabled = TRUE, session_version = session_version + 1,
           failed_attempts = 0, locked_until = NULL, last_password_change_at = NOW(), updated_at = NOW()
       WHERE user_id = ?`,
      [totpSecretEnc, userId]
    );
    await connection.query(`DELETE FROM admin_recovery_codes WHERE user_id = ?`, [userId]);
    for (const hash of recoveryHashes) {
      await connection.query(
        `INSERT INTO admin_recovery_codes (code_id, user_id, code_hash, used_at) VALUES (?, ?, ?, NULL)`,
        [crypto.randomUUID(), userId, hash]
      );
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function changePasswordAndRevokeSessions(userId, passwordHash) {
  await ensureAdminSecuritySchema();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ? AND role = 'admin'`, [passwordHash, userId]);
    await connection.query(
      `UPDATE admin_security SET session_version = session_version + 1, last_password_change_at = NOW(), updated_at = NOW() WHERE user_id = ?`,
      [userId]
    );
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  const security = await findSecurityByUserId(userId);
  return Number(security?.session_version || 1);
}

module.exports = {
  ensureAdminSecuritySchema,
  hasConfiguredAdminSecurity,
  findSecurityByUsername,
  findSecurityByUserId,
  createSecurity,
  updateAdminPasswordAndEmail,
  updateAdminEmail,
  updateAdminPassword,
  setTotp,
  recordFailedAttempt,
  clearFailedAttempts,
  incrementSessionVersion,
  replaceRecoveryCodes,
  findUnusedRecoveryCode,
  consumeRecoveryCode,
  writeAudit,
  getRecentAuditLogs,
  completeBootstrap,
  completeRecovery,
  changePasswordAndRevokeSessions,
};
