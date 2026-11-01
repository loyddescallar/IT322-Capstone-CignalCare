'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { audit } = require('../scripts/auditWebsiteStatic.cjs');
const project = path.resolve(__dirname, '../..');

test('Batch 2: all declared navigation routes, public assets, imports and API contracts resolve', () => {
  const result = audit();
  assert.ok(result.stats.frontendFiles >= 50, 'Complete frontend source must be present');
  assert.ok(result.stats.pageRoutes >= 30, 'Protected/admin/user routes must be audited');
  assert.ok(result.stats.publicAssetReferences >= 10, 'Public media/download links must be audited');
  assert.ok(result.stats.apiCalls >= 30, 'API link coverage must include frontend clients');
  assert.equal(result.errors.length, 0, result.errors.join('\n'));
});

test('Batch 2: Excel download serves a real xlsx file with required subscriber import headers', () => {
  const file = path.join(project, 'Cignal_Frontend/public/templates/CignalCare_Subscriber_Import_Template.xlsx');
  const payload = fs.readFileSync(file);
  assert.ok(payload.length > 1000, 'Template must be a populated .xlsx file');
  assert.equal(payload.toString('hex', 0, 4), '504b0304', 'An .xlsx file must be a ZIP container, not SPA HTML');
  const frontend = fs.readFileSync(path.join(project, 'Cignal_Frontend/src/pages/admin/AdminCustomers.jsx'), 'utf8');
  assert.ok(frontend.includes('/templates/CignalCare_Subscriber_Import_Template.xlsx'));
});

test('Batch 2: existing security-sensitive integrations are not changed by the template repair', () => {
  const server = fs.readFileSync(path.join(project, 'cignal_backend/server.js'), 'utf8');
  assert.match(server, /\/api\/health/);
  assert.match(server, /\/api\/load-requests\/paymongo\/webhook/);
  assert.match(server, /\/api\/chatbot/);
  assert.match(server, /\/api\/tickets/);
});

test('Batch 2: the downloadable Excel template is accepted by the actual subscriber parser', async () => {
  const ExcelJS = require('exceljs');
  const { parseSubscriberWorkbook } = require('../services/subscriberImportService');
  const buffer = fs.readFileSync(path.join(project, 'Cignal_Frontend/public/templates/CignalCare_Subscriber_Import_Template.xlsx'));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  assert.ok(sheet, 'Template must have a worksheet');
  const names = sheet.getRow(1).values.slice(1);
  assert.deepEqual(names, ['NAME', 'ADDRESS', 'CCA NUMBER', 'ACCT NUMBER', 'EMAIL', 'PHONE']);
  sheet.getCell('A2').value = 'TEST ONLY';
  sheet.getCell('B2').value = 'Sample Road';
  sheet.getCell('C2').value = '1234567890';
  sheet.getCell('D2').value = '12345678';
  const sample = await workbook.xlsx.writeBuffer();
  const rows = await parseSubscriberWorkbook(sample, 'Balayan');
  assert.equal(rows.length, 1, 'Blank template rows must be ignored');
  assert.equal(rows[0].accountNumber, '12345678');
  assert.equal(rows[0].ccaNumber, '1234567890');
  assert.deepEqual(rows[0].errors, [], 'A correctly filled template row should pass validation');
});
