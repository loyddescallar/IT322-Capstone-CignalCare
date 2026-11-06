'use strict';
const crypto = require('node:crypto');
const SERVICE_TYPES = Object.freeze([
  'Signal / Dish Repair',
  'Dish Realignment',
  'Cable Replacement',
  'Box Replacement',
  'New Installation',
  'Relocation',
  'Other',
]);
const METHODS = Object.freeze(['Cash', 'GCash']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeServicePayment(body = {}) {
  const accountNumber = String(body.accountNumber || '').trim();
  const serviceType = String(body.serviceType || '').trim();
  const description = String(body.description || '').trim();
  const paymentMethod = String(body.paymentMethod || '').trim();
  // GCash reference codes are case-insensitive; normalize before fingerprinting
  // and persistence so retries with different letter case remain idempotent.
  const externalReferenceInput = String(body.externalReference || '').trim();
  const externalReference = paymentMethod === 'GCash' ? externalReferenceInput.toUpperCase() : externalReferenceInput;
  const rawAmount = String(body.amount ?? '').trim();
  const transactionDate = String(body.transactionDate || '').trim();
  const requestIdRaw = body.technicianRequestId == null ? '' : String(body.technicianRequestId).trim();
  if (!/^\d{1,9}$/.test(accountNumber)) return { error: 'Enter a valid subscriber account number.' };
  if (!SERVICE_TYPES.includes(serviceType)) return { error: 'Choose a valid completed service type.' };
  if (description.length > 500 || (serviceType === 'Other' && description.length < 5)) {
    return { error: 'Provide service details (5–500 characters for Other).' };
  }
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(rawAmount)) return { error: 'Enter an amount with up to two decimal places.' };
  const amountCents = Math.round(Number(rawAmount) * 100);
  if (!Number.isSafeInteger(amountCents) || amountCents < 100 || amountCents > 100000000) {
    return { error: 'Service payment must be between ₱1.00 and ₱1,000,000.00.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(transactionDate) ||
      Number.isNaN(Date.parse(`${transactionDate}T00:00:00Z`)) ||
      new Date(`${transactionDate}T00:00:00Z`).toISOString().slice(0,10) !== transactionDate ||
      transactionDate > new Date(Date.now() + 8 * 3600000).toISOString().slice(0,10)) {
    return { error: 'Enter a valid transaction date, not later than today (Manila time).' };
  }
  if (!METHODS.includes(paymentMethod)) return { error: 'Payment method must be Cash or GCash.' };
  if (externalReference.length > 120 || (paymentMethod === 'GCash' && !externalReference)) {
    return { error: 'Enter the verified GCash reference (120 characters maximum).' };
  }
  if (paymentMethod === 'Cash' && externalReference) {
    return { error: 'Cash transactions cannot contain a GCash reference.' };
  }
  if (requestIdRaw && (!/^\d{1,10}$/.test(requestIdRaw) || Number(requestIdRaw) > 2147483647 || Number(requestIdRaw) < 1)) {
    return { error: 'Technician request ID must be a valid positive number.' };
  }
  return { value: {
    accountNumber,
    serviceType,
    description,
    amountCents,
    amount: (amountCents / 100).toFixed(2),
    paymentMethod,
    externalReference,
    technicianRequestId: requestIdRaw ? Number(requestIdRaw) : null,
    transactionDate,
  } };
}
function serviceReferenceFromKey(value) {
  const key = String(value || '').trim();
  return UUID_RE.test(key) ? `SRV-${key.toUpperCase()}` : null;
}
function serviceFingerprint(payload, userId) {
  return crypto.createHash('sha256').update(JSON.stringify([
    Number(userId), payload.accountNumber, payload.serviceType, payload.description,
    payload.amountCents, payload.paymentMethod, payload.externalReference, payload.technicianRequestId, payload.transactionDate,
  ])).digest('hex');
}
function manilaDateBounds(from, to) {
  const valid = d => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0,10) === d;
  if ((from && !valid(from)) || (to && !valid(to)) || (from && to && from > to)) return null;
  return { startDate: from || null, endDate: to || null };
}
module.exports = { SERVICE_TYPES, METHODS, normalizeServicePayment, serviceReferenceFromKey, serviceFingerprint, manilaDateBounds };
