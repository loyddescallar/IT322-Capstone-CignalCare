const crypto = require('crypto');
const pool = require('../config/db');
const { getJwtSecret } = require('../utils/authConfig');

let schemaReady = false;

async function ensureAccountRecoverySchema() {
  if (schemaReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS account_recovery_challenges (
      user_id INTEGER NOT NULL,
      purpose VARCHAR(50) NOT NULL,
      channel VARCHAR(20) NOT NULL,
      code_hash VARCHAR(64) NOT NULL,
      target_value VARCHAR(255) NULL,
      expires_at TIMESTAMP NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_sent_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, purpose, channel)
    )
  `);
  await pool.query(`ALTER TABLE account_recovery_challenges ADD COLUMN IF NOT EXISTS target_value VARCHAR(255) NULL`);

  schemaReady = true;
}

function generateRecoveryOtp() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashRecoveryOtp({ userId, ccaNumber, context, channel, code }) {
  const scope = context != null ? context : ccaNumber;
  return crypto
    .createHmac('sha256', String(process.env.ACCOUNT_RECOVERY_OTP_SECRET || getJwtSecret()))
    .update(`${Number(userId)}|${String(scope || '').trim()}|${String(channel)}|${String(code).trim()}`)
    .digest('hex');
}

function safeHashEquals(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function challengeExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000);
}

async function getChallenge(userId, purpose, channel) {
  await ensureAccountRecoverySchema();
  const [rows] = await pool.query(
    `SELECT * FROM account_recovery_challenges
     WHERE user_id=? AND purpose=? AND channel=?
     LIMIT 1`,
    [userId, purpose, channel]
  );
  return rows[0] || null;
}

async function saveChallenge({ userId, purpose, channel, codeHash, expiresAt, targetValue = null }) {
  await ensureAccountRecoverySchema();
  await pool.query(
    `DELETE FROM account_recovery_challenges
     WHERE user_id=? AND purpose=? AND channel=?`,
    [userId, purpose, channel]
  );
  await pool.query(
    `INSERT INTO account_recovery_challenges
      (user_id, purpose, channel, code_hash, target_value, expires_at, attempts, last_sent_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
    [userId, purpose, channel, codeHash, targetValue, expiresAt]
  );
}

async function rollbackChallenge({ userId, purpose, channel, codeHash }) {
  await ensureAccountRecoverySchema();
  const [result] = await pool.query(
    `DELETE FROM account_recovery_challenges
     WHERE user_id=? AND purpose=? AND channel=? AND code_hash=?`,
    [userId, purpose, channel, codeHash]
  );
  return Number(result.affectedRows || 0);
}

async function incrementChallengeAttempts(userId, purpose, channel) {
  await ensureAccountRecoverySchema();
  await pool.query(
    `UPDATE account_recovery_challenges
     SET attempts=COALESCE(attempts, 0) + 1
     WHERE user_id=? AND purpose=? AND channel=?`,
    [userId, purpose, channel]
  );
}

async function clearChallenge(userId, purpose, channel) {
  await ensureAccountRecoverySchema();
  await pool.query(
    `DELETE FROM account_recovery_challenges
     WHERE user_id=? AND purpose=? AND channel=?`,
    [userId, purpose, channel]
  );
}

module.exports = {
  ensureAccountRecoverySchema,
  generateRecoveryOtp,
  hashRecoveryOtp,
  safeHashEquals,
  challengeExpiry,
  getChallenge,
  saveChallenge,
  rollbackChallenge,
  incrementChallengeAttempts,
  clearChallenge,
};
