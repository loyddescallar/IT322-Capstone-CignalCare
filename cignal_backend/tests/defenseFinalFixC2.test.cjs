'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const safety = require('../utils/schemaSafety');
function source(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
function mockModule(rel, mocks) {
 const module = {exports:{}};
 const script = new vm.Script('(function(require,module,exports){\n'+source(rel)+'\n})',{filename:rel});
 const factory = script.runInNewContext({process:{env:{}}, console, Set, Map, Buffer, Number, String, Date, Math, Boolean});
 factory((name) => {if(Object.hasOwn(mocks,name))return mocks[name]; if(name==='crypto' || name==='node:crypto')return require('node:crypto'); throw Error('unexpected import '+name);},module,module.exports);
 return module.exports;
}
test('schema scan is read only and merges required columns for same table',async()=>{
 const calls=[]; const mapping={users:['id',...safety.requirements.account.users],load_requests:['id',...safety.requirements.load_requests.load_requests]};
 const db={driver:'postgres',query:async(sql,params)=>{calls.push([sql,params]);return [(mapping[params[1]]||[]).map(column_name=>({column_name}))];}};
 assert.deepEqual(await safety.scan(db,['account','load_requests']),[]);
 assert.equal(calls.length,2);
 assert.ok(calls.every(([sql])=>/^SELECT /i.test(sql)));
 assert.deepEqual(calls[0][1],['public','users']);
});
test('schema guard rejects missing payment columns without running DDL',async()=>{
 const queries=[]; const db={driver:'mysql',query:async(sql,args)=>{queries.push([sql,args]);return [[{column_name:'id'}]];}};
 const saved=process.env.DB_NAME; process.env.DB_NAME='safe_test_db';
 try { await assert.rejects(safety.assertSchema(db,'load_requests'),e=>e.code==='SCHEMA_NOT_READY' && e.missing.includes('load_requests.plan_id')); }
 finally {if(saved===undefined) delete process.env.DB_NAME;else process.env.DB_NAME=saved;}
 assert.equal(queries.length,1);assert.match(queries[0][0],/^SELECT /);
});
test('model runtime ensures never run CREATE, ALTER, or data repair even without ready flags',async()=>{
 const list = [
  ['models/userModel.js','ensureAccountSchema','account'],
  ['models/loadRequestModel.js','ensureLoadRequestColumns','load_requests'],
  ['models/ticketModel.js','ensureTicketWorkflowSchema','ticket_workflow'],
  ['models/technicianModel.js','ensureTechnicianColumns','technician'],
  ['models/adminSecurityModel.js','ensureAdminSecuritySchema','admin_security'],
  ['models/accountRecoveryModel.js','ensureAccountRecoverySchema','account_recovery'],
  ['models/paymongoWebhookEventModel.js','ensurePayMongoWebhookEventTable','payment_webhooks'],
  ['models/incidentModel.js','ensureIncidentSchema','incidents'],
  ['models/troubleshootOutcomeModel.js','ensureTroubleshootOutcomeSchema','troubleshoot_outcomes'],
  ['controllers/messageController.js','ensureMessageSchema','messages'],
  ['controllers/loadController.js','ensurePlanColumns','prepaid_plans'],
 ];
 for(const [rel,fn,scope] of list) {
  const s=source(rel);
  const block=s.slice(s.indexOf('async function '+fn+'() {'));
  assert.match(block, /inMigrationContext\(\)/,rel);
  assert.match(block, new RegExp('assertSchema\\(pool, [\"\']'+scope+'[\"\']\\)'),rel);
 }
 const observed=[]; const pool={query:async sql=>{observed.push(sql);throw Error('MUTATION BLOCKED');}};
 const scopes=[]; const f=mockModule('models/userModel.js', {'../config/db':pool,'../utils/schemaSafety':{inMigrationContext:()=>false,assertSchema:async(p,scope)=>scopes.push(scope)}});
 await f.ensureAccountSchema();assert.deepEqual(scopes,['account']);assert.deepEqual(observed,[]);
});
test('migration context is async scoped, not a permanent global switch',async()=>{
 assert.equal(safety.inMigrationContext(),false);
 await safety.withMigrationContext(async()=>{await Promise.resolve();assert.equal(safety.inMigrationContext(),true);});
 assert.equal(safety.inMigrationContext(),false);
});
test('migration CLI is staging-only, guarded, and plan mode has no database writes',()=>{
 const s=source('scripts/c2SchemaMigration.js');
 assert.match(s,/--target=staging/); assert.match(s,/--backup-confirmed/);assert.match(s,/--approve-ddl/);
 assert.match(s,/NODE_ENV/); assert.match(s,/--check/);
 assert.match(s,/withMigrationContext/);
 assert.doesNotMatch(s,/process\.env\.NODE_ENV\s*=\s*['"]production/);
});
test('incident GET is read only and explicit POST is admin-role protected',()=>{
 const s=source('controllers/incidentController.js');
 const method=s.slice(s.indexOf('async function listAdminIncidents'),s.indexOf('async function detectAdminIncidentCandidates'));
 assert.doesNotMatch(method,/syncIncidentCandidates|notifyNewCandidates/);
 assert.match(method,/listIncidents/);
 assert.match(s,/async function detectAdminIncidentCandidates/);
 const route=source('routes/incidentRoutes.js');
 assert.match(route,/router\.post\('\/admin\/detect',authRequired,requireRole\('admin'\),c\.detectAdminIncidentCandidates\)/);
 assert.match(source('../Cignal_Frontend/src/api/incidentApi.js'),/detectCandidates/);
 assert.match(source('../Cignal_Frontend/src/pages/admin/AdminIncidents.jsx'),/onClick={runDetection}/);
});

test('all 11 ensure functions take the read-only branch without querying a database',async()=>{
  const specs=[
    ['models/userModel.js','ensureAccountSchema','account'],
    ['models/loadRequestModel.js','ensureLoadRequestColumns','load_requests'],
    ['models/ticketModel.js','ensureTicketWorkflowSchema','ticket_workflow'],
    ['models/technicianModel.js','ensureTechnicianColumns','technician'],
    ['models/adminSecurityModel.js','ensureAdminSecuritySchema','admin_security'],
    ['models/accountRecoveryModel.js','ensureAccountRecoverySchema','account_recovery'],
    ['models/paymongoWebhookEventModel.js','ensurePayMongoWebhookEventTable','payment_webhooks'],
    ['models/incidentModel.js','ensureIncidentSchema','incidents'],
    ['models/troubleshootOutcomeModel.js','ensureTroubleshootOutcomeSchema','troubleshoot_outcomes'],
    ['controllers/messageController.js','ensureMessageSchema','messages'],
    ['controllers/loadController.js','ensurePlanColumns','prepaid_plans'],
  ];
  for(const [rel,name,scope] of specs){
    let ran=false; const pool={query:async()=>{throw Error('Request-time query unexpected')}, driver:'postgres'};
    const baseRequire=(specifier)=>{
      if(specifier==='../config/db')return pool;
      if(specifier==='../utils/schemaSafety')return {inMigrationContext:()=>false,assertSchema:async(p,s)=>{assert.equal(p,pool);assert.equal(s,scope);ran=true;}};
      if(require('node:module').builtinModules.includes(specifier) || specifier.startsWith('node:'))return require(specifier);
      if(!specifier.startsWith('.'))return new Proxy(function(){},{get:(target,key)=>key==='v2'?{uploader:{upload:()=>null}}:()=>null});
      return new Proxy(function(){},{get:(target,key)=>key==='__esModule'?false:()=>null});
    };
    const module={exports:{}};
    const script=new vm.Script('(function(require,module,exports){\n'+source(rel)+'\n})',{filename:rel});
    const fn=script.runInNewContext({console,process:{env:{}}, Buffer, Date, Math, Set, Map, RegExp, Number, String, Boolean, Object, Array, JSON, URL, URLSearchParams, globalThis:{}, setTimeout, clearTimeout});
    try {fn(baseRequire,module,module.exports);}
    catch(e){throw Error(rel+' module load failed: '+e.message);}
    assert.equal(typeof module.exports[name],'function',rel);
    await module.exports[name]();
    assert.equal(ran,true,rel);
  }
});
