'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { pathToFileURL } = require('node:url');

const backend = path.resolve(__dirname, '..');
const frontend = path.resolve(__dirname, '../../Cignal_Frontend/src');
function read(rel) { return fs.readFileSync(path.join(backend, rel), 'utf8'); }

function fakeSalesModel(driver = 'postgres', response = { total: 83, sales: '24900.00' }) {
  const queries = [];
  const pool = {
    driver,
    async query(sql, params) {
      queries.push({ sql, params });
      if (/COUNT\(\*\) AS total/.test(sql)) return [[response]];
      return [[{ id: 2, reference_no: 'POS-2', status: 'completed', amount: 300 }]];
    },
  };
  const context = {
    module: { exports: {} },
    require(name) {
      if (name === '../config/db') return pool;
      if (name === '../utils/loadValidity') return { FIXED_LOAD_VALIDITY_DAYS: 30 };
      if (name === '../utils/posIdempotency') return { isSamePosTransaction: () => true, replayConflict: () => new Error('Conflict') };
      throw new Error('Unexpected require: ' + name);
    },
    Date, Number, String, Math, console,
  };
  vm.runInNewContext(read('models/loadModel.js'), context, { filename: 'loadModel.js' });
  return { model: context.module.exports, queries };
}

test('PostgreSQL paged totals count ALL matching completed sales, not only a page', async () => {
  const { model, queries } = fakeSalesModel();
  const result = await model.getPagedPrepaidTransactions({
    page: 2, pageSize: 25, from: '2026-10-01', to: '2026-10-24', paymentMethod: 'Cash', accountNumber: 'ABC',
  });
  assert.equal(result.pagination.total, 83);
  assert.equal(result.pagination.totalPages, 4);
  assert.equal(result.summary.transactions, 83);
  assert.equal(result.summary.grossProfit, 3320);
  assert.equal(result.summary.sales, 24900);
  assert.equal(result.transactions.length, 1);
  assert.equal(queries.length, 2);
  assert.match(queries[0].sql, /pt.status = 'completed'/);
  assert.match(queries[0].sql, /TO_TIMESTAMP\(\?\)/);
  assert.match(queries[1].sql, /LIMIT \? OFFSET \?/);
  assert.deepEqual(Array.from(queries[1].params.slice(-2)), [25, 25]);
  assert.equal(queries[0].params[0], 'Cash');
  assert.equal(queries[0].params[1], '%ABC%');
  const expectedFrom = Date.parse('2026-10-01T00:00:00+08:00') / 1000;
  const expectedExclusiveEnd = Date.parse('2026-10-25T00:00:00+08:00') / 1000;
  assert.equal(queries[0].params[2], expectedFrom);
  assert.equal(queries[0].params[3], expectedExclusiveEnd);
});

test('MySQL uses session-safe UNIX time conversion and account-number escaping', async () => {
  const { model, queries } = fakeSalesModel('mysql', { total: 0, sales: 0 });
  const result = await model.getPagedPrepaidTransactions({
    page: 1, pageSize: 10, accountNumber: '123%_',
  });
  assert.equal(result.pagination.totalPages, 0);
  assert.equal(result.summary.grossProfit, 0);
  assert.match(queries[1].sql, /ORDER BY pt.created_at DESC, pt.id DESC/);
  assert.equal(queries[0].params[0], '%123\\%\\_%');
  const { model: mySql, queries: dates } = fakeSalesModel('mysql');
  await mySql.getPagedPrepaidTransactions({ from: '2026-10-24', to: '2026-10-24' });
  assert.match(dates[0].sql, /FROM_UNIXTIME\(\?\)/);
});

test('CSV escape protects spreadsheet formula prefixes without changing numeric totals', async () => {
  const { safeCsvCell, rowsToSafeCsv } = await import(pathToFileURL(path.join(frontend, 'utils/safeCsv.js')).href);
  for (const value of ['=HYPERLINK("http://unsafe")', '+SUM(1,1)', '-CMD()', '@SUM(1,1)', '\t=2+2']) {
    assert.ok(safeCsvCell(value).startsWith('"\''), `Expected formula protection for ${value}`);
  }
  assert.equal(safeCsvCell(40), '"40"');
  assert.equal(safeCsvCell('Normal "name"'), '"Normal ""name"""');
  assert.match(rowsToSafeCsv([['Name', 'Profit'], ['=2+2', 40]]), /'\=2\+2/);
});

test('Batch 2 protects route authorization and preserves the original list endpoint', () => {
  const routes = read('routes/loadRoutes.js');
  const model = read('models/loadModel.js');
  const controller = read('controllers/loadController.js');
  assert.match(routes, /get\('\/prepaid-transactions', authRequired, requireRole\('admin'\), getPrepaidTransactionsController\)/);
  assert.match(routes, /get\('\/prepaid-transactions\/paged', authRequired, requireRole\('admin'\), getPagedPrepaidTransactionsController\)/);
  assert.match(model, /async function getAllPrepaidTransactions/);
  assert.match(controller, /numberSize > 100/);
  assert.match(controller, /validSalesDate\(from\)/);
});

test('Dashboard never creates a pretend welcome notification on network failure', () => {
  const source = fs.readFileSync(path.join(frontend, 'pages/user/UserDashboard.jsx'), 'utf8');
  assert.doesNotMatch(source, /Welcome to CignalCare\+\. Your account is active\./);
  assert.match(source, /Notifications are temporarily unavailable/);
  const workspace = fs.readFileSync(path.join(frontend, 'pages/admin/AdminWorkspace.jsx'), 'utf8');
  assert.match(workspace, /document\.visibilityState === 'hidden'/);
  assert.match(workspace, /setNotifError/);
});
