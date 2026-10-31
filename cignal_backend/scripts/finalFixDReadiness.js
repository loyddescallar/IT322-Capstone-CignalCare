'use strict';
/**
 * CignalCare+ Final Fix D: redacted, READ-ONLY readiness evidence.
 * Default: no network, no DB, no writes. --inventory: SELECT-only DB queries.
 * --probe-redis and --probe-cloudinary: explicitly authorized READ-ONLY API calls.
 * --output=report.json: only writes a sanitized report file (NOT env, secrets, URLs, or IDs).
 */
const fs = require('node:fs');
const path = require('node:path');
const { evaluate, classifyLegacyTotals } = require('../utils/finalFixDChecks');
const backendDir = path.join(__dirname, '..');
const defaults = { argv: process.argv.slice(2), env: process.env };
const allowedOptions = new Set(['--inventory', '--probe-redis', '--probe-cloudinary']);

function parseArgs(args) {
  const out = { inventory: false, redis: false, cloudinary: false, output: null };
  for (const arg of args) {
    if (arg === '--inventory') out.inventory = true;
    else if (arg === '--probe-redis') out.redis = true;
    else if (arg === '--probe-cloudinary') out.cloudinary = true;
    else if (arg.startsWith('--output=')) {
      if (out.output) throw new Error('Only one --output is allowed.');
      const output = arg.slice('--output='.length);
      if (!/^[A-Za-z0-9_-]{1,70}\.json$/.test(output)) throw new Error('Output filename must be a simple JSON name (no paths).');
      out.output = output;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  return out;
}

function jsonSafeError(error) {
  // NEVER echo raw error.message: cloud/DB libraries may include sensitive URLs.
  if (error && error.code === 'SCHEMA_NOT_READY') return 'Required database schema is not ready.';
  return 'Provider or database check failed. Inspect secure application logs privately.';
}
async function inventory(db) {
  const [missing] = await Promise.all([require('../utils/schemaSafety').scan(db)]);
  if (missing.length) return { status: 'SCHEMA_NOT_READY', missing_objects_count: missing.length };
  const [rows] = await db.query(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN attachment LIKE 'cld-auth-v1:%' THEN 1 ELSE 0 END), 0) AS protected,
      COALESCE(SUM(CASE WHEN attachment LIKE 'https://res.cloudinary.com/%' THEN 1 ELSE 0 END), 0) AS legacy_cloudinary,
      COALESCE(SUM(CASE WHEN attachment LIKE 'http%' AND attachment NOT LIKE 'https://res.cloudinary.com/%' THEN 1 ELSE 0 END), 0) AS other_remote,
      COALESCE(SUM(CASE WHEN attachment NOT LIKE 'cld-auth-v1:%' AND attachment NOT LIKE 'http%' THEN 1 ELSE 0 END), 0) AS local_or_unknown
    FROM ticket_messages WHERE attachment IS NOT NULL AND attachment <> ''
  `);
  const counts = classifyLegacyTotals(rows[0]);
  return {
    status: counts.legacy_cloudinary || counts.other_remote ? 'LEGACY_REMOTE_FILES_PRESENT' : 'INVENTORY_COMPLETE',
    ...counts,
    note: 'Counts only. Public Cloudinary URLs must be revoked or migrated separately; a protected API endpoint cannot revoke old URLs.'
  };
}

async function probeRedis() {
  const shared = require('../utils/sharedQuotaStore');
  let config;
  try { config = shared.getConfig(); } catch { return { status: 'INVALID_CONFIG' }; }
  if (!config) return { status: 'NOT_CONFIGURED' };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(config.url, {
      method:'POST', headers:{'Authorization':`Bearer ${config.token}`, 'Content-Type':'application/json'},
      body:JSON.stringify(['PING']), redirect:'error', signal:controller.signal,
    });
    if (!response.ok) return { status:'PROBE_FAILED', http_status:response.status };
    const body = await response.json();
    return {status: body?.result === 'PONG' ? 'READ_ONLY_PING_PASSED' : 'PROBE_FAILED',
      note:'Ping verifies endpoint reachability/credentials, not shared atomic EVAL behavior or rollout across replicas.'};
  } catch { return { status: 'PROBE_FAILED' }; }
  finally { clearTimeout(timeout); }
}

async function probeCloudinary() {
  const cloudinary = require('cloudinary').v2;
  const env = process.env;
  if (!['CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET'].every(k=>String(env[k]||'').trim())) {
    return {status:'NOT_CONFIGURED'};
  }
  cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME, api_key:env.CLOUDINARY_API_KEY, api_secret:env.CLOUDINARY_API_SECRET, secure:true});
  let timer;
  try {
    const result = await Promise.race([
      cloudinary.api.ping(),
      new Promise((_, reject)=>{timer=setTimeout(()=>reject(new Error('Timeout')), 7000);})
    ]);
    return {status: result && result.status === 'ok' ? 'READ_ONLY_PING_PASSED' : 'PROBE_FAILED',
      note:'Admin API ping does not test restricted PDF delivery or revoke legacy URLs.'};
  } catch { return {status:'PROBE_FAILED'}; }
  finally { clearTimeout(timer); }
}

async function main({argv,env} = defaults) {
  const opts = parseArgs(argv);
  // Match the backend's actual dotenv behavior, without printing file contents.
  const dotenv = require('dotenv');
  dotenv.config({ path: path.join(backendDir,'.env'), override:false, quiet:true });
  const report = {
    report_type:'CignalCare Final Fix D — Redacted Readiness',
    created_at_utc:new Date().toISOString(),
    notes:[
      'Configuration presence is NOT live-provider verification.',
      'This tool never changes database tables, provider assets, alert settings, or code.',
      'Historical Cloudinary PDFs require review only for legacy records; new chat uploads are photos only.',
      'Run the same checks against production/staging environment, not only local MySQL.',
    ],
    ...evaluate(env),
  };
  if (opts.inventory) {
    let db;
    try { db = require('../config/db'); report.attachment_inventory = await inventory(db); }
    catch (error) { report.attachment_inventory = {status:'UNAVAILABLE', reason:jsonSafeError(error)}; }
    finally { if (db && typeof db.end === 'function') try { await db.end(); } catch {} }
  } else report.attachment_inventory = { status:'NOT_RUN', note:'Run with --inventory for SELECT-only counts of legacy files.'};
  report.provider_probes = {
    redis: opts.redis ? await probeRedis() : {status:'NOT_RUN'},
    cloudinary: opts.cloudinary ? await probeCloudinary() : {status:'NOT_RUN'},
    alert_delivery: {status:'NOT_RUN',note:'Sending a real alert is intentionally outside this non-destructive audit.'},
    pdf_download: {status:'NOT_RUN',note:'No production PDF asset is fetched, downloaded, or uploaded.'},
  };
  // A production release cannot be approved by static checks or read-only ping alone.
  report.production_clearance = 'PENDING_LIVE_STAGING_VERIFICATION';
  console.log(JSON.stringify(report,null,2));
  if (opts.output) {
    const target = path.join(process.cwd(), opts.output);
    if (fs.existsSync(target)) throw new Error('Refusing to overwrite an existing report. Choose a different --output filename.');
    fs.writeFileSync(target, JSON.stringify(report,null,2)+'\n', { flag:'wx', mode:0o600 });
    console.error(`Redacted readiness report saved: ${opts.output}`);
  }
  return report;
}
if (require.main === module) main().catch(() => {console.error('Final Fix D check failed safely (no credentials printed).');process.exitCode=1;});
module.exports = { parseArgs, inventory, probeRedis, probeCloudinary, main };
