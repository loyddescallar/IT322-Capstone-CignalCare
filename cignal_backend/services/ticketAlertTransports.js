'use strict';
const axios = require('axios');
const nodemailer = require('nodemailer');
const { normalizePhilippinePhone, isSmsDeliveryConfigured } = require('./smsService');
const { isEmailDeliveryConfigured, getSelectedProvider } = require('./emailService');
const clean = x => String(x || '').trim();

async function sendTicketSms({ to, message }) {
  if (!isSmsDeliveryConfigured()) throw new Error('UniSMS is not configured.');
  const recipient=normalizePhilippinePhone(to);
  if (!recipient) throw new Error('Invalid SMS recipient.');
  const apiBase=clean(process.env.UNISMS_API_BASE || 'https://unismsapi.com/api').replace(/\/$/,'');
  const response=await axios.post(`${apiBase}/sms`,{
    recipient,content:clean(message).slice(0,300),sender_id:clean(process.env.UNISMS_SENDER_ID),
    metadata:{system:'CignalCare+',purpose:'ticket_notification'},
  },{
    auth:{username:clean(process.env.UNISMS_API_SECRET),password:''},
    timeout:Math.min(20000,Number(process.env.SMS_API_TIMEOUT_MS)||15000),
    headers:{'Content-Type':'application/json'},
  });
  return {provider:'unisms',reference:String(response.data?.id || response.data?.message_id || '').slice(0,160)};
}

async function sendTicketEmail({ to, subject, message }) {
  if (!isEmailDeliveryConfigured()) throw new Error('Email is not configured.');
  const provider=getSelectedProvider();
  const from=clean(process.env.EMAIL_FROM || process.env.BREVO_FROM || process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.SMTP_USER);
  if (provider==='brevo') {
    const emailMatch=from.match(/^(.*?)\s*<([^<>]+)>$/);
    const sender=emailMatch?{name:clean(emailMatch[1])||'CignalCare+',email:clean(emailMatch[2])}:{name:'CignalCare+',email:from};
    const result=await axios.post('https://api.brevo.com/v3/smtp/email',{
      sender,to:[{email:to}],subject,textContent:message,
    },{headers:{'api-key':clean(process.env.BREVO_API_KEY),'content-type':'application/json'},timeout:15000});
    return {provider,reference:String(result.data?.messageId || '').slice(0,160)};
  }
  if (provider==='resend') {
    const result=await axios.post('https://api.resend.com/emails',{
      from,to:[to],subject,text:message,
    },{headers:{Authorization:`Bearer ${clean(process.env.RESEND_API_KEY)}`,'Content-Type':'application/json'},timeout:15000});
    return {provider,reference:String(result.data?.id || '').slice(0,160)};
  }
  const transporter=nodemailer.createTransport({
    host:clean(process.env.SMTP_HOST),port:Number(process.env.SMTP_PORT)||587,
    secure:clean(process.env.SMTP_SECURE)==='true',
    auth:{user:clean(process.env.SMTP_USER),pass:clean(process.env.SMTP_PASS)},
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,
  });
  try {const result=await transporter.sendMail({from,to,subject,text:message});return {provider:'smtp',reference:String(result.messageId||'').slice(0,160)};}
  finally {transporter.close();}
}
module.exports={sendTicketSms,sendTicketEmail};
