'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', '..', file), 'utf8');
const rules = require('../utils/servicePaymentRules');
const sample = (overrides = {}) => ({
  accountNumber: '50000009', serviceType: 'Signal / Dish Repair', description: 'Completed dish repair',
  amount: '350.00', paymentMethod: 'GCash', externalReference: ' GCash-PMT-01 ',
  transactionDate: '2026-11-02', technicianRequestId: null, ...overrides,
});
function loadModule(src, mocks, globals = {}) {
  const module = { exports: {} };
  const sandbox = {
    module, exports: module.exports, require(name) {
      if (!(name in mocks)) throw Error(`Unexpected import: ${name}`);
      return mocks[name];
    }, console, Date, Set, Map, ...globals,
  };
  vm.runInNewContext(read(src), sandbox, { filename: src });
  return module.exports;
}

test('Service Payment Recording normalizes mixed-case GCash references before persistence and fingerprinting', () => {
  const a = rules.normalizeServicePayment(sample());
  const b = rules.normalizeServicePayment(sample({ externalReference: 'gcash-pmt-01' }));
  assert.equal(a.value.externalReference, 'GCASH-PMT-01');
  assert.equal(b.value.externalReference, 'GCASH-PMT-01');
  assert.equal(rules.serviceFingerprint(a.value, 1009), rules.serviceFingerprint(b.value, 1009));
});

test('Service Payment Recording Completed Sales partial account search does not alter exact profile lookup', async () => {
  const calls = [];
  const module = loadModule('cignal_backend/models/servicePaymentModel.js', {
    '../config/db': { query: async (sql, params) => { calls.push({ sql, params }); return [[]]; } },
    '../utils/servicePaymentRules': { serviceFingerprint: () => 'fingerprint' },
  });
  await module.listServicePayments({ accountSearch: '0009', page: 1, pageSize: 25 });
  assert.match(calls[0].sql, /account_number LIKE \?/);
  assert.equal(calls[0].params[0], '%0009%');
  calls.length = 0;
  await module.listServicePayments({ accountNumber: '50000009', page: 1, pageSize: 25 });
  assert.match(calls[0].sql, /account_number = \?/);
  assert.doesNotMatch(calls[0].sql, /account_number LIKE \?/);
  assert.equal(calls[0].params[0], '50000009');
});

test('Service Payment Recording concurrent GCash duplicate returns specific error rather than idempotency-key mismatch', async () => {
  const payment = rules.normalizeServicePayment(sample()).value;
  const queryLog = [];
  const connection = {
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
    query: async (sql, params) => {
      queryLog.push({sql,params});
      if (/SELECT \* FROM service_payments/.test(sql)) return [[]];
      if (/SELECT reference_no FROM service_payments/.test(sql)) return [[]];
      if (/INSERT INTO service_payments/.test(sql)) throw Object.assign(new Error('duplicate'), {code:'ER_DUP_ENTRY'});
      throw Error(`Unexpected statement: ${sql}`);
    },
  };
  const module = loadModule('cignal_backend/models/servicePaymentModel.js', {
    '../config/db': {
      getConnection: async () => connection,
      query: async (sql, params) => {
        queryLog.push({sql,params});
        if (/SELECT \* FROM service_payments/.test(sql)) return [[]];
        if (/UPPER\(external_reference\)/.test(sql)) return [[{reference_no:'SRV-OTHER'}]];
        throw Error(`Unexpected standalone query: ${sql}`);
      },
    },
    '../utils/servicePaymentRules': { serviceFingerprint: () => 'fingerprint' },
  });
  await assert.rejects(module.recordServicePayment({
    customer: {id: 1009, accountNumber: '50000009', accountName:'Demo Subscriber'},
    payment, referenceNo:'SRV-NEW', processedBy:'Admin',
  }), e => e.code === 'SERVICE_IDEMPOTENCY_CONFLICT' && /GCash reference has already been recorded/.test(e.message));
  assert.equal(queryLog.filter(x => /INSERT INTO service_payments/.test(x.sql)).length,1);
});

test('Service Payment Recording uses Manila calendar-day bounds so service KPIs equal 30-day chart totals at midnight', async () => {
  const nowMs = Date.parse('2026-11-05T16:30:00Z'); // 2026-11-06 00:30 in Manila
  class FakeDate extends Date {
    constructor(...args) { super(...(args.length ? args : [nowMs])); }
    static now() { return nowMs; }
  }
  const payments = [
    { id: 1, amount: 350, transaction_date: '2026-10-07', location: 'Balayan', payment_method: 'Cash' },
    { id: 2, amount: 200, transaction_date: '2026-10-08', location: 'Balayan', payment_method: 'Cash' },
  ];
  const queryLog = [];
  const fake = loadModule('cignal_backend/controllers/analyticsController.js', {
    '../config/db': { query: async (sql, params = []) => {
      queryLog.push([sql,params]);
      if (/FROM users WHERE role/.test(sql)) return [[{ id: 1009, location:'Balayan', status:'active' }]];
      if (/FROM service_payments/.test(sql)) return [payments];
      return [[]];
    } },
    '../models/troubleshootOutcomeModel': { getAnalyticsOutcomesReadOnly: async () => [] },
    '../models/incidentModel': { getIncidentStatsReadOnly: async () => [], issueDescriptor: () => null, getIncidentDetectionPolicy: () => ({}) },
  }, {Date:FakeDate});
  let data;
  await fake.getAdminAnalytics({query:{days:'30',location:'Balayan'}}, {
    json(v) { data=v; return v; },
    status(code) { throw Error(`Unexpected status ${code}`); },
  });
  assert.equal(data.trend.length,30);
  assert.equal(data.trend[0].date, '2026-10-08');
  assert.equal(data.kpis.serviceRevenue,200);
  assert.equal(data.kpis.totalRevenue,200);
  assert.equal(data.trend.reduce((sum,x)=>sum+x.sales,0),200);
  const serviceQuery = queryLog.find(x => x[0].includes('FROM service_payments'));
  assert.equal(serviceQuery[1][0],'2026-10-08');
});

test('Service Payment Recording UI resets stale technician request and sales screens use partial service search', () => {
  const terminal = read('Cignal_Frontend/src/components/admin/ServicePaymentTerminal.jsx');
  const sales = read('Cignal_Frontend/src/pages/admin/AdminTransactions.jsx');
  assert.match(terminal, /key === 'accountNumber' \? \{ technicianRequestId: '' \}/);
  assert.match(terminal, /setTimeout\(\(\) => \{/);
  assert.match(terminal, /Require fresh confirmation of the final service and amount/);
  assert.match(sales, /accountSearch: debouncedSearch/);
  assert.match(sales, /accountSearch: search\.trim\(\)/);
  assert.match(sales, /setServicePagination\(\{ total: 0, totalPages: 0 \}\)/);
  const profile = read('Cignal_Frontend/src/pages/admin/AdminCustomerProfile.jsx');
  assert.match(profile, /servicePaymentError/);
  assert.match(profile, /Retry before relying on this history/);
  assert.match(terminal, />Service Payment Recording<\/h2>/);
  assert.match(sales, />Service Payment History<\/h2>/);
  assert.match(profile, />Service Payment History<\/h2>/);
  for (const page of [terminal, sales, profile]) {
    assert.doesNotMatch(page, /FT-02/);
  }
});
