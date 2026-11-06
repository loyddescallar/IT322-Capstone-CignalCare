'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

test('Service Payment Recording router is imported and mounted under /api/service-payments', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /const\s+servicePaymentRoutes\s*=\s*require\(['"]\.\/routes\/servicePaymentRoutes['"]\)/);
  assert.match(server, /app\.use\(['"]\/api\/service-payments['"]\s*,\s*servicePaymentRoutes\s*\)/);
  const routes = fs.readFileSync(path.join(root, 'routes', 'servicePaymentRoutes.js'), 'utf8');
  assert.match(routes, /router\.use\(authRequired\s*,\s*requireRole\(['"]admin['"]\)\)/);
  assert.match(routes, /router\.get\(['"]\/['"]\s*,\s*getServicePayments\)/);
  assert.match(routes, /router\.post\(['"]\/['"]\s*,\s*createServicePayment\)/);
});

test('the admin frontend uses the registered history endpoint and the approved name', () => {
  const ui = fs.readFileSync(path.join(root, '..', 'Cignal_Frontend', 'src', 'components', 'admin', 'ServicePaymentTerminal.jsx'), 'utf8');
  assert.match(ui, /axiosClient\.get\(['"]\/service-payments['"]/);
  assert.match(ui, /Service Payment Recording/);
  assert.doesNotMatch(ui, /FT-02/);
});
