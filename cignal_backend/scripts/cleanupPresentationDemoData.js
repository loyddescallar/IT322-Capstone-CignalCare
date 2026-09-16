const pool = require('../config/db');

const ACCOUNT_START = 50000001;
const ACCOUNT_END = 50000100;
const DEMO_MARKER = 'CIGNALCARE_DEMO_SEED_2026';
const PRODUCTION_CONFIRMATION = 'CIGNALCARE_PRESENTATION_DEMO_2026';

function envEnabled(name) {
  return String(process.env[name] || '').trim().toLowerCase() === 'true';
}

function assertDemoExecutionAllowed() {
  const highRiskDatabase =
    pool.driver === 'postgres' ||
    String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production';

  if (!highRiskDatabase) return;

  const explicitlyAllowed = envEnabled('ALLOW_PRESENTATION_DEMO_DATA');
  const confirmation =
    String(process.env.DEMO_DATA_CONFIRMATION || '').trim() === PRODUCTION_CONFIRMATION;

  if (!explicitlyAllowed || !confirmation) {
    throw new Error(
      'Presentation demo cleanup is blocked on PostgreSQL/production. ' +
      'Only enable it intentionally by setting ALLOW_PRESENTATION_DEMO_DATA=true ' +
      `and DEMO_DATA_CONFIRMATION=${PRODUCTION_CONFIRMATION}.`
    );
  }
}

async function ensureDemoRegistry(conn) {
  await conn.query(`CREATE TABLE IF NOT EXISTS presentation_demo_registry (
    seed_tag VARCHAR(80) NOT NULL,
    user_id INTEGER NOT NULL,
    account_number VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (seed_tag, user_id)
  )`);
}

async function getRegisteredDemoUsers(conn) {
  const [rows] = await conn.query(
    `SELECT u.id, u.accountNumber
     FROM users u
     INNER JOIN presentation_demo_registry r ON r.user_id = u.id
     WHERE r.seed_tag = ?
     ORDER BY u.id ASC`,
    [DEMO_MARKER]
  );
  return rows;
}

async function getLegacyLocalDemoUsers(conn) {
  const allowLegacy = envEnabled('ALLOW_LEGACY_DEMO_RANGE_CLEANUP');
  if (!allowLegacy || pool.driver !== 'mysql') return [];

  const [rows] = await conn.query(
    `SELECT id, accountNumber
     FROM users
     WHERE role='user'
       AND accountNumber >= ?
       AND accountNumber <= ?
     ORDER BY id ASC`,
    [String(ACCOUNT_START), String(ACCOUNT_END)]
  );

  if (!rows.length) return [];

  console.warn(
    'LEGACY DEMO CLEANUP ENABLED: using the old local-only Account Number range because no registry rows were found.'
  );

  return rows;
}

async function cleanup() {
  assertDemoExecutionAllowed();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    await ensureDemoRegistry(conn);

    let users = await getRegisteredDemoUsers(conn);
    let usedLegacyFallback = false;

    if (!users.length) {
      users = await getLegacyLocalDemoUsers(conn);
      usedLegacyFallback = users.length > 0;
    }

    if (!users.length) {
      await conn.rollback();
      console.log(
        'No registered CignalCare+ presentation demo subscribers were found. Nothing was deleted.'
      );
      if (pool.driver === 'mysql') {
        console.log(
          'If these records were created by the older seed script, set ALLOW_LEGACY_DEMO_RANGE_CLEANUP=true for one local cleanup run only.'
        );
      }
      return;
    }

    const ids = users.map((u) => u.id);
    const placeholders = ids.map(() => '?').join(',');

    await conn.query(
      `DELETE FROM ticket_messages
       WHERE ticket_id IN (SELECT id FROM tickets WHERE user_id IN (${placeholders}))
          OR sender_id IN (${placeholders})`,
      [...ids, ...ids]
    );
    await conn.query(`DELETE FROM notifications WHERE user_id IN (${placeholders})`, ids);
    await conn.query(`DELETE FROM account_recovery_challenges WHERE user_id IN (${placeholders})`, ids);
    await conn.query(`DELETE FROM load_requests WHERE user_id IN (${placeholders})`, ids);
    await conn.query(`DELETE FROM load_history WHERE user_id IN (${placeholders})`, ids);
    await conn.query(`DELETE FROM prepaid_transactions WHERE user_id IN (${placeholders})`, ids);
    await conn.query(`DELETE FROM prepaid_accounts WHERE user_id IN (${placeholders})`, ids);
    await conn.query(`DELETE FROM troubleshoot_outcomes WHERE user_id IN (${placeholders})`, ids);
    await conn.query(`DELETE FROM technician_requests WHERE user_id IN (${placeholders})`, ids);
    await conn.query(`DELETE FROM tickets WHERE user_id IN (${placeholders})`, ids);
    await conn.query(
      `DELETE FROM support_incidents
       WHERE id = 'demo-incident-balayan-weak-signal'
          OR notes LIKE ?`,
      [`%${DEMO_MARKER}%`]
    );
    await conn.query(`DELETE FROM users WHERE id IN (${placeholders})`, ids);
    await conn.query(
      `DELETE FROM presentation_demo_registry WHERE seed_tag = ?`,
      [DEMO_MARKER]
    );

    await conn.commit();

    console.log(
      `Removed ${users.length} synthetic CignalCare+ presentation subscribers and their related demo activity.`
    );
    if (usedLegacyFallback) {
      console.log(
        'Legacy local demo records were removed. Unset ALLOW_LEGACY_DEMO_RANGE_CLEANUP now.'
      );
    }
  } catch (error) {
    try {
      await conn.rollback();
    } catch (_rollbackError) {
      // The original cleanup error is more important.
    }
    console.error('DEMO CLEANUP FAILED:', error);
    process.exitCode = 1;
  } finally {
    conn.release();
    await pool.end();
  }
}

cleanup();
