const pool = require("../config/db");

async function createRequest(data) {
  const sql = `
    INSERT INTO technician_requests (user_id, accountNumber, contactName, contactPhone, issueDescription)
    VALUES (?, ?, ?, ?, ?)
  `;
  const [result] = await pool.query(sql, [
    data.user_id,
    data.accountNumber,
    data.contactName,
    data.contactPhone,
    data.issueDescription
  ]);
  return result.insertId;
}

async function getRequestsByUser(userId) {
  const [rows] = await pool.query(
    `SELECT * FROM technician_requests WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

async function getAllRequests() {
  const [rows] = await pool.query(
    `SELECT tr.*, u.location
     FROM technician_requests tr
     LEFT JOIN users u ON u.accountNumber = tr.accountNumber
     ORDER BY tr.created_at DESC`
  );
  return rows;
}

async function updateRequestStatus(id, status, technicianName = null, adminNote = null) {
  let sql = "UPDATE technician_requests SET status = ?";
  const params = [status];
  if (technicianName !== null) { sql += ", technician_name = ?"; params.push(technicianName); }
  if (adminNote !== null) { sql += ", admin_note = ?"; params.push(adminNote); }
  sql += ", updated_at = NOW() WHERE id = ?";
  params.push(id);
  await pool.query(sql, params);
}

module.exports = {
  createRequest,
  getRequestsByUser,
  getAllRequests,
  updateRequestStatus
};
