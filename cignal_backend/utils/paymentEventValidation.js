'use strict';

class PaymentVerificationError extends Error {
  constructor(code) {
    super(`PayMongo payment verification failed: ${code}`);
    this.code = code;
    this.statusCode = 422;
  }
}

/**
 * Compare a *signature-verified* paid webhook with the checkout order saved
 * in our own database. Never trust amount, customer or status from browser.
 */
function validatePaidPaymentEvent({ webhook, request, livemode, secretKey }) {
  const fail = (code) => { throw new PaymentVerificationError(code); };
  if (!request) fail('ORDER_NOT_FOUND');
  if (String(request.payment_method) !== 'PayMongo') fail('NOT_PAYMONGO_ORDER');
  const ref = String(webhook?.referenceNo || '');
  const session = String(webhook?.checkoutSessionId || '');
  const savedRef = String(request.reference_no || '');
  const savedSession = String(request.paymongo_checkout_session_id || '');
  // Require the known checkout session. A generic payment event with only a
  // reference number cannot satisfy a hosted checkout order.
  if (!savedSession || !session || savedSession !== session) fail('CHECKOUT_MISMATCH');
  if (!savedRef || !ref || savedRef !== ref) fail('REFERENCE_MISMATCH');

  const meta = webhook?.resourceAttributes?.metadata || {};
  if (meta.load_request_id != null && String(meta.load_request_id) !== String(request.id)) {
    fail('ORDER_METADATA_MISMATCH');
  }
  const attrs = webhook?.paymentAttributes || {};
  const amountCents = attrs.amount;
  const expectedCents = Math.round(Number(request.amount) * 100);
  if (!Number.isSafeInteger(expectedCents) || expectedCents <= 0) fail('INVALID_ORDER_AMOUNT');
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) fail('MISSING_OR_INVALID_PAYMENT_AMOUNT');
  if (amountCents !== expectedCents) fail('AMOUNT_MISMATCH');
  if (String(attrs.currency || '').toUpperCase() !== 'PHP') fail('CURRENCY_MISMATCH');
  if (String(attrs.status || '').toLowerCase() !== 'paid') fail('PAYMENT_NOT_PAID');
  const mode = String(secretKey || '');
  if (mode.startsWith('sk_live_') && livemode !== true) fail('MODE_MISMATCH');
  if (mode.startsWith('sk_test_') && livemode !== false) fail('MODE_MISMATCH');
  return true;
}

module.exports = { validatePaidPaymentEvent, PaymentVerificationError };
