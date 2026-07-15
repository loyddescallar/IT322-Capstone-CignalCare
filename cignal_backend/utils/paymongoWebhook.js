const crypto = require('crypto');

function safeEqualHex(left, right) {
  try {
    const leftValue = String(left || '').trim();
    const rightValue = String(right || '').trim();

    if (
      !leftValue ||
      !rightValue ||
      !/^[0-9a-f]+$/i.test(leftValue) ||
      !/^[0-9a-f]+$/i.test(rightValue) ||
      leftValue.length % 2 !== 0 ||
      rightValue.length % 2 !== 0
    ) {
      return false;
    }

    const leftBuffer = Buffer.from(leftValue, 'hex');
    const rightBuffer = Buffer.from(rightValue, 'hex');

    return (
      leftBuffer.length === rightBuffer.length &&
      crypto.timingSafeEqual(leftBuffer, rightBuffer)
    );
  } catch {
    return false;
  }
}

function parseSignatureHeader(header) {
  const parsed = {};

  String(header || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const index = part.indexOf('=');
      if (index === -1) return;

      const key = part.slice(0, index).trim().toLowerCase();
      const value = part.slice(index + 1).trim();
      if (key) parsed[key] = value;
    });

  return parsed;
}

function getExpectedModeSignature(parsed) {
  const secretKey = String(process.env.PAYMONGO_SECRET_KEY || '').trim();

  if (secretKey.startsWith('sk_live_')) return parsed.li || '';
  if (secretKey.startsWith('sk_test_')) return parsed.te || '';

  return parsed.te || parsed.li || '';
}

function verifyPayMongoSignature(req, rawBody) {
  const secret = String(process.env.PAYMONGO_WEBHOOK_SECRET || '').trim();
  const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
  const allowUnsigned =
    String(process.env.PAYMONGO_ALLOW_UNSIGNED_WEBHOOKS || '').toLowerCase() ===
    'true';

  if (!secret) {
    const allowed = !isProduction && allowUnsigned;

    return {
      valid: allowed,
      reason: allowed
        ? 'Unsigned webhook accepted because local testing was explicitly enabled.'
        : 'PAYMONGO_WEBHOOK_SECRET is not configured.',
      unsigned: true,
    };
  }

  const signatureHeader =
    req.headers['paymongo-signature'] ||
    req.headers['x-paymongo-signature'] ||
    '';

  if (!signatureHeader) {
    return { valid: false, reason: 'Missing PayMongo signature header.' };
  }

  const rawBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody || '');
  const parsed = parseSignatureHeader(signatureHeader);

  // Current PayMongo structured signature: t=<timestamp>,te=<test>,li=<live>
  if (parsed.t && (parsed.te !== undefined || parsed.li !== undefined)) {
    const timestamp = Number(parsed.t);
    const toleranceSeconds = Number(
      process.env.PAYMONGO_WEBHOOK_TOLERANCE_SECONDS || 300
    );

    if (!Number.isFinite(timestamp)) {
      return { valid: false, reason: 'Invalid PayMongo signature timestamp.' };
    }

    if (
      Number.isFinite(toleranceSeconds) &&
      toleranceSeconds > 0 &&
      Math.abs(Math.floor(Date.now() / 1000) - timestamp) > toleranceSeconds
    ) {
      return { valid: false, reason: 'PayMongo webhook timestamp is too old.' };
    }

    const signedPayload = `${parsed.t}.${rawBuffer.toString('utf8')}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');
    const provided = getExpectedModeSignature(parsed);

    return {
      valid: Boolean(provided) && safeEqualHex(expected, provided),
      reason: provided
        ? 'Structured PayMongo signature checked.'
        : 'Signature for the current PayMongo mode is missing.',
      unsigned: false,
    };
  }

  // Backward-compatible support for older/simple raw-body signature headers.
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBuffer)
    .digest('hex');

  return {
    valid: safeEqualHex(expected, signatureHeader),
    reason: 'Legacy raw-body PayMongo signature checked.',
    unsigned: false,
  };
}

function hashWebhookPayload(rawBody) {
  const rawBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody || '');

  return crypto.createHash('sha256').update(rawBuffer).digest('hex');
}

function extractPayMongoWebhookData(json) {
  const event = json?.data || {};
  const eventAttributes = event?.attributes || {};
  const resource = eventAttributes?.data || event?.data || null;
  const resourceAttributes = resource?.attributes || {};

  const eventType =
    eventAttributes?.type || event?.type || json?.type || null;
  const eventId = event?.id || json?.id || null;

  const metadata =
    resourceAttributes?.metadata ||
    eventAttributes?.metadata ||
    {};

  const referenceNo =
    resourceAttributes?.reference_number ||
    resourceAttributes?.referenceNumber ||
    metadata?.reference_number ||
    metadata?.referenceNo ||
    null;

  const checkoutSessionId =
    (resource?.type === 'checkout_session' ? resource?.id : null) ||
    resourceAttributes?.checkout_session_id ||
    resourceAttributes?.checkoutSessionId ||
    resourceAttributes?.checkout_session?.id ||
    null;

  const paymentIntent =
    resourceAttributes?.payment_intent ||
    eventAttributes?.payment_intent ||
    null;

  const paymentIntentId =
    paymentIntent?.id ||
    resourceAttributes?.payment_intent_id ||
    resourceAttributes?.paymentIntentId ||
    null;

  const payment = Array.isArray(resourceAttributes?.payments)
    ? resourceAttributes.payments[0]
    : resourceAttributes?.payment ||
      (resource?.type === 'payment' ? resource : null);

  const paymentAttributes = payment?.attributes || resourceAttributes || {};
  const paymentId = payment?.id || (resource?.type === 'payment' ? resource?.id : null);

  const paymentMethod =
    paymentAttributes?.source?.type ||
    paymentAttributes?.payment_method_type ||
    paymentAttributes?.payment_method?.type ||
    resourceAttributes?.payment_method_type ||
    null;

  return {
    eventId,
    eventType,
    resource,
    resourceAttributes,
    referenceNo,
    checkoutSessionId,
    paymentIntentId,
    paymentId,
    paymentMethod,
    paymentAttributes,
  };
}

module.exports = {
  parseSignatureHeader,
  verifyPayMongoSignature,
  hashWebhookPayload,
  extractPayMongoWebhookData,
};
