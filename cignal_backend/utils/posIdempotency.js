'use strict';

// An operation ID is generated once by the POS client and reused on uncertain
// retries. The database's unique prepaid_transactions.reference_no key is
// the concurrency-safe backstop; no new table or production migration needed.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function posReferenceFromKey(value) {
  const key = String(value ?? '').trim();
  if (!UUID_RE.test(key)) return null;
  return `POS-${key.toUpperCase()}`;
}

function isSamePosTransaction(existing, entry) {
  if (!existing || String(existing.status).toLowerCase() !== 'completed') return false;
  const expectedPlan = Number(entry.plan_id);
  return String(existing.account_number) === String(entry.accountNumber)
    && Number(existing.user_id) === Number(entry.user_id)
    && (!Number.isInteger(expectedPlan) || expectedPlan <= 0 || Number(existing.plan_id) === expectedPlan)
    && (!Number(entry.loadAmount) || Number(existing.amount) === Number(entry.loadAmount))
    && String(existing.payment_method) === String(entry.payment_method)
    && String(existing.reference_no) === String(entry.reference_no);
}

function replayConflict() {
  const error = new Error('This POS request identity was used for different transaction details. Verify transaction history.');
  error.code = 'POS_IDEMPOTENCY_CONFLICT';
  return error;
}

module.exports = { posReferenceFromKey, isSamePosTransaction, replayConflict };
