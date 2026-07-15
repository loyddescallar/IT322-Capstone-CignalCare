const pool = require("../config/db");

const TICKET_STATUSES = [
  "Submitted",
  "Under Review",
  "Job Order Assigned",
  "Resolved",
  "Archived",
];

let ticketWorkflowReady = false;

async function ensureTicketWorkflowSchema() {
  if (ticketWorkflowReady) return;

  const [columns] = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tickets'
      AND column_name = 'status'
    LIMIT 1
  `);

  if (!columns[0]) {
    throw new Error(
      "tickets.status column is missing. Import the database schema first."
    );
  }

  // Safe cleanup for any old values from a previous migration.
  await pool.query(`
    UPDATE tickets
    SET status = CASE
      WHEN status = 'Open' THEN 'Submitted'
      WHEN status = 'In Progress' THEN 'Under Review'
      WHEN status = 'Closed' THEN 'Archived'
      ELSE status
    END
    WHERE status IN ('Open', 'In Progress', 'Closed')
  `);

  ticketWorkflowReady = true;
}

async function createTicket(data) {
  await ensureTicketWorkflowSchema();

  const [result] = await pool.query(
    `
    INSERT INTO tickets (
      user_id,
      category,
      subject,
      status
    )
    VALUES (?, ?, ?, 'Submitted')
    `,
    [
      data.user_id,
      data.category,
      data.subject,
    ]
  );

  return result.insertId;
}

async function getTicketsByUser(userId) {
  await ensureTicketWorkflowSchema();

  const [rows] = await pool.query(
    `
    SELECT *
    FROM tickets
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows;
}

async function getAllTickets() {
  await ensureTicketWorkflowSchema();

  const [rows] = await pool.query(`
    SELECT
      t.*,
      u.accountName,
      u.accountNumber,
      u.location
    FROM tickets t
    LEFT JOIN users u
      ON u.id = t.user_id
    ORDER BY t.created_at DESC
  `);

  return rows;
}

async function getTicketById(id) {
  await ensureTicketWorkflowSchema();

  const [rows] = await pool.query(
    `
    SELECT
      t.*,
      u.accountName,
      u.accountNumber,
      u.location
    FROM tickets t
    LEFT JOIN users u
      ON u.id = t.user_id
    WHERE t.id = ?
    `,
    [id]
  );

  return rows[0] || null;
}

async function updateTicketStatus(id, status) {
  await ensureTicketWorkflowSchema();

  if (!TICKET_STATUSES.includes(status)) {
    throw new Error("Invalid ticket status");
  }

  const [result] = await pool.query(
    `
    UPDATE tickets
    SET
      status = ?,
      updated_at = NOW()
    WHERE id = ?
    `,
    [
      status,
      id,
    ]
  );

  return result.affectedRows;
}

async function archiveTicket(id) {
  return updateTicketStatus(id, "Archived");
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
