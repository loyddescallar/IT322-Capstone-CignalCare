// Release TLS tests: no database credentials or network access needed.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildPostgresTlsConfig } = require('../utils/postgresTlsConfig');

const base = 'postgresql://demo:fake@db.example.org:5432/postgres';
test('verified PostgreSQL TLS is mandatory and uses the original host', () => {
  const cfg = buildPostgresTlsConfig({ DATABASE_URL: base });
  assert.equal(cfg.ssl.rejectUnauthorized, true);
  assert.equal(cfg.ssl.ca, undefined);
  assert.equal(new URL(cfg.connectionString).hostname, 'db.example.org');
});
test('sslmode=require is upgraded to full verification, not allowed to override ssl', () => {
  for (const mode of ['require','verify-full']) {
    const cfg = buildPostgresTlsConfig({ DATABASE_URL: base + '?sslmode=' + mode + '&application_name=cignalcare' });
    const url = new URL(cfg.connectionString);
    assert.equal(url.searchParams.get('sslmode'), null);
    assert.equal(url.searchParams.get('application_name'), 'cignalcare');
    assert.deepEqual(cfg.ssl, { rejectUnauthorized: true });
  }
});
test('unsafe and ambiguous SSL URL overrides fail closed', () => {
  for (const query of [
    'sslmode=disable', 'sslmode=no-verify', 'sslmode=prefer', 'sslmode=verify-ca',
    'sslmode=require&sslmode=verify-full', 'ssl=true', 'sslrootcert=/tmp/ca.pem',
    'sslkey=/tmp/key.pem','sslcert=/tmp/cert.pem','sslpassword=abc'
  ]) {
    assert.throws(() => buildPostgresTlsConfig({ DATABASE_URL: base+'?'+query }), /ssl|SSL|certificate/i, query);
  }
});
test('global TLS verification bypass and invalid database URL are refused',()=>{
  assert.throws(() => buildPostgresTlsConfig({DATABASE_URL:base,NODE_TLS_REJECT_UNAUTHORIZED:'0'}), /not permitted/);
  assert.throws(() => buildPostgresTlsConfig({DATABASE_URL:'http://example.com'}), /PostgreSQL host/);
  assert.throws(() => buildPostgresTlsConfig({DATABASE_URL:'not a url'}), /valid PostgreSQL/);
  assert.throws(() => buildPostgresTlsConfig({}), /required/);
});
test('trusted CA is loaded only from a readable absolute PEM path',()=>{
  const cafile=path.resolve('/tmp/test-postgres-ca.pem');
  const ca='-----BEGIN CERTIFICATE-----\nTEST_CA\n-----END CERTIFICATE-----';
  const cfg=buildPostgresTlsConfig({DATABASE_URL:base,PG_TLS_CA_FILE:cafile},(p,enc)=>{
    assert.equal(p,cafile);assert.equal(enc,'utf8');return ca;
  });
  assert.equal(cfg.ssl.ca,ca);
  assert.throws(()=>buildPostgresTlsConfig({DATABASE_URL:base,PG_TLS_CA_FILE:'relative.crt'}),/absolute path/);
  assert.throws(()=>buildPostgresTlsConfig({DATABASE_URL:base,PG_TLS_CA_FILE:cafile},()=>{throw new Error('ENOENT')}),/Unable to read/);
  assert.throws(()=>buildPostgresTlsConfig({DATABASE_URL:base,PG_TLS_CA_FILE:cafile},()=> 'not pem'),/valid PEM/);
});
test('database adapter actually uses verified TLS helper',()=>{
  const source=fs.readFileSync(path.join(__dirname,'../config/db.js'),'utf8');
  assert.match(source, /\.\.\.buildPostgresTlsConfig\(process\.env\)/);
  assert.doesNotMatch(source, /rejectUnauthorized\s*:\s*false/);
});
