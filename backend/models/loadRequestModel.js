const db = require("../config/db");

const VALID_STATUSES = ["Received", "Under Review", "Attending", "Completed", "Rejected"];

function normalizeStatus(status) {
  if (!status) return "Received";
  const map = {
    pending: "Received",
    approved: "Completed",
    rejected: "Rejected",
    received: "Received",
    "under review": "Under Review",
    attending: "Attending",
    completed: "Completed",
  };
  const normalized = map[String(status).trim().toLowerCase()] || status;
  return VALID_STATUSES.includes(normalized) ? normalized : "Received";
}

async function createLoadRequest(data) {
  const referenceNo = data.reference_no || data.reference_number || null;
  const receiptPhoto = data.receipt_photo || data.receipt_image || null;

  const sql = `
    INSERT INTO load_requests
      (user_id, account_number, account_name, plan_name, amount, payment_method,
       reference_no, receipt_photo, screen_photo, diagnostic_result, status,
       location, admin_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, [
    data.user_id || null,
    data.account_number || data.accountNumber || null,
    data.account_name || data.accountName || null,
    data.plan_name || data.planName || `Load ${data.amount || data.loadAmount || ""}`,
    data.amount || data.loadAmount || 0,
    data.payment_method || data.paymentMethod || null,
    referenceNo,
    receiptPhoto,
    data.screen_photo || null,
    data.diagnostic_result || data.diagnosticResult || null,
    normalizeStatus(data.status),
    data.location || "Balayan",
    data.admin_note || null,
  ]);

  return result.insertId;
}

async function getUserLoadRequests(userId) {
  const [rows] = await db.query(
    "SELECT * FROM load_requests WHERE user_id = ? ORDER BY created_at DESC, id DESC",
    [userId]
  );
  return rows;
}

async function getUserLoadRequestsByAccount(accountNumber) {
  const [rows] = await db.query(
    "SELECT * FROM load_requests WHERE account_number = ? ORDER BY created_at DESC, id DESC",
    [accountNumber]
  );
  return rows;
}

async function getAllLoadRequests() {
  const [rows] = await db.query("SELECT * FROM load_requests ORDER BY created_at DESC, id DESC");
  return rows;
}

async function getLoadRequestById(id) {
  const [rows] = await db.query("SELECT * FROM load_requests WHERE id = ? LIMIT 1", [id]);
  return rows[0] || null;
}

async function updateStatus(id, status, adminNote = null) {
  const [result] = await db.query(
    "UPDATE load_requests SET status = ?, admin_note = ?, updated_at = NOW() WHERE id = ?",
    [normalizeStatus(status), adminNote, id]
  );
  return result;
}

async function addNotification({ user_id, account_number, type, message, related_id }) {
  await db.query(
    `INSERT INTO notifications (user_id, account_number, type, message, related_id)
     VALUES (?, ?, ?, ?, ?)`,
    [user_id || null, account_number || null, type || "info", message, related_id || null]
  );
}

module.exports = {
  VALID_STATUSES,
  normalizeStatus,
  createLoadRequest,
  getUserLoadRequests,
  getUserLoadRequestsByAccount,
  getAllLoadRequests,
  getLoadRequestById,
  updateStatus,
  addNotification,
};
