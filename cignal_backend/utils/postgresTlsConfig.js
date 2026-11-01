// PostgreSQL connections must verify the provider certificate AND hostname.
// URL sslmode options can overwrite pg's `ssl` object, so normalize them here.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const OVERRIDING_PARAMS = ['ssl', 'sslrootcert', 'sslcert', 'sslkey', 'sslpassword'];

function buildPostgresTlsConfig(env = process.env, readFile = fs.readFileSync) {
  const raw = String(env.DATABASE_URL || '').trim();
  if (!raw) throw new Error('DATABASE_URL is required for PostgreSQL.');
  let parsed;
  try { parsed = new URL(raw); }
  catch { throw new Error('DATABASE_URL is not a valid PostgreSQL connection URL.'); }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol) || !parsed.hostname) {
    throw new Error('DATABASE_URL must specify a PostgreSQL host.');
  }
  if (String(env.NODE_TLS_REJECT_UNAUTHORIZED || '').trim() === '0') {
    throw new Error('NODE_TLS_REJECT_UNAUTHORIZED=0 is not permitted for PostgreSQL.');
  }
  if (OVERRIDING_PARAMS.some((key) => parsed.searchParams.has(key))) {
    throw new Error('Remove SSL certificate options from DATABASE_URL; configure PG_TLS_CA_FILE instead.');
  }
  const modes = parsed.searchParams.getAll('sslmode');
  if (modes.length > 1 || (modes.length && !['require', 'verify-full'].includes(modes[0].toLowerCase()))) {
    throw new Error('Only sslmode=require or sslmode=verify-full is accepted; certificate and hostname verification are mandatory.');
  }
  // node-postgres replaces `ssl` when the connection string contains sslmode.
  // Convert `require` to full verification by removing it and setting ssl directly.
  parsed.searchParams.delete('sslmode');
  const ssl = { rejectUnauthorized: true };
  const caPath = String(env.PG_TLS_CA_FILE || '').trim();
  if (caPath) {
    if (!path.isAbsolute(caPath)) {
      throw new Error('PG_TLS_CA_FILE must be an absolute path to the trusted database CA certificate.');
    }
    let ca;
    try { ca = readFile(caPath, 'utf8'); }
    catch { throw new Error('Unable to read PG_TLS_CA_FILE; verify the trusted CA path is mounted.'); }
    if (typeof ca !== 'string' || ca.length > 1024 * 1024 ||
        !ca.includes('-----BEGIN CERTIFICATE-----') || !ca.includes('-----END CERTIFICATE-----')) {
      throw new Error('PG_TLS_CA_FILE must contain a valid PEM certificate chain.');
    }
    ssl.ca = ca;
  }
  return { connectionString: parsed.toString(), ssl };
}
module.exports = { buildPostgresTlsConfig };
