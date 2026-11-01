const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const backend = path.resolve(__dirname, '..');
const locationFiles = [
  ['Cignal_Frontend/src/pages/admin/AdminCustomers.jsx', "'Tuy'"],
  ['Cignal_Frontend/src/pages/admin/AdminDashboard.jsx', "'Tuy'"],
  ['Cignal_Frontend/src/pages/admin/AdminAnalytics.jsx', "'Tuy'"],
  ['Cignal_Frontend/src/pages/admin/AdminTickets.jsx', "'Tuy'"],
  ['Cignal_Frontend/src/pages/admin/AdminLoadRequests.jsx', "'Tuy'"],
  ['Cignal_Frontend/src/pages/admin/AdminTechnicianRequests.jsx', "'Tuy'"],
  ['Cignal_Frontend/src/pages/admin/AdminCustomerProfile.jsx', "'Tuy'"],
  ['cignal_backend/models/userModel.js', "'Tuy'"],
  ['cignal_backend/utils/adminFilteredLists.js', "'Tuy'"],
  ['cignal_backend/controllers/analyticsController.js', "'Tuy'"],
];
test('Tuy is present in active admin location choices and validation', () => {
  for (const [file, token] of locationFiles) {
    const full = path.join(root, file);
    assert.ok(fs.readFileSync(full,'utf8').includes(token), file);
  }
});
test('required account schema and Tuy enum exist', () => {
  const sql=fs.readFileSync(path.join(backend,'sql/CignalCare_Schema.sql'),'utf8');
  assert.match(sql,/account_recovery_challenges/);
  assert.match(sql,/recovery_phone/);
  assert.match(sql,/terms_accepted_at/);
  assert.match(sql,/Nasugbu','Lemery','Tuy/);
});
