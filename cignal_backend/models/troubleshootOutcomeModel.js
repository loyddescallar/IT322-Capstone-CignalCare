const crypto = require('crypto');
const pool = require('../config/db');

let ready = false;

async function ensureTroubleshootOutcomeSchema() {
  if (ready) return;

  await pool.query(`CREATE TABLE IF NOT EXISTS troubleshoot_outcomes (
    id VARCHAR(36) PRIMARY KEY,
    user_id INTEGER NOT NULL,
    account_number VARCHAR(50) NULL,
    location VARCHAR(100) NULL,
    model_id VARCHAR(100) NOT NULL,
    model_name VARCHAR(160) NULL,
    issue_id VARCHAR(100) NOT NULL,
    issue_label VARCHAR(180) NOT NULL,
    outcome VARCHAR(30) NOT NULL,
    session_id VARCHAR(80) NULL,
    support_mode VARCHAR(30) NOT NULL DEFAULT 'full',
    is_final INTEGER NOT NULL DEFAULT 1,
    video_watched INTEGER NOT NULL DEFAULT 0,
    steps_completed INTEGER NOT NULL DEFAULT 0,
    total_steps INTEGER NOT NULL DEFAULT 0,
    last_step_id VARCHAR(180) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  // Keep older local MySQL and production PostgreSQL databases compatible.
  await pool.query(`ALTER TABLE troubleshoot_outcomes
    ADD COLUMN IF NOT EXISTS session_id VARCHAR(80) NULL,
    ADD COLUMN IF NOT EXISTS support_mode VARCHAR(30) NOT NULL DEFAULT 'full',
    ADD COLUMN IF NOT EXISTS is_final INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS video_watched INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS steps_completed INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_steps INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_step_id VARCHAR(180) NULL`);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_troubleshoot_outcomes_created ON troubleshoot_outcomes (created_at)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_troubleshoot_outcomes_issue ON troubleshoot_outcomes (issue_id,outcome)`
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_troubleshoot_outcomes_session ON troubleshoot_outcomes (session_id,support_mode)`
  );

  ready = true;
}

async function recordOutcome(data) {
  await ensureTroubleshootOutcomeSchema();
  const id = crypto.randomUUID();

  await pool.query(
    `INSERT INTO troubleshoot_outcomes
      (id,user_id,account_number,location,model_id,model_name,issue_id,issue_label,outcome,
       session_id,support_mode,is_final,video_watched,steps_completed,total_steps,last_step_id,created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
    [
      id,
      data.userId,
      data.accountNumber || null,
      data.location || null,
      data.modelId,
      data.modelName || null,
      data.issueId,
      data.issueLabel,
      data.outcome,
      data.sessionId || null,
      data.supportMode || 'full',
      data.isFinal === false ? 0 : 1,
      data.videoWatched ? 1 : 0,
      Math.max(0, Number(data.stepsCompleted || 0)),
      Math.max(0, Number(data.totalSteps || 0)),
      data.lastStepId || null,
    ]
  );

  return id;
}

async function getAllOutcomes() {
  await ensureTroubleshootOutcomeSchema();
  const [rows] = await pool.query(
    `SELECT * FROM troubleshoot_outcomes ORDER BY created_at DESC`
  );
  return rows;
}

module.exports = {
  ensureTroubleshootOutcomeSchema,
  recordOutcome,
  getAllOutcomes,
};
