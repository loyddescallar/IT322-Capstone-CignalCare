const crypto=require('crypto');
const pool=require('../config/db');
let ready=false;
async function ensureTroubleshootOutcomeSchema(){if(ready)return;await pool.query(`CREATE TABLE IF NOT EXISTS troubleshoot_outcomes (
 id VARCHAR(36) PRIMARY KEY,user_id INTEGER NOT NULL,account_number VARCHAR(50) NULL,location VARCHAR(100) NULL,
 model_id VARCHAR(100) NOT NULL,model_name VARCHAR(160) NULL,issue_id VARCHAR(100) NOT NULL,issue_label VARCHAR(180) NOT NULL,
 outcome VARCHAR(30) NOT NULL,created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
 await pool.query(`CREATE INDEX IF NOT EXISTS idx_troubleshoot_outcomes_created ON troubleshoot_outcomes (created_at)`);
 await pool.query(`CREATE INDEX IF NOT EXISTS idx_troubleshoot_outcomes_issue ON troubleshoot_outcomes (issue_id,outcome)`);ready=true}
async function recordOutcome(data){await ensureTroubleshootOutcomeSchema();const id=crypto.randomUUID();await pool.query(`INSERT INTO troubleshoot_outcomes
 (id,user_id,account_number,location,model_id,model_name,issue_id,issue_label,outcome,created_at) VALUES (?,?,?,?,?,?,?,?,?,NOW())`,
 [id,data.userId,data.accountNumber||null,data.location||null,data.modelId,data.modelName||null,data.issueId,data.issueLabel,data.outcome]);return id}
async function getAllOutcomes(){await ensureTroubleshootOutcomeSchema();const [rows]=await pool.query(`SELECT * FROM troubleshoot_outcomes ORDER BY created_at DESC`);return rows}
module.exports={ensureTroubleshootOutcomeSchema,recordOutcome,getAllOutcomes};
