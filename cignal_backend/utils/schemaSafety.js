'use strict';
// CignalCare C2: runtime may INSPECT schema, never alter it. Only the dedicated
// operator-controlled migration CLI enters the explicit migration context.
const { AsyncLocalStorage } = require('node:async_hooks');
const migrationScope = new AsyncLocalStorage();
const requirements = Object.freeze({"account":{"users":["must_change_password","temporary_password_expires_at","recovery_code_hash","recovery_code_issued_at","auth_session_version","email_verified_at","recovery_phone","recovery_phone_verified_at","email_verification_code_hash","email_verification_expires_at","email_verification_attempts","email_verification_last_sent_at","password_reset_code_hash","password_reset_expires_at","password_reset_attempts","password_reset_last_sent_at","terms_version","terms_accepted_at"]},"load_requests":{"load_requests":["plan_id","payment_status","paymongo_checkout_session_id","paymongo_checkout_url","paymongo_payment_intent_id","paymongo_payment_id","paymongo_payment_method","paymongo_fee","paymongo_net_amount","payment_completed_at","fulfilled_at"]},"ticket_workflow":{"tickets":["status"]},"technician":{"technician_requests":["source","screen_issue","screen_photo_url","service_address","latitude","longitude","status"]},"admin_security":{"users":["recovery_phone","recovery_phone_verified_at"],"admin_security":["user_id","username","totp_secret_enc","totp_enabled","session_version","failed_attempts","locked_until","last_login_at","last_password_change_at","created_at","updated_at"],"admin_recovery_codes":["code_id","user_id","code_hash","used_at","created_at"],"admin_audit_logs":["event_id","user_id","action","ip_address","user_agent","details","created_at"]},"account_recovery":{"account_recovery_challenges":["user_id","purpose","channel","code_hash","target_value","expires_at","attempts","last_sent_at","created_at"]},"payment_webhooks":{"paymongo_webhook_events":["event_id","event_type","payload_hash","status","attempts","error_message","first_received_at","last_received_at","processed_at"]},"incidents":{"support_incidents":["id","issue_key","issue_label","location","status","report_count","distinct_subscribers","first_reported_at","last_reported_at","confirmed_at","resolved_at","dismissed_at","confirmed_by","notes","created_at","updated_at"],"tickets":["incident_id"],"technician_requests":["incident_id"]},"troubleshoot_outcomes":{"troubleshoot_outcomes":["id","user_id","account_number","location","model_id","model_name","issue_id","issue_label","outcome","session_id","support_mode","is_final","video_watched","steps_completed","total_steps","last_step_id","created_at"]},"service_payments":{"service_payments":["reference_no","request_hash","user_id","account_number","account_name","service_type","description","amount","payment_method","external_reference","technician_request_id","processed_by","transaction_date"]},"messages":{"ticket_messages":["attachment","attachment_type"]},"prepaid_plans":{"prepaid_plans":["channels_json"]}});
const checked = new WeakMap();

function inMigrationContext() { return migrationScope.getStore() === true; }
function withMigrationContext(callback) {
  // Not exposed through HTTP. Caller must be the dedicated operator script.
  return migrationScope.run(true, callback);
}
function readSchema(schema, dbDriver) {
  if (dbDriver === 'postgres') return 'public';
  if (dbDriver === 'mysql') {
    const name = String(process.env.DB_NAME || '').trim();
    if (!name) throw new Error('DB_NAME is required for MySQL schema verification');
    return name;
  }
  throw new Error(`Unknown database driver: ${dbDriver}`);
}
async function scan(pool, scopeNames = Object.keys(requirements)) {
  const names = Array.isArray(scopeNames) ? scopeNames : [scopeNames];
  const driver = pool.driver;
  const schema = readSchema(null, driver);
  const missing = [];
  const tables = new Map();
  for (const scope of names) {
    const req = requirements[scope];
    if (!req) throw new Error(`Unknown schema scope: ${scope}`);
    for (const [table, columns] of Object.entries(req)) {
      if (!tables.has(table)) tables.set(table, new Set());
      for (const column of columns) tables.get(table).add(column);
    }
  }
  for (const [table, needed] of tables) {
    const [rows] = await pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = ? AND table_name = ?`,
      [schema, table]
    );
    const have = new Set((rows || []).map(r => String(r.column_name || '').toLowerCase()));
    if (!have.size) { missing.push(`${table} (table absent)`); continue; }
    for (const column of needed) if (!have.has(column.toLowerCase())) missing.push(`${table}.${column}`);
  }
  return missing;
}
async function assertSchema(pool, scope) {
  if (inMigrationContext()) throw new Error('Schema assertions belong outside the migration context');
  let verified = checked.get(pool);
  if (!verified) { verified = new Set(); checked.set(pool, verified); }
  if (verified.has(scope)) return;
  const missing = await scan(pool, scope);
  if (missing.length) {
    const error = new Error(`SCHEMA_NOT_READY (${scope}): ${missing.join(', ')}. Run the reviewed C2 staging migration before starting API traffic.`);
    error.code = 'SCHEMA_NOT_READY';
    error.missing = missing;
    throw error;
  }
  verified.add(scope);
}
module.exports = { requirements, scan, assertSchema, inMigrationContext, withMigrationContext };
