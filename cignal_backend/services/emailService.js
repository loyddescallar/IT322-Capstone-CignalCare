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

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildOtpMessage({ code, purpose }) {
  const isVerification = purpose === 'verify_email';

  const title = isVerification
    ? 'Verify your recovery email'
    : 'Password recovery code';

  const subject = isVerification
    ? 'CignalCare+ | Verify your recovery email'
    : 'CignalCare+ | Password recovery code';

  const instruction = isVerification
    ? 'Use the verification code below to confirm this email address for CignalCare+ account recovery.'
    : 'Use the security code below to continue resetting your CignalCare+ password.';

  const actionLabel = isVerification
    ? 'Email verification code'
    : 'Password recovery code';

  const safeCode = escapeHtml(code);
  const year = new Date().getFullYear();

  const text = [
    'CIGNALCARE+',
    'Descallar Satellite Services',
    '',
    title,
    '',
    instruction,
    '',
    `${actionLabel}: ${code}`,
    '',
    'This code expires in 10 minutes.',
    'For your security, never share this code with anyone.',
    '',
    'If you did not request this action, you can safely ignore this email.',
    '',
    'This is an automated CignalCare+ account security message.',
  ].join('\n');

  // Table-based and fully inline styling for broad Gmail/Yahoo/Outlook compatibility.
  // No external images are required, so the message remains branded even when
  // remote images are blocked by the recipient's email client.
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      ${escapeHtml(actionLabel)} for your CignalCare+ account. Expires in 10 minutes.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#f3f4f6;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
            style="width:100%;max-width:560px;background:#ffffff;border-collapse:separate;border-spacing:0;border-radius:18px;overflow:hidden;box-shadow:0 8px 28px rgba(17,24,39,0.08);">

            <tr>
              <td style="background:#e10600;padding:28px 32px;">
                <div style="font-size:29px;line-height:34px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                  CignalCare+
                </div>
                <div style="margin-top:5px;font-size:11px;line-height:16px;font-weight:700;color:#ffffff;letter-spacing:1.7px;text-transform:uppercase;">
                  Descallar Satellite Services
                </div>
              </td>
            </tr>

            <tr>
              <td style="padding:34px 32px 12px 32px;">
                <div style="font-size:11px;line-height:16px;font-weight:800;color:#e10600;letter-spacing:1.5px;text-transform:uppercase;">
                  Account Security
                </div>
                <h1 style="margin:8px 0 12px 0;font-size:25px;line-height:32px;font-weight:800;color:#111827;">
                  ${escapeHtml(title)}
                </h1>
                <p style="margin:0;font-size:15px;line-height:24px;color:#4b5563;">
                  ${escapeHtml(instruction)}
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 32px 8px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                  style="width:100%;background:#fff7f7;border:1px solid #fecaca;border-radius:14px;">
                  <tr>
                    <td align="center" style="padding:23px 18px 20px 18px;">
                      <div style="font-size:11px;line-height:16px;font-weight:800;color:#991b1b;letter-spacing:1.2px;text-transform:uppercase;">
                        ${escapeHtml(actionLabel)}
                      </div>
                      <div style="margin-top:10px;font-size:34px;line-height:42px;font-weight:800;color:#111827;letter-spacing:9px;">
                        ${safeCode}
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:12px 32px 6px 32px;">
                <span style="display:inline-block;padding:7px 12px;background:#f3f4f6;border-radius:999px;font-size:12px;line-height:18px;font-weight:700;color:#374151;">
                  Expires in 10 minutes
                </span>
              </td>
            </tr>

            <tr>
              <td style="padding:18px 32px 10px 32px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                  style="width:100%;background:#f9fafb;border-left:4px solid #e10600;border-radius:8px;">
                  <tr>
                    <td style="padding:15px 16px;">
                      <div style="font-size:13px;line-height:20px;font-weight:700;color:#1f2937;">
                        Keep your code private
                      </div>
                      <div style="margin-top:3px;font-size:13px;line-height:20px;color:#6b7280;">
                        CignalCare+ will never ask you to share this security code with another person.
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:12px 32px 34px 32px;">
                <p style="margin:0;font-size:13px;line-height:21px;color:#6b7280;">
                  If you did not request this action, you can safely ignore this email. No account change will be completed without the correct code.
                </p>
              </td>
            </tr>

            <tr>
              <td style="border-top:1px solid #e5e7eb;background:#fafafa;padding:20px 32px;text-align:center;">
                <div style="font-size:12px;line-height:18px;font-weight:700;color:#374151;">
                  CignalCare+ · Descallar Satellite Services
                </div>
                <div style="margin-top:4px;font-size:11px;line-height:17px;color:#9ca3af;">
                  Automated account security message · Please do not reply<br>
                  © ${year} Descallar Satellite Services
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { title: subject, text, html };
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
        textContent: message.text,
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
