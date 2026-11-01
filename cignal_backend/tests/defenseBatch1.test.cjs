'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { aiUsageGuard, aiEnabled, resetForTests } = require('../middleware/aiUsageGuard');

const root = path.resolve(__dirname, '..');
function request(id='customer-1') { return {user: {id}}; }
function response() {
  const e = new EventEmitter();
  e.headers = {};
  e.setHeader = (k,v) => {e.headers[k] = v};
  e.status = (n) => {e.statusCode = n; return e};
  e.json = (data) => {e.body = data; return e};
  return e;
}
function run(id='customer-1') { const req=request(id),res=response(); let called=false; aiUsageGuard(req,res,()=>called=true); assert.equal(called,true); return {req,res}; }

const vars = ['CIGNALCARE_AI_MODE','GEMINI_API_KEY','AI_GLOBAL_DAILY_CALLS','AI_USER_DAILY_CALLS','AI_USER_MINUTE_CALLS','AI_CONCURRENT_CALLS'];
const backup = Object.fromEntries(vars.map(x=>[x,process.env[x]]));
test.after(() => {for (const x of vars) if (backup[x]===undefined) delete process.env[x];else process.env[x]=backup[x]; resetForTests();});

test('AI is DISABLED without explicit opt-in, even when an API key exists', () => {
 resetForTests(); process.env.GEMINI_API_KEY='key-for-test'; delete process.env.CIGNALCARE_AI_MODE;
 assert.equal(aiEnabled(),false); assert.deepEqual(run().req.aiAccess,{allowed:false,reason:'disabled'});
});

test('quota reserves requests and rejects excess without making external calls', () => {
 resetForTests();process.env.CIGNALCARE_AI_MODE='verified-free';process.env.GEMINI_API_KEY='test';
 process.env.AI_GLOBAL_DAILY_CALLS='2';process.env.AI_USER_DAILY_CALLS='2';process.env.AI_USER_MINUTE_CALLS='2';process.env.AI_CONCURRENT_CALLS='2';
 const a=run('u1'),b=run('u1');assert.equal(a.req.aiAccess.allowed,true);assert.equal(b.req.aiAccess.allowed,true);
 a.res.emit('finish');b.res.emit('close');assert.equal(run('u2').req.aiAccess.reason,'quota');
});

test('simultaneous requests respect configured per-process concurrency', () => {
 resetForTests(); process.env.AI_GLOBAL_DAILY_CALLS='10';process.env.AI_USER_DAILY_CALLS='10';process.env.AI_USER_MINUTE_CALLS='5';process.env.AI_CONCURRENT_CALLS='1';
 const a=run('u1');assert.equal(a.req.aiAccess.allowed,true);
 assert.equal(run('u2').req.aiAccess.reason,'quota');a.res.emit('finish');
 assert.equal(run('u2').req.aiAccess.allowed,true);
});

test('invalid or excessive quota env values cannot increase built-in upper bounds', () => {
 process.env.AI_GLOBAL_DAILY_CALLS='900000';process.env.AI_USER_DAILY_CALLS='99999';process.env.AI_USER_MINUTE_CALLS='0';process.env.AI_CONCURRENT_CALLS='100';
 const {limits}=require('../middleware/aiUsageGuard');
 assert.deepEqual(limits(), {globalDaily:100,userDaily:10,userMinute:3,concurrency:2});
});

test('both AI endpoints are authenticated, role-checked and gated', () => {
 const r=fs.readFileSync(path.join(root,'routes/chatbotRoutes.js'),'utf8');
 assert.match(r,/router\.use\(authRequired, requireRole\('user'\), aiUsageGuard\)/);
 assert.match(r,/['"]\/message['"]/);assert.match(r,/['"]\/support-draft['"]/);
 const c=fs.readFileSync(path.join(root,'controllers/chatbotController.js'),'utf8');
 assert.match(c,/req\.aiAccess\?\.allowed/);
});

test('economical approved models only, with bounded output generation', () => {
 const s=fs.readFileSync(path.join(root,'services/geminiService.js'),'utf8');
 assert.match(s,/gemini-3\.1-flash-lite/);
 assert.match(s,/max_output_tokens:\s*2048/);
 assert.match(s,/max_output_tokens:\s*1024/);
 assert.doesNotMatch(s,/\|\| 'gemini-3\.8-flash'/);
});
