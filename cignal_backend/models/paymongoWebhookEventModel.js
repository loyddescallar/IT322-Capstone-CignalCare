const pool = require('../config/db');

let tableReady = false;

async function ensurePayMongoWebhookEventTable() {
  if (tableReady) return;

  await pool.query(
    `CREATE TABLE IF NOT EXISTS paymongo_webhook_events (
       event_id VARCHAR(180) NOT NULL,
       event_type VARCHAR(120) DEFAULT NULL,
       payload_hash CHAR(64) NOT NULL,
       status ENUM('processing','processed','failed') NOT NULL DEFAULT 'processing',
       attempts INT NOT NULL DEFAULT 1,
       error_message TEXT DEFAULT NULL,
       first_received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
       last_received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
       processed_at DATETIME DEFAULT NULL,
       PRIMARY KEY (event_id),
       KEY idx_paymongo_event_status (status),
       KEY idx_paymongo_payload_hash (payload_hash)
     ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );

  tableReady = true;
}

async function claimPayMongoWebhookEvent({ eventId, eventType, payloadHash }) {
  await ensurePayMongoWebhookEventTable();

  const [insertResult] = await pool.query(
    `INSERT IGNORE INTO paymongo_webhook_events
     (event_id, event_type, payload_hash, status, attempts)
     VALUES (?, ?, ?, 'processing', 1)`,
    [eventId, eventType || null, payloadHash]
  );

  if (insertResult.affectedRows === 1) {
    return { shouldProcess: true, duplicate: false, status: 'processing' };
  }

  const [rows] = await pool.query(
    `SELECT status, attempts, last_received_at
     FROM paymongo_webhook_events
     WHERE event_id = ?
     LIMIT 1`,
    [eventId]
  );

  const existing = rows[0];

  if (!existing) {
    return { shouldProcess: true, duplicate: false, status: 'processing' };
  }

  if (existing.status === 'processed') {
    await pool.query(
      `UPDATE paymongo_webhook_events
       SET attempts = attempts + 1, last_received_at = NOW()
       WHERE event_id = ?`,
      [eventId]
    );

    return { shouldProcess: false, duplicate: true, status: 'processed' };
  }

  const [retryResult] = await pool.query(
    `UPDATE paymongo_webhook_events
     SET status = 'processing',
         attempts = attempts + 1,
         event_type = COALESCE(?, event_type),
         payload_hash = ?,
         error_message = NULL,
         last_received_at = NOW()
     WHERE event_id = ?
       AND (
         status = 'failed'
         OR last_received_at < DATE_SUB(NOW(), INTERVAL 5 MINUTE)
       )`,
    [eventType || null, payloadHash, eventId]
  );

  return {
    shouldProcess: retryResult.affectedRows === 1,
    duplicate: retryResult.affectedRows !== 1,
    status: retryResult.affectedRows === 1 ? 'processing' : existing.status,
  };
}

async function markPayMongoWebhookEventProcessed(eventId) {
  await ensurePayMongoWebhookEventTable();

  await pool.query(
    `UPDATE paymongo_webhook_events
     SET status = 'processed', processed_at = NOW(), error_message = NULL
     WHERE event_id = ?`,
    [eventId]
  );
}

async function markPayMongoWebhookEventFailed(eventId, errorMessage) {
  await ensurePayMongoWebhookEventTable();

  await pool.query(
    `UPDATE paymongo_webhook_events
     SET status = 'failed', error_message = ?, last_received_at = NOW()
     WHERE event_id = ?`,
    [String(errorMessage || 'Unknown webhook processing error').slice(0, 2000), eventId]
  );
}

module.exports = {
  ensurePayMongoWebhookEventTable,
  claimPayMongoWebhookEvent,
  markPayMongoWebhookEventProcessed,
  markPayMongoWebhookEventFailed,
};
