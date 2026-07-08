const pool = require("../config/db");

async function findByAccountName(accountName) {
  const [rows] = await pool.query(
    "SELECT * FROM users WHERE BINARY accountName = ? LIMIT 1",
    [accountName]
  );
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.accountName, u.accountNumber, u.ccaNumber, u.address,
            u.phone, u.location, u.email, u.role, u.status, u.created_at,
            lx.last_load as lastLoadDate
     FROM users u
     LEFT JOIN (
       SELECT account_number, MAX(transaction_date) as last_load
       FROM prepaid_transactions
       WHERE status = 'completed'
       GROUP BY account_number
     ) lx ON lx.account_number = u.accountNumber
     WHERE u.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function checkDuplicate(accountNumber, ccaNumber, excludeId = null) {
  let sql = "SELECT id FROM users WHERE (accountNumber = ? OR ccaNumber = ?)";
  const params = [accountNumber, ccaNumber];
  if (excludeId) {
    sql += " AND id <> ?";
    params.push(excludeId);
  }
  sql += " LIMIT 1";
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}

async function createUser(user) {
  const sql = `
    INSERT INTO users (accountName, accountNumber, ccaNumber, address, phone, location, role)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const [result] = await pool.query(sql, [
    user.accountName,
    user.accountNumber,
    user.ccaNumber,
    user.address,
    user.phone,
    user.location || "Balayan",
    user.role || "user",
  ]);
  return result.insertId;
}

async function findByAccountIdOrCca(accountId) {
  const [rows] = await pool.query(
    `SELECT u.id, u.accountName, u.accountNumber, u.ccaNumber, u.address,
            u.phone, u.location, u.role, u.status, u.created_at,
            lx.last_load as lastLoadDate
     FROM users u
     LEFT JOIN (
       SELECT account_number, MAX(transaction_date) as last_load
       FROM prepaid_transactions
       WHERE status = 'completed'
       GROUP BY account_number
     ) lx ON lx.account_number = u.accountNumber
     WHERE u.accountNumber = ? OR u.ccaNumber = ?
     LIMIT 1`,
    [accountId, accountId]
  );
  return rows[0] || null;
}

async function getAllUsers() {
  const [rows] = await pool.query(
    `SELECT u.id, u.accountName, u.accountNumber, u.ccaNumber, u.address,
            u.phone, u.location, u.role, u.status, u.created_at,
            lx.last_load as lastLoadDate
     FROM users u
     LEFT JOIN (
       SELECT account_number, MAX(transaction_date) as last_load
       FROM prepaid_transactions
       WHERE status = 'completed'
       GROUP BY account_number
     ) lx ON lx.account_number = u.accountNumber
     WHERE u.role = 'user'
     ORDER BY u.created_at DESC, u.id DESC`
  );
  return rows;
}

async function getCustomerStats() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [rows] = await pool.query(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN DATE_FORMAT(u.created_at, '%Y-%m') = ? THEN 1 ELSE 0 END) as thisMonth,
       SUM(CASE WHEN lx.last_load >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as activeCount,
       SUM(CASE WHEN lx.last_load >= DATE_SUB(NOW(), INTERVAL 60 DAY)
                 AND lx.last_load < DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as atRiskCount,
       SUM(CASE WHEN lx.last_load IS NULL
                 OR lx.last_load < DATE_SUB(NOW(), INTERVAL 60 DAY) THEN 1 ELSE 0 END) as inactiveCount
     FROM users u
     LEFT JOIN (
       SELECT account_number, MAX(transaction_date) as last_load
       FROM prepaid_transactions
       WHERE status = 'completed'
       GROUP BY account_number
     ) lx ON lx.account_number = u.accountNumber
     WHERE u.role = 'user'`,
    [thisMonth]
  );
  return rows[0];
}

async function updateUser(id, data) {
  const sql = `
    UPDATE users
    SET accountName = ?, accountNumber = ?, ccaNumber = ?, address = ?, phone = ?, location = ?, role = ?
    WHERE id = ?
  `;
  await pool.query(sql, [
    data.accountName,
    data.accountNumber,
    data.ccaNumber,
    data.address,
    data.phone,
    data.location || "Balayan",
    data.role || "user",
    id,
  ]);
}

async function deleteUser(id) {
  await pool.query("DELETE FROM users WHERE id = ?", [id]);
}

module.exports = {
  findByAccountName,
  findById,
  checkDuplicate,
  createUser,
  findByAccountIdOrCca,
  getAllUsers,
  getCustomerStats,
  updateUser,
  deleteUser,
};
