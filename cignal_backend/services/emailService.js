const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

let transporter = null;

const SUPPORTED_PROVIDERS = new Set(['smtp', 'brevo', 'resend']);

function clean(value) {
  return String(value || '').trim();
}

function getSelectedProvider() {
  const explicit = clean(process.env.EMAIL_PROVIDER).toLowerCase();
  if (SUPPORTED_PROVIDERS.has(explicit)) return explicit;

  // Safe auto-detection for existing environments.
  if (clean(process.env.BREVO_API_KEY)) return 'brevo';
  if (clean(process.env.RESEND_API_KEY)) return 'resend';
  return 'smtp';
}

function getSmtpConfig() {
  return {
    host: clean(process.env.SMTP_HOST),
    port: Number(process.env.SMTP_PORT || 587),
    secure: clean(process.env.SMTP_SECURE).toLowerCase() === 'true',
    user: clean(process.env.SMTP_USER),
    pass: clean(process.env.SMTP_PASS),
    from: clean(process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER),
  };
}

function getBrevoConfig() {
  return {
    apiKey: clean(process.env.BREVO_API_KEY),
    from: clean(
      process.env.EMAIL_FROM ||
      process.env.BREVO_FROM ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER
    ),
    timeoutMs: Number(process.env.EMAIL_API_TIMEOUT_MS || 15000),
  };
}

function getResendConfig() {
  return {
    apiKey: clean(process.env.RESEND_API_KEY),
    from: clean(
      process.env.EMAIL_FROM ||
      process.env.RESEND_FROM ||
      process.env.SMTP_FROM ||
      process.env.SMTP_USER
    ),
    timeoutMs: Number(process.env.EMAIL_API_TIMEOUT_MS || 15000),
  };
}

function parseFromAddress(value) {
  const raw = clean(value);
  const match = raw.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);

  if (match) {
    return {
      name: clean(match[1]) || 'CignalCare+',
      email: clean(match[2]),
    };
  }

  return {
    name: 'CignalCare+',
    email: raw,
  };
}

function isEmailDeliveryConfigured() {
  const provider = getSelectedProvider();

  if (provider === 'brevo') {
    const config = getBrevoConfig();
    return Boolean(config.apiKey && config.from);
  }

  if (provider === 'resend') {
    const config = getResendConfig();
    return Boolean(config.apiKey && config.from);
  }

  const config = getSmtpConfig();
  return Boolean(
    config.host &&
    config.port &&
    config.user &&
    config.pass &&
    config.from
  );
}

function getTransporter() {
  if (transporter) return transporter;

  const config = getSmtpConfig();

  if (
    !config.host ||
    !config.port ||
    !config.user ||
    !config.pass ||
    !config.from
  ) {
    throw new Error(
      'SMTP email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and EMAIL_FROM/SMTP_FROM.'
    );
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },

    // Prevent a blocked/slow SMTP connection from leaving the UI waiting
    // indefinitely during local development or on a compatible host.
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return transporter;
}

function buildOtpMessage({ code, purpose }) {
  const isVerification = purpose === 'verify_email';
  const title = isVerification
    ? 'Verify your CignalCare+ email'
    : 'Reset your CignalCare+ password';

  const instruction = isVerification
    ? 'Enter this code in CignalCare+ to verify your recovery email.'
    : 'Enter this code in CignalCare+ to continue resetting your password.';

  const text = `${instruction}\n\nVerification code: ${code}\n\nThis code expires in 10 minutes. If you did not request this, ignore this message.`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
      <h2 style="color:#cc0000">${title}</h2>
      <p>${instruction}</p>
      <div style="font-size:30px;font-weight:800;letter-spacing:8px;margin:24px 0">${code}</div>
      <p style="font-size:13px;color:#6b7280">
        This code expires in 10 minutes. If you did not request this, you can ignore this message.
      </p>
    </div>
  `;

  return { title, text, html };
}

function emailIdempotencyKey({ to, code, purpose }) {
  const digest = crypto
    .createHash('sha256')
    .update(`${purpose}:${clean(to).toLowerCase()}:${code}`)
    .digest('hex')
    .slice(0, 40);

  return `cignalcare-otp-${digest}`;
}

function providerError(error, provider) {
  const status = error?.response?.status;
  const responseMessage =
    error?.response?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.error ||
    error?.message;

  const safeMessage = [
    `${provider} email delivery failed`,
    status ? `(HTTP ${status})` : '',
    responseMessage ? `- ${String(responseMessage)}` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const wrapped = new Error(safeMessage);
  wrapped.code = `EMAIL_${provider.toUpperCase()}_FAILED`;
  wrapped.status = status || null;
  return wrapped;
}

async function sendViaBrevo({ to, code, purpose, message }) {
  const config = getBrevoConfig();

  if (!config.apiKey || !config.from) {
    throw new Error(
      'Brevo email delivery is not configured. Set BREVO_API_KEY and EMAIL_FROM.'
    );
  }

  const sender = parseFromAddress(config.from);

  try {
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender,
        to: [{ email: clean(to) }],
        subject: message.title,
        htmlContent: message.html,
        headers: {
          'Idempotency-Key': emailIdempotencyKey({ to, code, purpose }),
        },
      },
      {
        headers: {
          accept: 'application/json',
          'api-key': config.apiKey,
          'content-type': 'application/json',
        },
        timeout: config.timeoutMs,
      }
    );

    return {
      provider: 'brevo',
      messageId: response?.data?.messageId || null,
    };
  } catch (error) {
    throw providerError(error, 'brevo');
  }
}

async function sendViaResend({ to, code, purpose, message }) {
  const config = getResendConfig();

  if (!config.apiKey || !config.from) {
    throw new Error(
      'Resend email delivery is not configured. Set RESEND_API_KEY and EMAIL_FROM.'
    );
  }

  try {
    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from: config.from,
        to: [clean(to)],
        subject: message.title,
        text: message.text,
        html: message.html,
      },
      {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': emailIdempotencyKey({ to, code, purpose }),
        },
        timeout: config.timeoutMs,
      }
    );

    return {
      provider: 'resend',
      messageId: response?.data?.id || null,
    };
  } catch (error) {
    throw providerError(error, 'resend');
  }
}

async function sendViaSmtp({ to, message }) {
  const config = getSmtpConfig();

  const result = await getTransporter().sendMail({
    from: config.from,
    to: clean(to),
    subject: message.title,
    text: message.text,
    html: message.html,
  });

  return {
    provider: 'smtp',
    messageId: result?.messageId || null,
  };
}

async function sendOtpEmail({ to, code, purpose }) {
  if (!to || !code) {
    throw new Error('Email recipient and verification code are required.');
  }

  if (!isEmailDeliveryConfigured()) {
    const provider = getSelectedProvider();
    throw new Error(
      `Email delivery is not configured for provider "${provider}".`
    );
  }

  const provider = getSelectedProvider();
  const message = buildOtpMessage({ code, purpose });

  if (provider === 'brevo') {
    return sendViaBrevo({ to, code, purpose, message });
  }

  if (provider === 'resend') {
    return sendViaResend({ to, code, purpose, message });
  }

  return sendViaSmtp({ to, message });
}

module.exports = {
  getSelectedProvider,
  isEmailDeliveryConfigured,
  sendOtpEmail,
};
