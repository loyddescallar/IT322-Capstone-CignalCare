'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate, validateUpstash, validateAlert, validateOrigins, classifyLegacyTotals } = require('../utils/finalFixDChecks');
const cli = require('../scripts/finalFixDReadiness');
const schema = require('../utils/schemaSafety');

test('D readiness checker reports local mode and never exposes secret values', () => {
  const env={NODE_ENV:'development',DB_DRIVER:'mysql',DB_HOST:'127.0.0.1',DB_USER:'user',DB_PASSWORD:'SECRET_DB',DB_NAME:'local',
   CLOUDINARY_CLOUD_NAME:'cloud',CLOUDINARY_API_KEY:'key',CLOUDINARY_API_SECRET:'SECRET_CLOUD',
   UPSTASH_REDIS_REST_URL:'https://test-redis.upstash.io',UPSTASH_REDIS_REST_TOKEN:'SECRET_REDIS', JWT_SECRET:'SECRET_JWT'};
  const report = evaluate(env); const serialized=JSON.stringify(report);
  for(const secret of ['SECRET_DB','SECRET_CLOUD','SECRET_REDIS','SECRET_JWT']) assert.ok(!serialized.includes(secret));
  assert.equal(report.environment,'local_or_staging');
  assert.equal(report.checks.shared_quotas.status,'CONFIGURED_NOT_PROBED');
  assert.equal(report.checks.pdf_delivery.status,'NOT_CONFIRMED');
});

test('D production missing configuration creates blockers and never asserts readiness',()=>{
  const report = evaluate({NODE_ENV:'production', DB_DRIVER:'postgres'});
  assert.ok(report.blockers.includes('database'));
  assert.ok(report.blockers.includes('shared_quotas'));
  assert.ok(report.blockers.includes('cloudinary'));
  assert.ok(report.blockers.includes('authentication'));
  assert.ok(report.blockers.includes('payment'));
  assert.ok(report.blockers.includes('pdf_delivery'));
});

test('D configured services are explicitly NOT marked live-verified',()=>{
  const r=evaluate({NODE_ENV:'production',DB_DRIVER:'postgres',DATABASE_URL:'postgres://should-never-emit',
    UPSTASH_REDIS_REST_URL:'https://hello.upstash.io',UPSTASH_REDIS_REST_TOKEN:'fake-secret',
    CIGNALCARE_ALERT_WEBHOOK_URL:'https://monitor.example.com/hook',CIGNALCARE_ALERT_WEBHOOK_HOST:'monitor.example.com',
    CLOUDINARY_CLOUD_NAME:'cloud',CLOUDINARY_API_KEY:'key',CLOUDINARY_API_SECRET:'secret',CLOUDINARY_PDF_DELIVERY_CONFIRMED:'true',
    CORS_ORIGIN:'https://example.com',JWT_SECRET:'long-random',PAYMONGO_SECRET_KEY:'sk_live_some',PAYMONGO_WEBHOOK_SECRET:'secret'});
  assert.equal(r.checks.pdf_delivery.status,'OPERATOR_ATTESTED_NOT_PROBED');
  assert.equal(r.checks.cloudinary.status,'CONFIGURED_NOT_PROBED');
  assert.equal(r.checks.operational_alerts.status,'CONFIGURED_NOT_PROBED');
  assert.deepEqual(r.blockers,[]);
  assert.ok(!JSON.stringify(r).includes('postgres://'));
});

test('D provider URL validators reject credential leaks, lookalike domains and wildcards',()=>{
  assert.equal(validateUpstash({UPSTASH_REDIS_REST_URL:'https://upstash.io.attacker.com',UPSTASH_REDIS_REST_TOKEN:'x'}).status,'INVALID');
  assert.equal(validateUpstash({UPSTASH_REDIS_REST_URL:'https://foo.upstash.io',UPSTASH_REDIS_REST_TOKEN:''}).status,'INVALID');
  assert.equal(validateAlert({CIGNALCARE_ALERT_WEBHOOK_URL:'https://test.example.com@evil.com/',CIGNALCARE_ALERT_WEBHOOK_HOST:'test.example.com'}).status,'INVALID');
  assert.equal(validateOrigins({NODE_ENV:'production',CORS_ORIGIN:'*'}).status,'INVALID');
  assert.equal(validateOrigins({NODE_ENV:'production',CORS_ORIGIN:'http://example.com'}).status,'INVALID');
});

test('D attachment inventory uses only SELECT and outputs aggregate counts',async()=>{
  const cols = {};
  for(const set of Object.values(schema.requirements)) for(const [table,fields] of Object.entries(set))
    cols[table]=new Set([...(cols[table]||[]),...fields]);
  const statements=[];
  const db={driver:'postgres', query:async(sql,params)=>{
    statements.push(sql);
    if(sql.includes('information_schema'))return [[...(cols[params[1]]||[])].map(column_name=>({column_name}))];
    return [[{total:7,protected:3,legacy_cloudinary:2,other_remote:1,local_or_unknown:1}]];
  }};
  const result=await cli.inventory(db);
  assert.equal(result.status,'LEGACY_REMOTE_FILES_PRESENT');
  assert.deepEqual([result.total,result.protected,result.legacy_cloudinary],[7,3,2]);
  assert.ok(statements.every(x=>/^\s*SELECT /i.test(x)));
  assert.ok(!JSON.stringify(result).includes('http://'));
  assert.throws(()=>classifyLegacyTotals({total:-1}),/invalid count/);
});

test('D CLI refuses unknown commands and paths in report filenames',()=>{
  assert.deepEqual(cli.parseArgs([]),{inventory:false,redis:false,cloudinary:false,output:null});
  assert.deepEqual(cli.parseArgs(['--inventory','--output=FinalFixD_Report.json']).output,'FinalFixD_Report.json');
  assert.throws(()=>cli.parseArgs(['--apply']),/Unknown option/);
  assert.throws(()=>cli.parseArgs(['--output=..\\secrets.json']),/simple JSON name/);
  assert.throws(()=>cli.parseArgs(['--output=../secrets.json']),/simple JSON name/);
});
