// Explicit operator-only local/staging migration; never runs during API traffic.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  if (process.argv.includes('--apply') && String(process.env.NODE_ENV || '').toLowerCase() === 'production') {
    throw new Error('Refusing automatic production schema changes. Use the reviewed SQL editor migration.');
  }
  const pool = require('../config/db');
  const type = pool.driver;
  if (!['postgres','mysql'].includes(type)) throw new Error('Unknown database driver.');
  const file = path.resolve(__dirname,'../sql',`admin_profile_photos_${type}.sql`);
  const sql = fs.readFileSync(file,'utf8');
  if (!process.argv.includes('--apply')) {
    console.log(`PLAN ONLY: ${type} -> ${file}\nNo SQL was executed. For localhost MySQL only, run with --apply --confirm-local after verifying your .env. Use the SQL editor for remote staging/production.`);
    return;
  }
  if (type === 'postgres') throw new Error('For PostgreSQL, use the reviewed Supabase SQL editor migration instead.');
  const host = String(process.env.DB_HOST || '').trim().toLowerCase();
  if (!process.argv.includes('--confirm-local') || !['localhost','127.0.0.1','::1'].includes(host)) {
    throw new Error('Migration refused: --apply --confirm-local and a localhost MySQL DB_HOST are both required. Remote/staging DBs must be migrated through a reviewed SQL editor.');
  }
  await pool.query(sql);
  console.log('Local/staging admin profile photo table created or already exists. No subscriber data was modified.');
}
main().then(() => process.exit(0)).catch(error => {console.error(error.message);process.exit(1);});
