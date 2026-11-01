'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  normalizeServicePayment, serviceReferenceFromKey, serviceFingerprint, manilaDateBounds,
} = require('../utils/servicePaymentRules');
const root = path.join(__dirname, '..', '..');
function valid(overrides = {}) {
  return {
    accountNumber: '50000009', serviceType: 'Signal / Dish Repair', description: 'Dish cable repaired',
    amount: '350.00', paymentMethod: 'Cash', externalReference: '',
    transactionDate: '2026-11-02', technicianRequestId: null, ...overrides,
  };
}
test('FT-02 accepts complete collected cash payment and preserves entered date', () => {
  const result = normalizeServicePayment(valid());
  assert.equal(result.error, undefined);
  assert.equal(result.value.amountCents, 35000);
  assert.equal(result.value.transactionDate, '2026-11-02');
  assert.equal(result.value.paymentMethod, 'Cash');
});
test('FT-02 rejects blank and invalid amounts, future dates, and missing transaction dates', () => {
  for(const amount of ['', '0', '-1', '10.001', 'NaN', '1000000.01']) {
    assert.ok(normalizeServicePayment(valid({ amount })).error, `should reject ${amount}`);
  }
  for(const date of ['', '2026-02-30', '2099-01-01', 'not-a-date']) {
    assert.ok(normalizeServicePayment(valid({transactionDate:date})).error, `should reject ${date}`);
  }
});
test('FT-02 requires GCash reference and validates matching account request ids', () => {
  assert.ok(normalizeServicePayment(valid({paymentMethod:'GCash'})).error);
  assert.equal(normalizeServicePayment(valid({paymentMethod:'GCash',externalReference:'GCASH-123456'})).error,undefined);
  assert.ok(normalizeServicePayment(valid({technicianRequestId: '-3'})).error);
  assert.ok(normalizeServicePayment(valid({serviceType:'Other',description:''})).error);
});
test('FT-02 idempotency ties a UUID to all payment details including transaction date',()=>{
  const key='5e0ef274-8b56-437d-8a13-2c916857cc3f';
  assert.equal(serviceReferenceFromKey(key),'SRV-'+key.toUpperCase());
  assert.equal(serviceReferenceFromKey('user-supplied-reference'),null);
  const first = normalizeServicePayment(valid()).value;
  const second=normalizeServicePayment(valid({transactionDate:'2026-11-01'})).value;
  assert.notEqual(serviceFingerprint(first,1009),serviceFingerprint(second,1009));
});
test('FT-02 validates date filters and retains end-date inclusivity',()=>{
  assert.deepEqual(manilaDateBounds('2026-11-01','2026-11-02'),{startDate:'2026-11-01',endDate:'2026-11-02'});
  assert.equal(manilaDateBounds('2026-11-03','2026-11-02'),null);
  assert.equal(manilaDateBounds('2026-02-30',''),null);
});
test('FT-02 routes require admin; standalone manual payments never call load or PayMongo', () => {
  const route=fs.readFileSync(path.join(__dirname,'../routes/servicePaymentRoutes.js'),'utf8');
  const controller=fs.readFileSync(path.join(__dirname,'../controllers/servicePaymentController.js'),'utf8');
  const model=fs.readFileSync(path.join(__dirname,'../models/servicePaymentModel.js'),'utf8');
  assert.match(route,/authRequired, requireRole\('admin'\)/);
  assert.match(controller,/paymentConfirmed !== true \|\| req\.body\?\.serviceCompleted !== true/);
  assert.doesNotMatch(model,/UPDATE\s+technician_requests/i);
  assert.doesNotMatch(model,/prepaid_transactions|PayMongo|load_history|prepaid_accounts/i);
  assert.match(model,/transaction_date\)/);
});
test('FT-02 schema is isolated and enforces GCash reference uniqueness',()=>{
  for(const engine of ['mysql','postgres']) {
    const s=fs.readFileSync(path.join(root,'cignal_backend/sql/migrations',`20261102_service_payments_${engine}.sql`),'utf8');
    assert.match(s,/CREATE TABLE IF NOT EXISTS (?:public\.)?service_payments/i);
    assert.doesNotMatch(s,/TRUNCATE|DROP TABLE|DELETE FROM|ALTER TABLE\s+users/i);
    assert.match(s,/UNIQUE/i);
    assert.match(s,/transaction_date DATE NOT NULL/);
  }
});
test('FT-02 reports service and prepaid revenue separately, profit remains prepaid-only',()=>{
  const src=fs.readFileSync(path.join(__dirname,'../controllers/analyticsController.js'),'utf8');
  assert.match(src,/const prepaidRevenue/);
  assert.match(src,/const serviceRevenue/);
  assert.match(src,/totalRevenue: Number\(\(prepaidRevenue \+ serviceRevenue\)/);
  assert.match(src,/grossProfit: sales\.length \* 40/);
  assert.match(src,/serviceTransactions: servicePayments\.length/);
});
