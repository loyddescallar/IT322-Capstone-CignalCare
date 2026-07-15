const https = require('https');
const crypto = require('crypto');

const PAYMONGO_API_BASE =
  process.env.PAYMONGO_API_BASE || 'https://api.paymongo.com';

function getSecretKey() {
  return String(process.env.PAYMONGO_SECRET_KEY || '').trim();
}

function sanitizeIdempotencyKey(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9:_-]/g, '-')
    .slice(0, 255);

  return cleaned || crypto.randomUUID();
}

function getFriendlyGatewayMessage(parsed, statusCode) {
  const detail =
    parsed?.errors?.[0]?.detail ||
    parsed?.errors?.[0]?.title ||
    parsed?.error ||
    parsed?.message ||
    '';

  if (statusCode === 401 || statusCode === 403) {
    return 'PayMongo authentication failed. Check the server secret key.';
  }

  if (statusCode === 409) {
    return 'PayMongo rejected a duplicate or conflicting request.';
  }

  if (statusCode === 422) {
    return detail || 'PayMongo rejected the checkout details.';
  }

  if (statusCode >= 500) {
    return 'PayMongo is temporarily unavailable. Please try again shortly.';
  }

  return detail || 'PayMongo request failed.';
}

function paymongoRequest(
  requestPath,
  body,
  method = 'POST',
  { idempotencyKey } = {}
) {
  const secretKey = getSecretKey();

  if (!secretKey || secretKey.includes('your_paymongo_secret_key_here')) {
    const error = new Error(
      'PAYMONGO_SECRET_KEY is missing or still using the placeholder value.'
    );
    error.gatewayStatus = 500;
    throw error;
  }

  if (!secretKey.startsWith('sk_test_') && !secretKey.startsWith('sk_live_')) {
    const error = new Error(
      'Invalid PayMongo secret key format. Use a secret key starting with sk_test_ or sk_live_.'
    );
    error.gatewayStatus = 500;
    throw error;
  }

  const payload = body ? JSON.stringify(body) : null;
  const url = new URL(requestPath, PAYMONGO_API_BASE);
  const timeoutMs = Number(process.env.PAYMONGO_REQUEST_TIMEOUT_MS || 15000);

  const headers = {
    accept: 'application/json',
    authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
    'content-type': 'application/json',
  };

  if (payload) {
    headers['content-length'] = Buffer.byteLength(payload);
  }

  if (idempotencyKey) {
    headers['idempotency-key'] = sanitizeIdempotencyKey(idempotencyKey);
  }

  const options = {
    method,
    hostname: url.hostname,
    port: url.port || 443,
    path: `${url.pathname}${url.search}`,
    headers,
  };

  return new Promise((resolve, reject) => {
    const request = https.request(options, (response) => {
      let data = '';

      response.setEncoding('utf8');

      response.on('data', (chunk) => {
        data += chunk;
      });

      response.on('end', () => {
        let parsed = null;

        try {
          parsed = data ? JSON.parse(data) : null;
        } catch {
          parsed = { raw: data };
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(parsed);
          return;
        }

        const error = new Error(
          getFriendlyGatewayMessage(parsed, response.statusCode)
        );
        error.gatewayStatus = response.statusCode;
        error.details = parsed;
        reject(error);
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error('PayMongo request timed out.'));
    });

    request.on('error', (cause) => {
      const error = new Error(
        cause.message === 'PayMongo request timed out.'
          ? cause.message
          : 'Unable to connect to PayMongo. Please try again.'
      );
      error.gatewayStatus = 503;
      error.cause = cause;
      reject(error);
    });

    if (payload) request.write(payload);
    request.end();
  });
}

function getPaymentMethodTypes() {
  return (process.env.PAYMONGO_PAYMENT_METHOD_TYPES || 'qrph')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

async function createCheckoutSession({
  referenceNumber,
  planName,
  amount,
  accountName,
  accountNumber,
  requestId,
}) {
  const frontendUrl = (
    process.env.FRONTEND_URL ||
    process.env.CORS_ORIGIN ||
    'http://localhost:5173'
  ).replace(/\/$/, '');

  const cents = Math.round(Number(amount) * 100);

  if (!Number.isFinite(cents) || cents <= 0) {
    const error = new Error('Invalid checkout amount.');
    error.gatewayStatus = 400;
    throw error;
  }

  const payload = {
    data: {
      attributes: {
        line_items: [
          {
            name: String(planName || 'Cignal Load Plan').slice(0, 120),
            amount: cents,
            currency: 'PHP',
            quantity: 1,
          },
        ],
        payment_method_types: getPaymentMethodTypes(),
        success_url: `${frontendUrl}/user/load-request?payment=success&requestId=${requestId}`,
        cancel_url: `${frontendUrl}/user/load-request?payment=cancelled&requestId=${requestId}`,
        reference_number: referenceNumber,
        send_email_receipt: false,
        metadata: {
          load_request_id: String(requestId),
          account_number: String(accountNumber || ''),
          account_name: String(accountName || ''),
          plan_name: String(planName || ''),
        },
      },
    },
  };

  return paymongoRequest('/v2/checkout_sessions', payload, 'POST', {
    idempotencyKey: `load-request-${requestId}-${referenceNumber}`,
  });
}

module.exports = {
  createCheckoutSession,
  paymongoRequest,
  getPaymentMethodTypes,
  sanitizeIdempotencyKey,
};
