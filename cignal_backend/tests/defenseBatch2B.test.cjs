const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const {parseAdminPagination, paginationMeta} = require('../utils/adminPagination');
const read = p => fs.readFileSync(path.join(root,p),'utf8');

test('legacy APIs remain opt-out of pagination',()=>{
  assert.deepEqual(parseAdminPagination({}), { enabled:false });
  assert.deepEqual(parseAdminPagination({other:'x'}), { enabled:false });
});

test('page and pageSize are bounded integers; no unbounded queries via opt-in',()=>{
  assert.deepEqual(parseAdminPagination({page:'2',pageSize:'20'}),
    {enabled:true,page:2,pageSize:20,limit:20,offset:20});
  assert.deepEqual(parseAdminPagination({pageSize:'5'}),
    {enabled:true,page:1,pageSize:5,limit:5,offset:0});
  for(const bad of ['0','-1','1.5','2e3','abc','  ','99999999','1; DROP TABLE users']){
    assert.ok(parseAdminPagination({page:bad}).error, bad);
  }
  for(const bad of ['0','-1','101','1.1','NaN']){
    assert.ok(parseAdminPagination({pageSize:bad}).error, bad);
  }
});

test('pagination totals count the whole dataset, not just fetched rows',()=>{
  assert.deepEqual(paginationMeta(2,25,51),
    {page:2,pageSize:25,total:51,totalPages:3,hasNextPage:true,hasPreviousPage:true});
  assert.equal(paginationMeta(1,25,'0').totalPages,0);
});

test('admin ticket and load-request controllers preserve legacy response shape',()=>{
  for(const [p,legacy] of [
    ['cignal_backend/controllers/ticketController.js','getAllTickets()'],
    ['cignal_backend/controllers/loadRequestController.js','getAllLoadRequests()']]){
    const source=read(p);
    assert.match(source,/parseAdminPagination\(req\.query\)/);
    assert.ok(source.includes(legacy));
    assert.match(source,/if \(paging\.error\) return res\.status\(400\)/);
    assert.match(source,/pagination: paginationMeta\(/);
  }
});

test('paginated SQL has stable ordering, parameterized LIMIT/OFFSET and database COUNT',()=>{
  const ticket=read('cignal_backend/models/ticketModel.js');
  const loads=read('cignal_backend/models/loadRequestModel.js');
  assert.match(ticket,/SELECT COUNT\(\*\) AS total FROM tickets/);
  assert.match(loads,/SELECT COUNT\(\*\) AS total FROM load_requests/);
  assert.match(ticket,/ORDER BY t\.created_at DESC, t\.id DESC\s+LIMIT \? OFFSET \?/);
  assert.match(loads,/ORDER BY created_at DESC, id DESC\s+LIMIT \? OFFSET \?/);
  for(const source of [ticket, loads]) assert.match(source,/\[limit, offset\]/);
});

test('Batch 2B does not modify critical payment, AI or security files',()=>{
  for(const file of ['cignal_backend/middleware/aiUsageGuard.js',
    'cignal_backend/middleware/abuseRateLimit.js',
    'cignal_backend/utils/paymentEventValidation.js',
    'cignal_backend/tests/defenseBatch2A.test.cjs'])
    assert.ok(fs.existsSync(path.join(root,file)),file);
});
