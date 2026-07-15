const pool = require('../config/db');

const TECHNICIAN_STATUSES = [
  'Submitted',
  'Under Review',
  'Scheduled',
  'Completed',
  'Cancelled',
];

let columnsReady = false;

const EXTRA_COLUMNS = [
  { name: 'source', sql: 'ALTER TABLE technician_requests ADD COLUMN source VARCHAR(80) DEFAULT NULL AFTER preferred_time' },
  { name: 'screen_issue', sql: 'ALTER TABLE technician_requests ADD COLUMN screen_issue VARCHAR(120) DEFAULT NULL AFTER source' },
  { name: 'screen_photo_url', sql: 'ALTER TABLE technician_requests ADD COLUMN screen_photo_url TEXT DEFAULT NULL AFTER screen_issue' },
];

function technicianEnumIsCurrent(column) {
  const columnType = String(column?.COLUMN_TYPE || '').toLowerCase();
  const defaultValue = String(column?.COLUMN_DEFAULT || '');

  return (
    TECHNICIAN_STATUSES.every((status) =>
      columnType.includes(`'${status.toLowerCase()}'`)
    ) &&
    !columnType.includes("'pending'") &&
    defaultValue === 'Submitted'
  );
}

async function ensureTechnicianStatusEnum(statusColumn) {
  if (technicianEnumIsCurrent(statusColumn)) return;

  await pool.query(
    "ALTER TABLE technician_requests MODIFY COLUMN status ENUM('Pending','Submitted','Under Review','Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Submitted'"
  );

  await pool.query(
    "UPDATE technician_requests SET status = 'Submitted' WHERE status = 'Pending'"
  );

  await pool.query(
    "ALTER TABLE technician_requests MODIFY COLUMN status ENUM('Submitted','Under Review','Scheduled','Completed','Cancelled') NOT NULL DEFAULT 'Submitted'"
  );
}

async function ensureTechnicianColumns() {
  if (columnsReady) return;

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'technician_requests'`
  );

  const existing = new Map(rows.map((row) => [row.COLUMN_NAME, row]));

  if (!existing.size) {
    throw new Error('technician_requests table is missing. Import the database schema first.');
  }

  for (const column of EXTRA_COLUMNS) {
    if (!existing.has(column.name)) {
      await pool.query(column.sql);
    }
  }

  await ensureTechnicianStatusEnum(existing.get('status'));
  columnsReady = true;
}

async function createRequest(data) {
  await ensureTechnicianColumns();

  const [result] = await pool.query(
    `INSERT INTO technician_requests
     (user_id, accountNumber, contactName, contactPhone, issueDescription,
      preferred_date, preferred_time, source, screen_issue, screen_photo_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.user_id,
      data.accountNumber,
      data.contactName,
      data.contactPhone,
      data.issueDescription,
      data.preferred_date || null,
      data.preferred_time || null,
      data.source || null,
      data.screen_issue || null,
      data.screen_photo_url || null,
    ]
  );

  return result.insertId;
}

async function getRequestsByUser(userId) {
  await ensureTechnicianColumns();
  const [rows] = await pool.query(
    'SELECT * FROM technician_requests WHERE user_id=? ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

async function getAllRequests() {
  await ensureTechnicianColumns();
  const [rows] = await pool.query(
    'SELECT tr.*,u.location FROM technician_requests tr LEFT JOIN users u ON u.id=tr.user_id ORDER BY tr.created_at DESC'
  );
  return rows;
}

async function getRequestById(id) {
  await ensureTechnicianColumns();
  const [rows] = await pool.query(
    'SELECT tr.*, u.accountName, u.accountNumber, u.location FROM technician_requests tr LEFT JOIN users u ON u.id = tr.user_id WHERE tr.id=? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function updateRequestStatus(id, status, technicianName = null, adminNote = null) {
  await ensureTechnicianColumns();

  if (!TECHNICIAN_STATUSES.includes(status)) {
    throw new Error('Invalid technician request status');
  }

  let sql = 'UPDATE technician_requests SET status=?';
  const params = [status];

  if (technicianName !== null) {
    sql += ',technician_name=?';
    params.push(technicianName);
  }

  if (adminNote !== null) {
    sql += ',admin_note=?';
    params.push(adminNote);
  }

  sql += ',updated_at=NOW() WHERE id=?';
  params.push(id);

  await pool.query(sql, params);
}

module.exports = {
  TECHNICIAN_STATUSES,
  createRequest,
  getRequestsByUser,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
  ensureTechnicianColumns,
};
