const pool = require('../config/db');

const TICKET_STATUSES = [
  'Submitted',
  'Under Review',
  'Job Order Assigned',
  'Resolved',
  'Archived',
];

let ticketWorkflowReady = false;

function ticketEnumIsCurrent(column) {
  const columnType = String(column?.COLUMN_TYPE || '').toLowerCase();
  const defaultValue = String(column?.COLUMN_DEFAULT || '');

  return (
    TICKET_STATUSES.every((status) =>
      columnType.includes(`'${status.toLowerCase()}'`)
    ) &&
    !columnType.includes("'open'") &&
    !columnType.includes("'in progress'") &&
    !columnType.includes("'closed'") &&
    defaultValue === 'Submitted'
  );
}

async function ensureTicketWorkflowSchema() {
  if (ticketWorkflowReady) return;

  const [columns] = await pool.query(
    `SELECT COLUMN_TYPE, COLUMN_DEFAULT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'tickets'
       AND COLUMN_NAME = 'status'
     LIMIT 1`
  );

  if (!columns[0]) {
    throw new Error('tickets.status column is missing. Import the database schema first.');
  }

  if (!ticketEnumIsCurrent(columns[0])) {
    // Convert old workflow values safely before enforcing the current ENUM.
    await pool.query(
      `ALTER TABLE tickets
       MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'Submitted'`
    );

    await pool.query(
      `UPDATE tickets
       SET status = CASE
         WHEN status = 'Open' THEN 'Submitted'
         WHEN status = 'In Progress' THEN 'Under Review'
         WHEN status = 'Closed' THEN 'Archived'
         WHEN status IN ('Submitted','Under Review','Job Order Assigned','Resolved','Archived') THEN status
         ELSE 'Submitted'
       END`
    );

    await pool.query(
      `ALTER TABLE tickets
       MODIFY COLUMN status ENUM('Submitted','Under Review','Job Order Assigned','Resolved','Archived')
       NOT NULL DEFAULT 'Submitted'`
    );
  }

  ticketWorkflowReady = true;
}

async function createTicket(data) {
  await ensureTicketWorkflowSchema();

  const [result] = await pool.query(
    `INSERT INTO tickets (user_id, category, subject, status)
     VALUES (?, ?, ?, 'Submitted')`,
    [data.user_id, data.category, data.subject]
  );

  return result.insertId;
}

async function getTicketsByUser(userId) {
  await ensureTicketWorkflowSchema();

  const [rows] = await pool.query(
    `SELECT *
     FROM tickets
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    [userId]
  );

  return rows;
}

async function getAllTickets() {
  await ensureTicketWorkflowSchema();

  const [rows] = await pool.query(
    `SELECT t.*, u.accountName, u.accountNumber, u.location
     FROM tickets t
     LEFT JOIN users u ON u.id = t.user_id
     ORDER BY t.created_at DESC`
  );

  return rows;
}

async function getTicketById(id) {
  await ensureTicketWorkflowSchema();

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
  await ensureTicketWorkflowSchema();

  if (!TICKET_STATUSES.includes(status)) {
    throw new Error('Invalid ticket status');
  }

  const [result] = await pool.query(
    `UPDATE tickets
     SET status = ?, updated_at = NOW()
     WHERE id = ?`,
    [status, id]
  );

  return result.affectedRows;
}

async function archiveTicket(id) {
  return updateTicketStatus(id, 'Archived');
}

module.exports = {
  TICKET_STATUSES,
  ensureTicketWorkflowSchema,
  createTicket,
  getTicketsByUser,
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  archiveTicket,
};
