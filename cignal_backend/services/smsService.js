const axios = require('axios');

function clean(value) {
  return String(value || '').trim();
}

function normalizePhilippinePhone(value) {
  const digits = clean(value).replace(/\D/g, '');
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^9\d{9}$/.test(digits)) return `+63${digits}`;
  return null;
}

function maskPhone(value) {
  const normalized = normalizePhilippinePhone(value);
  if (!normalized) return '';
  const local = `0${normalized.slice(3)}`;
  return `${local.slice(0, 3)}${'*'.repeat(6)}${local.slice(-2)}`;
}

function getUniSmsConfig() {
  return {
    apiBase: clean(process.env.UNISMS_API_BASE || 'https://unismsapi.com/api').replace(/\/$/, ''),
    apiSecret: clean(process.env.UNISMS_API_SECRET),
    senderId: clean(process.env.UNISMS_SENDER_ID),
    timeoutMs: Number(process.env.SMS_API_TIMEOUT_MS || 15000),
  };
}

function isSmsDeliveryConfigured() {
  const provider = clean(process.env.SMS_PROVIDER || 'unisms').toLowerCase();
  if (provider !== 'unisms') return false;
  const config = getUniSmsConfig();
  return Boolean(config.apiSecret && config.senderId);
}

async function sendOtpSms({ to, code, purpose = 'account_number_recovery' }) {
  const provider = clean(process.env.SMS_PROVIDER || 'unisms').toLowerCase();
  if (provider !== 'unisms') {
    throw new Error(`Unsupported SMS provider: ${provider || 'none'}`);
  }

  const config = getUniSmsConfig();
  if (!config.apiSecret || !config.senderId) {
    throw new Error('UniSMS is not configured. Set UNISMS_API_SECRET and UNISMS_SENDER_ID.');
  }

  const recipient = normalizePhilippinePhone(to);
  if (!recipient) {
    const error = new Error('The registered mobile number is not a valid Philippine mobile number.');
    error.code = 'INVALID_PHONE';
    throw error;
  }

  const labels = {
    account_number_recovery: 'account recovery',
    password_reset: 'password recovery',
    admin_login: 'admin login',
    admin_contact_verification: 'Admin contact verification',
    verify_phone: 'mobile verification',
  };
  const label = labels[purpose] || 'verification';
  const content = `CignalCare+ ${label} code: ${code}. Expires in 10 minutes. Do not share this code.`;

  try {
    const response = await axios.post(
      `${config.apiBase}/sms`,
      {
        recipient,
        content,
        sender_id: config.senderId,
        metadata: {
          system: 'CignalCare+',
          purpose,
        },
      },
      {
        auth: {
          username: config.apiSecret,
          password: '',
        },
        timeout: config.timeoutMs,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const providerMessage =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      'Unknown SMS delivery error';

    const wrapped = new Error(
      `UniSMS delivery failed${status ? ` (HTTP ${status})` : ''}: ${String(providerMessage)}`
    );
    wrapped.code = 'SMS_UNISMS_FAILED';
    wrapped.status = status || null;
    throw wrapped;
  }
}

module.exports = {
  normalizePhilippinePhone,
  maskPhone,
  isSmsDeliveryConfigured,
  sendOtpSms,
};
