'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const shared = require('../utils/sharedQuotaStore');
const { alertConfig } = require('../utils/operationalAlert');
const { aiUsageGuard, resetForTests } = require('../middleware/aiUsageGuard');
const { createAbuseRateLimit } = require('../middleware/abuseRateLimit');
const envKeys = ['UPSTASH_REDIS_REST_URL','UPSTASH_REDIS_REST_TOKEN','CIGNALCARE_AI_MODE','GEMINI_API_KEY','NODE_ENV','CIGNALCARE_ALERT_WEBHOOK_URL','CIGNALCARE_ALERT_WEBHOOK_HOST'];
const prior = Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
test.after(() => { for(const k of envKeys) prior[k] === undefined ? delete process.env[k] : process.env[k] = prior[k]; resetForTests(); });
function unsetRedis() { delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; }
function setRedis() {process.env.UPSTASH_REDIS_REST_URL='https://example-dummy.upstash.io';process.env.UPSTASH_REDIS_REST_TOKEN='fake-only-for-unit-test';}
function res() {let out={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(x){this.body=x;return this;},once(){}};return out;}
test('shared quota provider stays off until explicitly configured, and URL must be trusted',()=>{
 unsetRedis();assert.equal(shared.configured(),false);
 process.env.UPSTASH_REDIS_REST_URL='http://localhost:9123';process.env.UPSTASH_REDIS_REST_TOKEN='fake';
 assert.throws(()=>shared.getConfig(),/Upstash HTTPS/);
 assert.throws(()=>shared.configured(),/Upstash HTTPS/);
 process.env.UPSTASH_REDIS_REST_URL='https://example.upstash.io';assert.equal(shared.configured(),true);
});
test('shared Redis quota EVAL uses one atomic script and never logs bearer token',async()=>{
 setRedis();let req;
 const ok=await shared.reserveSharedQuota([{key:shared.hashedKey('test:scope','alice'),max:3,ttlSeconds:60}],{fetcher:async (url,options)=>{req={url,options};return {ok:true,json:async()=>({result:1})};}});
 assert.equal(ok,true);assert.equal(req.url,'https://example-dummy.upstash.io');
 const body=JSON.parse(req.options.body);
 assert.equal(body[0],'EVAL');assert.equal(body[2],1);assert.equal(body[4],'3');assert.equal(body[5],'60');
 assert.ok(!req.options.body.includes('alice'));assert.ok(req.options.headers.Authorization.includes('fake-only-for-unit-test'));
 const limited=await shared.reserveSharedQuota([{key:shared.hashedKey('test:scope','alice'),max:3,ttlSeconds:60}],{fetcher:async()=>({ok:true,json:async()=>({result:0})})});
 assert.equal(limited,false);
});
test('Redis errors and malformed responses fail closed',async()=>{
 setRedis();const quotas=[{key:shared.hashedKey('test:x','user'),max:1,ttlSeconds:60}];
 await assert.rejects(shared.reserveSharedQuota(quotas,{fetcher:async()=>({ok:false,status:401})}),/HTTP 401/);
 await assert.rejects(shared.reserveSharedQuota(quotas,{fetcher:async()=>({ok:true,json:async()=>({error:'nope'})})}),/Invalid shared/);
 await assert.rejects(shared.reserveSharedQuota([{key:'not_safe',max:1,ttlSeconds:5}],{fetcher:async()=>{throw new Error('unexpected');}}),/Invalid quota definition/);
});
test('production AI does not call external provider without shared quota',()=>{
 unsetRedis(); resetForTests(); process.env.NODE_ENV='production';process.env.CIGNALCARE_AI_MODE='verified-free';process.env.GEMINI_API_KEY='FAKE';
 const q={user:{id:101}},r=res();let called=0;aiUsageGuard(q,r,()=>called++);
 assert.equal(called,1);assert.equal(q.aiAccess.allowed,false);assert.equal(q.aiAccess.reason,'shared-quota-required');
});
test('existing dev AI fallback and local limits remain when shared Redis is not configured',()=>{
 unsetRedis();resetForTests();process.env.NODE_ENV='development';process.env.CIGNALCARE_AI_MODE='verified-free';process.env.GEMINI_API_KEY='FAKE';
 const q={user:{id:1002}},r=res();let called=0;aiUsageGuard(q,r,()=>called++);assert.equal(called,1);assert.equal(q.aiAccess.allowed,true);
});
test('operational webhook is disabled by default and rejected for untrusted host',()=>{
 delete process.env.CIGNALCARE_ALERT_WEBHOOK_URL;delete process.env.CIGNALCARE_ALERT_WEBHOOK_HOST;assert.equal(alertConfig(),null);
 process.env.CIGNALCARE_ALERT_WEBHOOK_URL='http://localhost/hook';process.env.CIGNALCARE_ALERT_WEBHOOK_HOST='localhost';assert.equal(alertConfig(),null);
 process.env.CIGNALCARE_ALERT_WEBHOOK_URL='https://alerts.example.com/hook';process.env.CIGNALCARE_ALERT_WEBHOOK_HOST='alerts.example.com';assert.equal(alertConfig(),'https://alerts.example.com/hook');
 delete process.env.CIGNALCARE_ALERT_WEBHOOK_URL;delete process.env.CIGNALCARE_ALERT_WEBHOOK_HOST;
});
test('shared protection is integrated into login, admin login and authenticated API paths',()=>{
 const dir=path.join(__dirname,'..','middleware');
 for(const name of ['aiUsageGuard.js','abuseRateLimit.js','publicAuthRateLimit.js','adminAuthRateLimit.js']) {
  const contents=fs.readFileSync(path.join(dir,name),'utf8');assert.match(contents,/reserveSharedQuota/);assert.match(contents,/shared\.configured\(\)/);
 }
});


test('shared rate limiter rejects remotely denied requests and fails closed on outages',async()=>{
 setRedis();const original=shared.reserveSharedQuota;
 try {
   shared.reserveSharedQuota=async()=>false;
   const middleware=createAbuseRateLimit('ticketCreate');
   const a=res();let next=0;
   middleware({user:{id:'denied-test'}},a,()=>next++);
   await new Promise(setImmediate);
   assert.equal(a.code,429);assert.equal(next,0);
   shared.reserveSharedQuota=async()=>{throw new Error('provider-down')};
   const b=res();middleware({user:{id:'denied-test-2'}},b,()=>next++);
   await new Promise(setImmediate);
   assert.equal(b.code,503);assert.equal(next,0);
 } finally { shared.reserveSharedQuota=original; }
});

test('operator alert notifier does not transmit without explicit allowlisted HTTPS config',()=>{
 const {notifyOperational}=require('../utils/operationalAlert');
 delete process.env.CIGNALCARE_ALERT_WEBHOOK_URL;
 delete process.env.CIGNALCARE_ALERT_WEBHOOK_HOST;
 let requests=0;const old=console.warn;console.warn=()=>{};
 try { notifyOperational('TEST_EVENT',{scope:'unit'}, {fetcher:()=>{requests++;throw new Error('should not call')}}); }
 finally {console.warn=old;}
 assert.equal(requests,0);
});
