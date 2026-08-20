const pool = require('../config/db');

const ALLOWED_LOCATIONS = ['Balayan', 'Calaca', 'Lian', 'Calatagan', 'Nasugbu', 'Lemery'];
let accountSchemaReady = false;

async function ensureAccountSchema() {
  if (accountSchemaReady) return;
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE`);
  accountSchemaReady = true;
}

function normalizeLocation(location) {
  const value = String(location || '').trim();
  if (!value) return 'Balayan';
  if (value.toLowerCase().includes('calaca')) return 'Calaca';
  const matched = ALLOWED_LOCATIONS.find((item) => item.toLowerCase() === value.toLowerCase());
  return matched || 'Balayan';
}

function normalizeCustomerStatus(status) {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'archived') return 'archived';
  if (value === 'inactive') return 'inactive';
  return 'active';
}

async function findForAdminLogin(accountName, accountId) {
  await ensureAccountSchema();
  const [rows] = await pool.query(
    `SELECT * FROM users
     WHERE BINARY accountName = ?
       AND (accountNumber = ? OR ccaNumber = ?)
       AND role = 'admin'
       AND COALESCE(status, 'active') = 'active'
     LIMIT 1`,
    [accountName, accountId, accountId]
  );
  return rows[0] || null;
}

async function findByAccountNumber(accountNumber) {
  await ensureAccountSchema();
  const [rows] = await pool.query(
    `SELECT * FROM users
     WHERE accountNumber = ?
       AND role = 'user'
       AND COALESCE(status, 'active') = 'active'
     LIMIT 1`,
    [accountNumber]
  );
  return rows[0] || null;
}

async function findById(id) {
  await ensureAccountSchema();
  const [rows] = await pool.query(
    `SELECT u.*, lx.last_load as lastLoadDate
     FROM users u
     LEFT JOIN (
       SELECT account_number, MAX(transaction_date) as last_load
       FROM prepaid_transactions
       WHERE status='completed'
       GROUP BY account_number
     ) lx ON lx.account_number = u.accountNumber
     WHERE u.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findByAccountIdOrCca(accountId) {
  await ensureAccountSchema();
  const [rows] = await pool.query(
    `SELECT u.*, lx.last_load as lastLoadDate
     FROM users u
     LEFT JOIN (
       SELECT account_number, MAX(transaction_date) as last_load
       FROM prepaid_transactions
       WHERE status='completed'
       GROUP BY account_number
     ) lx ON lx.account_number = u.accountNumber
     WHERE (u.accountNumber = ? OR u.ccaNumber = ?)
       AND COALESCE(u.status, 'active') <> 'archived'
     LIMIT 1`,
    [accountId, accountId]
  );
  return rows[0] || null;
}

async function getAllUsers(status = 'active') {
  await ensureAccountSchema();
  const normalizedStatus = String(status || 'active').trim().toLowerCase();
  let statusSql = `AND COALESCE(u.status, 'active') <> 'archived'`;
  if (normalizedStatus === 'archived') statusSql = `AND COALESCE(u.status, 'active') = 'archived'`;
  else if (normalizedStatus === 'all') statusSql = '';

  const [rows] = await pool.query(
    `SELECT u.*, lx.last_load as lastLoadDate
     FROM users u
     LEFT JOIN (
       SELECT account_number, MAX(transaction_date) as last_load
       FROM prepaid_transactions
       WHERE status='completed'
       GROUP BY account_number
     ) lx ON lx.account_number = u.accountNumber
     WHERE u.role = 'user' ${statusSql}
     ORDER BY u.created_at DESC`
  );
  return rows;
}

async function getCustomerStats() {
  await ensureAccountSchema();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [rows] = await pool.query(
    `SELECT COUNT(*) as allCustomers,
      SUM(CASE WHEN COALESCE(u.status, 'active') <> 'archived' THEN 1 ELSE 0 END) as total,
      SUM(CASE WHEN COALESCE(u.status, 'active') = 'archived' THEN 1 ELSE 0 END) as archivedCount,
      SUM(CASE WHEN COALESCE(u.status, 'active') <> 'archived' AND DATE_FORMAT(u.created_at,'%Y-%m')=? THEN 1 ELSE 0 END) as thisMonth,
      SUM(CASE WHEN COALESCE(u.status, 'active') <> 'archived' AND lx.last_load >= DATE_SUB(NOW(),INTERVAL 30 DAY) THEN 1 ELSE 0 END) as activeCount,
      SUM(CASE WHEN COALESCE(u.status, 'active') <> 'archived' AND lx.last_load >= DATE_SUB(NOW(),INTERVAL 60 DAY) AND lx.last_load < DATE_SUB(NOW(),INTERVAL 30 DAY) THEN 1 ELSE 0 END) as atRiskCount,
      SUM(CASE WHEN COALESCE(u.status, 'active') <> 'archived' AND (lx.last_load IS NULL OR lx.last_load < DATE_SUB(NOW(),INTERVAL 60 DAY)) THEN 1 ELSE 0 END) as inactiveCount
     FROM users u
     LEFT JOIN (
       SELECT account_number, MAX(transaction_date) as last_load
       FROM prepaid_transactions WHERE status='completed' GROUP BY account_number
     ) lx ON lx.account_number = u.accountNumber
     WHERE u.role='user'`,
    [thisMonth]
  );
  const stats = rows[0] || {};
  return {
    allCustomers: Number(stats.allCustomers || 0), total: Number(stats.total || 0),
    archivedCount: Number(stats.archivedCount || 0), thisMonth: Number(stats.thisMonth || 0),
    activeCount: Number(stats.activeCount || 0), atRiskCount: Number(stats.atRiskCount || 0),
    inactiveCount: Number(stats.inactiveCount || 0),
  };
}

async function createUser(data) {
  await ensureAccountSchema();
  const [result] = await pool.query(
    `INSERT INTO users
     (accountName, accountNumber, ccaNumber, address, phone, location, email, password_hash, must_change_password, role, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.accountName, data.accountNumber, data.ccaNumber, data.address || '', data.phone || '',
      normalizeLocation(data.location), data.email || null, data.password_hash || null,
      Boolean(data.must_change_password), data.role || 'user', normalizeCustomerStatus(data.status)]
  );
  return result.insertId;
}

async function bulkCreateUsers(rows) {
  await ensureAccountSchema();
  if (!rows.length) return 0;
  const values = rows.map((data) => [
    data.accountName, data.accountNumber, data.ccaNumber, data.address || '', data.phone || '',
    normalizeLocation(data.location), data.email || null, data.password_hash || null,
    Boolean(data.must_change_password), 'user', 'active',
  ]);
  const [result] = await pool.query(
    `INSERT INTO users
     (accountName, accountNumber, ccaNumber, address, phone, location, email, password_hash, must_change_password, role, status)
     VALUES ?`,
    [values]
  );
  return Number(result.affectedRows || rows.length);
}

async function updateUser(id, data) {
  await ensureAccountSchema();
  await pool.query(
    `UPDATE users
     SET accountName=?, address=?, phone=?, email=?, location=?, role=?, updated_at = NOW()
     WHERE id=?`,
    [data.accountName, data.address || '', data.phone || '', data.email || null,
      normalizeLocation(data.location), data.role || 'user', id]
  );
}

async function setPassword(id, passwordHash, mustChangePassword) {
  await ensureAccountSchema();
  const [result] = await pool.query(
    `UPDATE users SET password_hash=?, must_change_password=?, updated_at=NOW() WHERE id=?`,
    [passwordHash, Boolean(mustChangePassword), id]
  );
  return result.affectedRows;
}

async function archiveUser(id) {
  const [result] = await pool.query(`UPDATE users SET status='archived', updated_at=NOW() WHERE id=? AND role='user'`, [id]);
  return result.affectedRows;
}

async function restoreUser(id) {
  const [result] = await pool.query(
    `UPDATE users SET status='active', updated_at=NOW() WHERE id=? AND role='user' AND COALESCE(status,'active')='archived'`, [id]
  );
  return result.affectedRows;
}

async function checkDuplicate(accountNumber, ccaNumber, excludeId = null) {
  let sql = `SELECT id, accountName, accountNumber, ccaNumber, status FROM users WHERE (accountNumber=? OR ccaNumber=?)`;
  const params = [accountNumber, ccaNumber];
  if (excludeId) { sql += ' AND id<>?'; params.push(excludeId); }
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function getIdentifierRows() {
  const [rows] = await pool.query(`SELECT id, accountNumber, ccaNumber, status FROM users WHERE role='user'`);
  return rows;
}

module.exports = {
  ALLOWED_LOCATIONS, ensureAccountSchema, normalizeLocation, findForAdminLogin, findByAccountNumber,
  findById, findByAccountIdOrCca, getAllUsers, getCustomerStats, createUser, bulkCreateUsers,
  updateUser, setPassword, archiveUser, restoreUser, checkDuplicate, getIdentifierRows,
};
