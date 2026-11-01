'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const app = fs.readFileSync(path.join(root, 'Cignal_Frontend/src/App.jsx'), 'utf8');
const admin = fs.readFileSync(path.join(root, 'Cignal_Frontend/src/pages/admin/AdminWorkspace.jsx'), 'utf8');

test('route-level lazy imports retain protected routes and auth flow', () => {
  assert.match(app, /import \{ lazy, Suspense \} from 'react'/);
  assert.match(app, /const UserDashboard = lazy\(\(\) => import\('\.\/pages\/user\/UserDashboard'\)\)/);
  assert.match(app, /const AdminWorkspace = lazy\(\(\) => import\('\.\/pages\/admin\/AdminWorkspace'\)\)/);
  assert.match(app, /<Suspense fallback=/);
  assert.match(app, /<RoleRoute role="user">/);
  assert.match(app, /<RoleRoute role="admin">/);
  assert.match(app, /path="\/admin\/load-requests"/);
  assert.match(app, /path="\/user\/load-request"/);
});

test('all admin sections use on-demand imports and keep routing', () => {
  for (const section of ['AdminDashboard','AdminCustomers','AdminCustomerProfile','AdminTickets','AdminTechnicianRequests','AdminPOS','AdminPlans','AdminTransactions','AdminLoadRequests','AdminAnalytics','AdminIncidents','AdminSecurity']) {
    assert.match(admin, new RegExp('const '+section+' = lazy\\('), `${section} must be lazy-loaded`);
  }
  assert.match(admin, /function getSectionFromPath\(/);
  assert.match(admin, /'load-requests'/);
});

test('no payment and AI controllers imported into route entry point', () => {
  assert.doesNotMatch(app, /payMongoWebhookController|geminiService|aiUsageGuard/);
  assert.match(app, /path="\/admin\/security"/);
  assert.match(app, /path="\/user\/terms"/);
});
