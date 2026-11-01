'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function makeController() {
  const fakeNow = Date.now();
  const at = (daysBack) => new Date(fakeNow - daysBack * 86400000).toISOString();
  const tickets = [
    { id: 1, user_id: 1, category: 'Router', status: 'Resolved', created_at: at(2), updated_at: at(1), location: 'Nasugbu' },
    { id: 2, user_id: 2, category: 'Internet', status: 'Open', created_at: at(20), updated_at: at(20), location: 'Nasugbu' },
    { id: 3, user_id: 3, category: 'Cable', status: 'Open', created_at: at(75), updated_at: at(75), location: 'Nasugbu' },
  ];
  const sales = [
    { id: 1, user_id: 1, amount: 120, status: 'completed', reference_no: 'POS-1', created_at: at(2), location: 'Nasugbu' },
    { id: 2, user_id: 2, amount: 80, status: 'completed', reference_no: 'POS-2', created_at: at(20), location: 'Nasugbu' },
    { id: 3, user_id: 3, amount: 40, status: 'completed', reference_no: 'POS-3', created_at: at(75), location: 'Nasugbu' },
  ];
  const pool = { query: async (sql) => {
    if (sql.includes('FROM users')) return [[{ id: 1, status: 'active', location: 'Nasugbu' }]];
    if (sql.includes('FROM tickets')) return [tickets];
    if (sql.includes('FROM technician_requests')) return [[]];
    if (sql.includes('FROM prepaid_transactions')) return [sales];
    throw new Error('Unexpected SQL in analytics test');
  }};
  const code = fs.readFileSync(path.join(__dirname, '../controllers/analyticsController.js'), 'utf8');
  const sandbox = {
    module: { exports: {} }, console, Date, Set, Map,
    require: (name) => {
      if (name === '../config/db') return pool;
      if (name === '../models/troubleshootOutcomeModel') return { getAnalyticsOutcomesReadOnly: async () => [] };
      if (name === '../models/incidentModel') return {
        getIncidentStatsReadOnly: async () => [],
        issueDescriptor: (ticket) => ({ label: ticket.category }),
        getIncidentDetectionPolicy: () => ({}),
      };
      throw new Error('Unexpected dependency: ' + name);
    },
  };
  vm.runInNewContext(code, sandbox, {filename:'analyticsController.js'});
  return sandbox.module.exports.getAdminAnalytics;
}

test('Batch 2 admin analytics charts honor 7, 30, 90 and 365 day selectors and agree with revenue KPIs', async () => {
  const getAdminAnalytics = makeController();
  for (const [days, totalRevenue] of [[7,120], [30,200], [90,240], [365,240]]) {
    let response;
    await getAdminAnalytics({ query: { days: String(days), location: 'Nasugbu' } }, {
      json: (data) => { response = data; return data; },
      status: (code) => { throw Error('Unexpected HTTP ' + code); },
    });
    assert.equal(response.trend.length, days, `${days}-day chart must have ${days} Manila day points`);
    assert.equal(response.kpis.totalRevenue, totalRevenue, `${days}-day KPI total mismatch`);
    assert.equal(
      response.trend.reduce((sum, row) => sum + row.sales, 0),
      totalRevenue,
      `${days}-day chart sales must agree with selected-period KPI`
    );
    assert.ok(response.trend.every((row) => /^\d{4}-\d{2}-\d{2}$/.test(row.date)));
  }
});

test('Batch 2 dashboard chart subtitle matches its 30-day API request', () => {
  const dashboard = fs.readFileSync(path.join(__dirname, '../../Cignal_Frontend/src/pages/admin/AdminDashboard.jsx'), 'utf8');
  assert.match(dashboard, /getAdminAnalytics\(\{ days: 30/);
  assert.match(dashboard, /Last 30 days · GMT\+8/);
});
