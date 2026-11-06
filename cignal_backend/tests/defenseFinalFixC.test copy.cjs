'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../..');
const source=(rel)=>fs.readFileSync(path.join(ROOT,rel),'utf8');
function loadCommonjs(rel, mocks){
  const module={exports:{}};
  const script=new vm.Script('(function(require,module,exports){\n'+source(rel)+'\n})',{filename:rel});
  script.runInNewContext({console,Date,Map,Set,Number,String,Object,Array,Math,process:{env:{}}})((name)=>{
    if(!(name in mocks)) throw Error('Unexpected import: '+name);
    return mocks[name];
  },module,module.exports);
  return module.exports;
}
const selectOnly=(queries)=>queries.every(([sql])=>/^\s*SELECT\s/i.test(sql));
test('analytics uses SQL date filters without mutating incident records',async()=>{
  const queries=[];
  const pool={query:async(sql,params=[])=>{queries.push([sql,params]);return [[]];}};
  const fake=loadCommonjs('cignal_backend/controllers/analyticsController.js',{
    '../config/db':pool,
    '../models/troubleshootOutcomeModel':{getAnalyticsOutcomesReadOnly:async()=>[]},
    '../models/incidentModel':{getIncidentStatsReadOnly:async()=>[],issueDescriptor:()=>null,getIncidentDetectionPolicy:()=>({})},
  });
  let response=null;
  await fake.getAdminAnalytics({query:{days:'30'}},{json:(payload)=>{response=payload;},status:()=>({json:()=>{throw Error('unexpected error response')}})});
  assert.ok(response?.kpis);
  assert.equal(queries.length,5);
  assert.ok(selectOnly(queries));
  // Timestamp-based metrics use the first instant of the selected Manila day.
  for (const [, params] of queries.slice(1, 4)) {
    assert.equal(params.length, 1);
    assert.ok(params[0] instanceof Date);
  }
  // Service collections use a DATE column, so PostgreSQL/MySQL receive an
  // unambiguous YYYY-MM-DD bound instead of a timezone-bearing timestamp.
  assert.equal(queries[4][1].length, 1);
  assert.match(queries[4][1][0], /^\d{4}-\d{2}-\d{2}$/);
  assert.match(queries[1][0],/t\.created_at >= \?/);
  assert.match(queries[2][0],/tr\.created_at >= \?/);
  assert.match(queries[3][0],/pt\.created_at >= \?/);
  assert.match(queries[4][0],/sp\.transaction_date >= \?/);
  assert.doesNotMatch(source('cignal_backend/controllers/analyticsController.js'),/syncIncidentCandidates|getAllOutcomes\(/);
});
test('all-time analytics option preserves unbounded mode for existing caller',async()=>{
  const queries=[];const pool={query:async(sql,params=[])=>{queries.push([sql,params]);return [[]];}};
  const fake=loadCommonjs('cignal_backend/controllers/analyticsController.js',{
    '../config/db':pool,'../models/troubleshootOutcomeModel':{getAnalyticsOutcomesReadOnly:async(c)=>{assert.equal(c,null);return [];}},
    '../models/incidentModel':{getIncidentStatsReadOnly:async(c)=>{assert.equal(c,null);return [];},issueDescriptor:()=>null,getIncidentDetectionPolicy:()=>({})},
  });
  await fake.getAdminAnalytics({query:{days:'-1'}},{json:()=>{},status:()=>({json:()=>{throw Error('unexpected')}})});
  assert.ok(selectOnly(queries));
  for(const [,params] of queries) assert.equal(params.length,0);
});
test('outcomes analytics read never performs DDL, and handles an unprovisioned table',async()=>{
  const calls=[];
  const f=loadCommonjs('cignal_backend/models/troubleshootOutcomeModel.js',{
    crypto:require('node:crypto'), '../config/db':{query:async(sql,params)=>{calls.push([sql,params]);throw Object.assign(new Error('not provisioned'),{code:'42P01'});}},
  });
  const rows=await f.getAnalyticsOutcomesReadOnly(new Date('2026-01-01'));
  assert.equal(rows.length,0);assert.equal(calls.length,1);assert.ok(selectOnly(calls));
});
test('incidents analytics read never performs DDL, returns rows with date bound',async()=>{
  const calls=[];
  const f=loadCommonjs('cignal_backend/models/incidentModel.js',{
    crypto:require('node:crypto'), '../config/db':{query:async(sql,params)=>{calls.push([sql,params]);return [[{id:'a',status:'candidate'}]];}}
  });
  const rows=await f.getIncidentStatsReadOnly(new Date('2026-01-01'));
  assert.equal(rows[0].id,'a');assert.equal(calls.length,1);assert.ok(selectOnly(calls));
  assert.match(calls[0][0],/WHERE created_at >= \?/);
});
test('admin pending badge fetches one record and uses full filtered server total',()=>{
  const s=source('Cignal_Frontend/src/pages/admin/AdminWorkspace.jsx');
  assert.match(s,/view: 'filtered', page: 1, pageSize: 1, status: 'Received'/);
  assert.match(s,/response\.data\?\.pagination\?\.total/);
  assert.doesNotMatch(s,/requests\.filter\(\(request\) => request\.status === 'Received'\)/);
});
test('migration remains an explicit pending task; new analytics path is SELECT-only',()=>{
  const c=source('cignal_backend/controllers/analyticsController.js');
  assert.ok(!/\bALTER TABLE\b|\bCREATE TABLE\b|\bUPDATE\s+\w+\s+SET\b/i.test(c));
  assert.ok(!/syncIncidentCandidates/.test(c));
});
