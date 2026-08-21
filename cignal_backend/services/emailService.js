const nodemailer = require('nodemailer');

let transporter = null;

function getEmailConfig() {
  return {
    host: String(process.env.SMTP_HOST || '').trim(),
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').trim().toLowerCase() === 'true',
    user: String(process.env.SMTP_USER || '').trim(),
    pass: String(process.env.SMTP_PASS || '').trim(),
    from: String(process.env.SMTP_FROM || process.env.SMTP_USER || '').trim(),
  };
}

function isEmailDeliveryConfigured() {
  const config = getEmailConfig();
  return Boolean(config.host && config.port && config.user && config.pass && config.from);
}

function getTransporter() {
  if (transporter) return transporter;
  const config = getEmailConfig();
  if (!isEmailDeliveryConfigured()) {
    throw new Error('Email delivery is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM.');
  }

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return transporter;
}

async function sendOtpEmail({ to, code, purpose }) {
  const config = getEmailConfig();
  const isVerification = purpose === 'verify_email';
  const title = isVerification ? 'Verify your CignalCare+ email' : 'Reset your CignalCare+ password';
  const instruction = isVerification
    ? 'Enter this code in CignalCare+ to verify your recovery email.'
    : 'Enter this code in CignalCare+ to continue resetting your password.';

  await getTransporter().sendMail({
    from: config.from,
    to,
    subject: title,
    text: `${instruction}\n\nVerification code: ${code}\n\nThis code expires in 10 minutes. If you did not request this, ignore this message.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#1f2937">
        <h2 style="color:#cc0000">${title}</h2>
        <p>${instruction}</p>
        <div style="font-size:30px;font-weight:800;letter-spacing:8px;margin:24px 0">${code}</div>
        <p style="font-size:13px;color:#6b7280">This code expires in 10 minutes. If you did not request this, you can ignore this message.</p>
      </div>
    `,
  });
}

module.exports = {
  isEmailDeliveryConfigured,
  sendOtpEmail,
};
