const pool = require("../config/db");

async function addLoadHistory(entry) {
  const sql = `INSERT INTO load_history (user_id, accountNumber, loadAmount, description, status)
    VALUES (?, ?, ?, ?, ?)`;
  const [result] = await pool.query(sql, [
    entry.user_id,
    entry.accountNumber,
    entry.loadAmount,
    entry.description || null,
    entry.status || "completed"
  ]);
  return result.insertId;
}

async function getLoadHistoryByUser(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM load_history WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows;
}

async function getAllLoadHistory() {
  const [rows] = await pool.query(
    `SELECT lh.*, u.accountName
     FROM load_history lh
     LEFT JOIN users u ON u.id = lh.user_id
     ORDER BY lh.created_at DESC`
  );
  return rows;
}

async function getAllPrepaidTransactions() {
  const [rows] = await pool.query(
    `SELECT pt.*, pp.plan_name, pp.validity_days
     FROM prepaid_transactions pt
     LEFT JOIN prepaid_plans pp ON pp.id = pt.plan_id
     ORDER BY pt.transaction_date DESC`
  );
  return rows;
}

async function updateLoadStatus(id, status) {
  await pool.query(
    "UPDATE load_history SET status = ? WHERE id = ?",
    [status, id]
  );
}

module.exports = {
  addLoadHistory,
  getLoadHistoryByUser,
  getAllLoadHistory,
  getAllPrepaidTransactions,
  updateLoadStatus
};
