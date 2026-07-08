const pool = require("../config/db");

async function createTicket(ticket) {
  const sql = `INSERT INTO tickets (user_id, category, subject, status) VALUES (?, ?, ?, 'Open')`;
  const [result] = await pool.query(sql, [ticket.user_id, ticket.category, ticket.subject]);
  return result.insertId;
}

async function getTicketsByUser(userId) {
  const [rows] = await pool.query(
    "SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC",
    [userId]
  );
  return rows;
}

async function getAllTickets() {
  const [rows] = await pool.query(
    `SELECT t.*, u.accountName, u.accountNumber, u.location
     FROM tickets t
     LEFT JOIN users u ON u.id = t.user_id
     ORDER BY t.created_at DESC`
  );
  return rows;
}

async function getTicketById(id) {
  const [rows] = await pool.query(
    `SELECT t.*, u.accountName, u.accountNumber, u.location
     FROM tickets t
     LEFT JOIN users u ON u.id = t.user_id
     WHERE t.id = ?`,
    [id]
  );
  return rows[0] || null;
}

async function updateTicketStatus(id, status) {
  await pool.query(
    "UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?",
    [status, id]
  );
}

async function deleteTicket(id) {
  await pool.query("DELETE FROM tickets WHERE id = ?", [id]);
}

module.exports = {
  createTicket,
  getTicketsByUser,
  getAllTickets,
  updateTicketStatus,
  getTicketById,
  deleteTicket
};
