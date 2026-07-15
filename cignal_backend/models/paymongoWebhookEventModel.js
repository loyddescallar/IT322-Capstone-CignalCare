const pool = require("../config/db");

let tableReady = false;

async function ensurePayMongoWebhookEventTable() {
  if (tableReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS paymongo_webhook_events (
      event_id VARCHAR(180) PRIMARY KEY,
      event_type VARCHAR(120),
      payload_hash CHAR(64) NOT NULL,
      status VARCHAR(12) NOT NULL DEFAULT 'processing'
        CHECK (status IN ('processing', 'processed', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      first_received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      processed_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_paymongo_event_status
    ON paymongo_webhook_events (status)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_paymongo_payload_hash
    ON paymongo_webhook_events (payload_hash)
  `);

  tableReady = true;
}

async function claimPayMongoWebhookEvent({
  eventId,
  eventType,
  payloadHash,
}) {
  await ensurePayMongoWebhookEventTable();

  const [insertResult] = await pool.query(
    `
    INSERT INTO paymongo_webhook_events (
      event_id,
      event_type,
      payload_hash,
      status,
      attempts
    )
    VALUES (?, ?, ?, 'processing', 1)
    ON CONFLICT (event_id) DO NOTHING
    `,
    [
      eventId,
      eventType || null,
      payloadHash,
    ]
  );

  if (insertResult.affectedRows === 1) {
    return {
      shouldProcess: true,
      duplicate: false,
      status: "processing",
    };
  }

  const [rows] = await pool.query(
    `
    SELECT
      status,
      attempts,
      last_received_at
    FROM paymongo_webhook_events
    WHERE event_id = ?
    LIMIT 1
    `,
    [eventId]
  );

  const existing = rows[0];

  if (!existing) {
    return {
      shouldProcess: true,
      duplicate: false,
      status: "processing",
    };
  }

  if (existing.status === "processed") {
    await pool.query(
      `
      UPDATE paymongo_webhook_events
      SET
        attempts = attempts + 1,
        last_received_at = NOW()
      WHERE event_id = ?
      `,
      [eventId]
    );

    return {
      shouldProcess: false,
      duplicate: true,
      status: "processed",
    };
  }

  const [retryResult] = await pool.query(
    `
    UPDATE paymongo_webhook_events
    SET
      status = 'processing',
      attempts = attempts + 1,
      event_type = COALESCE(?, event_type),
      payload_hash = ?,
      error_message = NULL,
      last_received_at = NOW()
    WHERE event_id = ?
      AND (
        status = 'failed'
        OR last_received_at < NOW() - INTERVAL '5 minutes'
      )
    `,
    [
      eventType || null,
      payloadHash,
      eventId,
    ]
  );

  return {
    shouldProcess: retryResult.affectedRows === 1,
    duplicate: retryResult.affectedRows !== 1,
    status:
      retryResult.affectedRows === 1
        ? "processing"
        : existing.status,
  };
}

async function markPayMongoWebhookEventProcessed(eventId) {
  await ensurePayMongoWebhookEventTable();

  await pool.query(
    `
    UPDATE paymongo_webhook_events
    SET
      status = 'processed',
      processed_at = NOW(),
      error_message = NULL
    WHERE event_id = ?
    `,
    [eventId]
  );
}

async function markPayMongoWebhookEventFailed(
  eventId,
  errorMessage
) {
  await ensurePayMongoWebhookEventTable();

  await pool.query(
    `
    UPDATE paymongo_webhook_events
    SET
      status = 'failed',
      error_message = ?,
      last_received_at = NOW()
    WHERE event_id = ?
    `,
    [
      String(
        errorMessage ||
          "Unknown webhook processing error"
      ).slice(0, 2000),
      eventId,
    ]
  );
}

module.exports = {
  ensurePayMongoWebhookEventTable,
  claimPayMongoWebhookEvent,
  markPayMongoWebhookEventProcessed,
  markPayMongoWebhookEventFailed,
};
