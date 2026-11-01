const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root,p), 'utf8');
const {
  ticketFilter, loadFilter, ticketWhere, loadWhere, getFilteredTicketPage, getFilteredLoadPage,
} = require('../utils/adminFilteredLists');

function fakePool(outputs) {
  const calls = [];
  return { calls, async query(sql, args = []) {
    calls.push({sql,args});
    return [outputs.shift() ?? []];
  }};
}

test('invalid filters and oversized searches fail closed',()=>{
  assert.throws(()=>ticketFilter({status:'DROP TABLE tickets'}),/Invalid status/);
  assert.throws(()=>loadFilter({location:'Atlantis'}),/Invalid location/);
  assert.throws(()=>ticketFilter({search:'x'.repeat(101)}),/Invalid search/);
  assert.throws(()=>loadFilter({search:['x']}),/Invalid search/);
});
test('ticket search and filters use bound values, not user input inside SQL',()=>{
  const malicious="abc%' OR 1=1--";
  const {where,params}=ticketWhere(ticketFilter({search:malicious, status:'Resolved', location:'Nasugbu'}));
  assert.ok(!where.includes(malicious));
  assert.ok(where.includes('LIMIT') === false);
  assert.ok(params.some(v=>String(v).includes('1=1')));
  assert.equal(params[0],'Resolved');
});
test('load filters permit defaults without search and bound search values',()=>{
  const {where,params}=loadWhere(loadFilter({search:'test',status:'Received'}));
  assert.match(where,/status = \?/);
  assert.deepEqual(params.slice(0,1),['Received']);
  assert.equal(params.filter(x=>x==='%test%').length,6);
});
test('ticket pagination returns filtered count plus full-data independent KPIs',async()=>{
  const pool = fakePool([[{total:'37'}],[{id:12}],
    [{status:'Submitted',location:'Nasugbu',total:'9'},{status:'Resolved',location:'Balayan',total:'5'},{status:'Archived',location:'Nasugbu',total:'2'}]]);
  const result = await getFilteredTicketPage(pool,{limit:25,offset:25},{status:'All',location:'Nasugbu'});
  assert.equal(result.total,37);
  assert.equal(result.tickets[0].id,12);
  assert.equal(result.summary.statusCounts.Submitted,9);
  assert.equal(result.summary.statusCounts.Resolved,0);
  assert.equal(result.summary.locationCounts.Balayan,5);
  assert.deepEqual(pool.calls[1].args.slice(-2),[25,25]);
  assert.match(pool.calls[1].sql,/ORDER BY t\.created_at DESC, t\.id DESC LIMIT \? OFFSET \?/);
});
test('load summaries are global rather than page-limited',async()=>{
  const pool=fakePool([[{total:2}],[{id:90}],
    [{status:'Received',payment_status:'pending',total:10},{status:'Received',payment_status:'paid',total:4},{status:'Completed',payment_status:'paid',total:7},{status:'Rejected',payment_status:'manual_review',total:1}]]);
  const result=await getFilteredLoadPage(pool,{limit:25,offset:0},{search:'jack'});
  assert.equal(result.total,2);
  assert.deepEqual(result.summary.kpis,{total:22,pendingPayment:10,readyToProcess:4,completed:7,rejected:1});
  assert.deepEqual(pool.calls[1].args.slice(-2),[25,0]);
});
test('new filtered mode is opt-in; legacy pagination and payment checks remain',()=>{
  const ticket=read('cignal_backend/controllers/ticketController.js');
  const load=read('cignal_backend/controllers/loadRequestController.js');
  assert.match(ticket,/req\.query\.view === 'filtered'/);
  assert.match(load,/req\.query\.view === 'filtered'/);
  assert.match(ticket,/getTicketsPage\(paging\)/);
  assert.match(load,/getLoadRequestsPage\(paging\)/);
  assert.match(load,/validatePaidPaymentEvent/);
});
test('admin UI uses remote counts and filters, not page-only KPIs',()=>{
  const tickets=read('Cignal_Frontend/src/pages/admin/AdminTickets.jsx');
  const loads=read('Cignal_Frontend/src/pages/admin/AdminLoadRequests.jsx');
  assert.match(tickets,/view: 'filtered'/);
  assert.match(loads,/view: 'filtered'/);
  assert.match(tickets,/summary\.locationCounts/);
  assert.match(loads,/summary\.kpis/);
  assert.match(tickets,/setPage\(.*\)/);
  assert.match(loads,/setPage\(.*\)/);
});
