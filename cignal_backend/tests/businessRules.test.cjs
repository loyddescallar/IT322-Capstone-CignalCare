const test = require('node:test');
const assert = require('node:assert/strict');
const backend = require('../utils/subscriberLifecycle');
let frontend;
test.before(async () => {
  frontend = await import('../../Cignal_Frontend/src/utils/adminBusinessRules.js');
});
const reference = new Date('2026-10-19T04:00:00+08:00');

test('PH-local lifecycle transitions match on backend and frontend', () => {
  for (const [day, expected] of [
    [0, 'Active'], [59, 'Active'], [60, 'At Risk'], [89, 'At Risk'],
    [90, 'Inactive'], [119, 'Inactive'], [120, 'Archive Eligible'],
    [140, 'Archive Eligible'],
  ]) {
    const value = new Date(reference.getTime() - day * 86400000);
    assert.equal(backend.subscriberLifecycle(value, reference), expected);
    assert.equal(frontend.subscriberLifecycle(value, reference), expected);
  }
  assert.equal(frontend.subscriberLifecycle(null, reference), 'No Load Yet');
  assert.equal(backend.subscriberLifecycle(null, reference), 'No Load Yet');
});

test('Manila-local inclusive date filters respect midnight', () => {
  assert.equal(frontend.manilaDayKey('2026-10-18T15:59:59Z'), '2026-10-18');
  assert.equal(frontend.manilaDayKey('2026-10-18T16:00:00Z'), '2026-10-19');
  assert.deepEqual(frontend.dateBounds('Today', '', '', reference), { from: '2026-10-19', to: '2026-10-19' });
  assert.deepEqual(frontend.dateBounds('This Week', '', '', reference), { from: '2026-10-19', to: '2026-10-19' });
  assert.deepEqual(frontend.dateBounds('This Month', '', '', reference), { from: '2026-10-01', to: '2026-10-19' });
  assert.equal(frontend.isInManilaRange('2026-10-18T16:00:00Z', '2026-10-19', '2026-10-19'), true);
  assert.equal(frontend.isInManilaRange('2026-10-19T15:59:59Z', '2026-10-19', '2026-10-19'), true);
  assert.equal(frontend.isInManilaRange('2026-10-19T16:00:00Z', '2026-10-19', '2026-10-19'), false);
});

test('only completed sales produce gross profit of PHP 40 per load', () => {
  const sales = [
    { status: 'completed', amount: '250.00', payment_method: 'Cash', reference_no: 'POS-1' },
    { status: 'completed', amount: 450, payment_method: 'PayMongo', reference_no: 'PM-1' },
    { status: 'pending', amount: 1000 },
    { status: 'failed', amount: 1000 },
    { status: 'cancelled', amount: 1000 },
  ];
  assert.deepEqual(frontend.salesSummary(sales), { transactions: 2, sales: 700, grossProfit: 80 });
  assert.deepEqual(frontend.salesSummary([]), { transactions: 0, sales: 0, grossProfit: 0 });
  assert.equal(frontend.isPosSale(sales[0]), true);
  assert.equal(frontend.isPosSale(sales[1]), false);
});
