'use strict';
// STAGING-ONLY manual migration of the exact pre-C2 compatibility statements.
// No HTTP route uses this entrypoint. DO NOT run against production.
// Do not initialize a database connection when printing the offline plan.
let pool = null;
const {scan, requirements, withMigrationContext} = require('../utils/schemaSafety');
const VERSION = 'c2-2026-10-31-runtime-schema-separation-v1';
const BASE_TABLES = {core: {
  users: ['id'], tickets: ['id'], technician_requests: ['id'],
  load_requests: ['id'], ticket_messages: ['id'], prepaid_plans: ['id']
}};
async function checkBase() {
  const schema = pool.driver === 'postgres' ? 'public' : String(process.env.DB_NAME || '').trim();
  if (!schema) throw new Error('DB_NAME required for MySQL');
  const missing=[];
  for (const [table, cols] of Object.entries(BASE_TABLES.core)) {
    const [rows]=await pool.query('SELECT column_name FROM information_schema.columns WHERE table_schema=? AND table_name=?',[schema,table]);
    const present=new Set(rows.map(r=>String(r.column_name).toLowerCase()));
    for(const c of cols) if(!present.has(c)) missing.push(`${table}.${c}`);
  }
  if(missing.length) throw new Error(`Baseline tables missing: ${missing.join(', ')}. Restore the original schema before C2.`);
}
const TASKS = [
  ['Account / session columns','../models/userModel','ensureAccountSchema'],
  ['Admin 2FA / audit tables','../models/adminSecurityModel','ensureAdminSecuritySchema'],
  ['Recovery challenges','../models/accountRecoveryModel','ensureAccountRecoverySchema'],
  ['Load request / payment columns','../models/loadRequestModel','ensureLoadRequestColumns'],
  ['Ticket legacy status cleanup','../models/ticketModel','ensureTicketWorkflowSchema'],
  ['Technician columns / legacy status cleanup','../models/technicianModel','ensureTechnicianColumns'],
  ['PayMongo webhook idempotency table','../models/paymongoWebhookEventModel','ensurePayMongoWebhookEventTable'],
  ['Ticket message attachments','../controllers/messageController','ensureMessageSchema'],
  ['Prepaid plan channels','../controllers/loadController','ensurePlanColumns'],
  ['Incident tables / keys','../models/incidentModel','ensureIncidentSchema'],
  ['Troubleshooting outcomes','../models/troubleshootOutcomeModel','ensureTroubleshootOutcomeSchema'],
];
async function main() {
  const args=process.argv.slice(2);
  const applying=args.includes('--apply');
  if(args.length===0 || args.includes('--plan')) {
    console.log('C2 migration plan — NO DATABASE CHANGES');
    for (const [label] of TASKS) console.log(` - ${label}`);
    console.log('Run --check to inspect the configured database (read-only).');
    console.log('A staging apply requires --apply --target=staging --backup-confirmed --approve-ddl');
    return;
  }
  if(args.includes('--check') && !applying) {
    pool = require('../config/db');
    await checkBase();
    const missing=await scan(pool);
    if(missing.length) { console.error('SCHEMA_NOT_READY:', missing.join(', ')); process.exitCode=2; }
    else console.log('SCHEMA READ-ONLY CHECK PASSED: required columns/tables present.');
    return;
  }
  if(!applying || !args.includes('--target=staging') || !args.includes('--backup-confirmed') || !args.includes('--approve-ddl')) {
    throw new Error('Unsafe migration invocation. Production apply is intentionally blocked. Require --apply --target=staging --backup-confirmed --approve-ddl.');
  }
  if(String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error('C2 staging migration cannot run with NODE_ENV=production.');
  }
  pool = require('../config/db');
  await checkBase();
  console.log('Applying C2 legacy bootstrap on STAGING. SQL DDL and data repairs are NOT atomic.');
  await withMigrationContext(async()=>{
    for (const [label,modulePath,name] of TASKS) {
      console.log('Migration step:',label);
      await require(modulePath)[name]();
    }
    await pool.query(`CREATE TABLE IF NOT EXISTS cignalcare_schema_migrations (
      version VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const [old]=await pool.query('SELECT version FROM cignalcare_schema_migrations WHERE version=? LIMIT 1',[VERSION]);
    if (!old.length) await pool.query('INSERT INTO cignalcare_schema_migrations (version) VALUES (?)',[VERSION]);
  });
  const missing=await scan(pool);
  if(missing.length) throw new Error('Migration incomplete, missing: '+missing.join(', '));
  console.log('C2 STAGING MIGRATION COMPLETE; verify application flows and backups before planning production rollout.');
}
if (require.main===module) {
 main().catch(error=>{console.error('C2 MIGRATION ERROR:',error.message);process.exitCode=1;})
 .finally(()=>pool ? pool.end() : undefined);
}
module.exports = {main, TASKS, checkBase};
