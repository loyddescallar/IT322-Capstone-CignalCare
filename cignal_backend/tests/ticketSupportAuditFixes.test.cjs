'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
const source = rel => fs.readFileSync(path.join(root,rel),'utf8');
function harness(rel,mocks) {
  const module={exports:{}};
  const script=new vm.Script('(function(require,module,exports){'+source(rel)+'\n})',{filename:rel});
  const fun=script.runInNewContext({process:{env:{}},console,Set,Map,Date,String,Number,Boolean,Object,Array,Math,Promise,JSON});
  fun(name=>{
    if (Object.hasOwn(mocks,name))return mocks[name];
    throw Error('Unexpected module in audit test: '+name);
  },module,module.exports);
  return module.exports;
}

test('CignalBot and Troubleshooting prefill preserves exact supported symptom',()=>{
  const text=source('../Cignal_Frontend/src/data/reportProblemCatalog.js');
  const transformed=text.replaceAll('export const ','const ').replaceAll('export function ','function ');
  const ctx={};
  vm.runInNewContext(transformed+'\nthis.catalog={findGroupFromPrefill,findIssueFromPrefill};',ctx);
  const c=ctx.catalog;
  assert.equal(c.findIssueFromPrefill('signal','Weak Signal'),'weak_signal');
  assert.equal(c.findIssueFromPrefill('signal','No Signal'),'no_signal');
  assert.equal(c.findIssueFromPrefill('signal','Pixelated Picture'),'pixelated_signal');
  assert.equal(c.findGroupFromPrefill('Technical Problem','Black Screen'),'channels');
  assert.equal(c.findIssueFromPrefill('channels','Black Screen'),'black_screen');
  assert.equal(c.findGroupFromPrefill('Technical Problem','Remote Control Issue'),'remote');
  assert.equal(c.findIssueFromPrefill('remote','Remote Control Issue'),'remote_not_working');
});

test('validated specific issue prevents a remote ticket linking to No Signal outage',async()=>{
  const sql=[];
  const pool={query:async(query)=>{sql.push(query);return [[{id:'existing-1',status:'confirmed',issue_key:'no_signal',location:'Nasugbu'}]];}};
  const m=harness('models/incidentModel.js',{
    crypto:require('node:crypto'),
    '../config/db':pool,
    '../utils/schemaSafety':{inMigrationContext:()=>false,assertSchema:async()=>{}},
  });
  assert.equal(await m.findActiveIncidentForText('Nasugbu',{issue_code:'remote_not_working'}),null);
  const found=await m.findActiveIncidentForText('Nasugbu',{issue_code:'no_signal'});
  assert.equal(found.id,'existing-1');
  assert.equal(sql.length,2);
  assert.ok(sql.every(x=>/^\s*SELECT /i.test(x)));
});

test('issue resolved follow-up refuses inconsistent ticket status',async()=>{
  const m=harness('models/ticketSupportModel.js',{
    crypto:require('node:crypto'),
    '../config/db':{getConnection:async()=>{throw Error('Database should not be needed for invalid request');}},
    '../utils/schemaSafety':{assertSchema:async()=>{}},
  });
  await assert.rejects(()=>m.recordCallOutcome({
    ticketId:234,adminId:1,outcome:'resolved',markResolved:false,
    requestKey:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
  }),error=>error.statusCode===400 && /resolution/i.test(error.message));
});

test('admin ticket-support response omits account-recovery fields',()=>{
  const text=source('controllers/ticketSupportController.js');
  assert.match(text,/const safeSupport\s*=\s*support/);
  assert.match(text,/support:safeSupport/);
  const expose=text.match(/Object\.fromEntries\(\[([\s\S]*?)\]\.map/);
  assert.ok(expose,'Explicit support-field allowlist required');
  assert.doesNotMatch(expose[1],/recovery_phone|email_verified_at|user_id/);
});

test('follow-up confirmation disables repeat clicks until new call is started',()=>{
  const text=source('../Cignal_Frontend/src/components/TicketCallSupport.jsx');
  assert.match(text,/saving\s*\|\|\s*saved\s*\|\|\s*isClosed/);
  assert.match(text,/Record another call/);
  assert.match(text,/setMarkResolved\(value==='resolved'\)/);
});
