"use strict";
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('Cignal_Frontend/src/pages/user/UserRetrieveInfo.jsx');

test('CCA Inquiry imports the real subscriber lifecycle function before rendering account status', () => {
  assert.match(page, /import\s*\{\s*subscriberLifecycle\s*\}\s*from\s*['"]\.\.\/\.\.\/utils\/adminBusinessRules(?:\.js)?['"]/);
  assert.match(page, /function\s+getActivityStatus\s*\(lastLoadDate\)\s*\{\s*return subscriberLifecycle\(lastLoadDate\);\s*\}/);
  assert.match(page, /const actStatus\s*=\s*result\s*\?\s*getActivityStatus\(result\.lastLoadDate\)/);
});

test('CCA Inquiry distinguishes missing account, authorization and temporary failures; supplementary data failures remain visible', () => {
  assert.match(page, /\/\^\\d\{1,11\}\$\//); // numeric account or CCA input
  assert.match(page, /encodeURIComponent\(searchKey\)/);
  assert.match(page, /response\?\.status\s*===\s*404/);
  assert.match(page, /response\?\.status\s*===\s*403/);
  assert.match(page, /response\?\.status\s*===\s*429/);
  assert.match(page, /Promise\.allSettled/);
  assert.match(page, /setHistoryWarning\(/);
  assert.match(page, /role="alert"/);
});

test('CCA Inquiry keeps subscriber-only ownership checks and lifecycle thresholds', async () => {
  const customerRoutes = read('cignal_backend/routes/customerRoutes.js');
  const customerController = read('cignal_backend/controllers/customerController.js');
  assert.match(customerRoutes, /router\.get\('\/:accountId',\s*authRequired,\s*getCustomerByAccount\)/);
  assert.match(customerController, /if\s*\(!canViewCustomer\(req,\s*user\)\)\s*return res\.status\(403\)/);
  assert.match(customerController, /isSelf\(req,\s*customer\.id\)\s*\|\|\s*ownsAccount\(req,\s*customer\.accountNumber\)/);
  const rules = read('Cignal_Frontend/src/utils/adminBusinessRules.js');
  const { subscriberLifecycle } = await import('data:text/javascript;base64,' + Buffer.from(rules).toString('base64'));
  const now = new Date('2026-11-21T12:00:00+08:00');
  const daysAgo = days => new Date(now.getTime() - days * 86400000);
  assert.equal(subscriberLifecycle(null, now), 'No Load Yet');
  assert.equal(subscriberLifecycle(daysAgo(59), now), 'Active');
  assert.equal(subscriberLifecycle(daysAgo(60), now), 'Inactive');
  assert.equal(subscriberLifecycle(daysAgo(119), now), 'Inactive');
  assert.equal(subscriberLifecycle(daysAgo(120), now), 'At Risk');
});
