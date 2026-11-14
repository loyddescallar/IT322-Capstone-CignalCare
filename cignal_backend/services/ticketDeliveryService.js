'use strict';
const crypto=require('crypto');
const pool=require('../config/db');
const { normalizePhilippinePhone,maskPhone,isSmsDeliveryConfigured }=require('./smsService');
const { isEmailDeliveryConfigured }=require('./emailService');
const { sendTicketSms,sendTicketEmail }=require('./ticketAlertTransports');
const { getTicketSupport }=require('../models/ticketSupportModel');
const yes=x=>String(x||'').toLowerCase()==='true';
function maskEmail(x) {const [name,domain]=String(x).split('@');return domain?`${name.slice(0,2)}***@${domain}`:'';}

async function claim(ticketId,eventKey,channel,recipientMasked) {
  const id=crypto.randomUUID();
  try {
    await pool.query(`INSERT INTO ticket_support_deliveries
      (id,ticket_id,event_key,channel,recipient_masked,state,created_at)
      VALUES (?,?,?,?,?,'pending',NOW())`,[id,ticketId,eventKey,channel,recipientMasked]);
    return id;
  } catch(error) {
    if (['23505','ER_DUP_ENTRY'].includes(error?.code)) return null;
    throw error;
  }
}
async function complete(id,state,reference='',error='') {
  await pool.query(`UPDATE ticket_support_deliveries SET state=?,provider_reference=?,error_summary=?,updated_at=NOW() WHERE id=?`,[
    state,String(reference||'').slice(0,160),String(error||'').slice(0,200),id,
  ]);
}

async function sendTicketAlert({ticketId,eventKey,kind}) {
  if (!yes(process.env.TICKET_ALERTS_ENABLED)) return {disabled:true};
  const support=await getTicketSupport(ticketId);
  if (!support) return {notFound:true};
  const title=`CignalCare+ ticket #${ticketId}`;
  const body = kind==='receipt'
   ? `CignalCare+: Ticket #${ticketId} was received and is awaiting review. Log in to see updates.`
   : kind==='reply'
     ? `CignalCare+: Our support team has replied to ticket #${ticketId}. Log in to review the message.`
     : `CignalCare+: There is a status update for ticket #${ticketId}. Log in to see details.`;
  const results={};
  const smsPhone=normalizePhilippinePhone(support.contact_phone);
  const verifiedPhone=normalizePhilippinePhone(support.recovery_phone);
  const canSms=yes(process.env.TICKET_SMS_ALERTS_ENABLED) && isSmsDeliveryConfigured() &&
   support.sms_opt_in && Boolean(support.recovery_phone_verified_at) && smsPhone && smsPhone===verifiedPhone;
  const mail=String(support.contact_email||'').trim().toLowerCase();
  const verifiedMail=String(support.profile_email||'').trim().toLowerCase();
  const canEmail=yes(process.env.TICKET_EMAIL_ALERTS_ENABLED) && isEmailDeliveryConfigured() &&
   support.email_opt_in && Boolean(support.email_verified_at) && mail && mail===verifiedMail;
  for(const [channel,eligible,recipient] of [['sms',canSms,smsPhone],['email',canEmail,mail]]) {
    if (!eligible) continue;
    const key=`ticket:${ticketId}:${String(eventKey).slice(0,85)}:${channel}`;
    let id;
    try {
      id=await claim(ticketId,key,channel,channel==='sms'?maskPhone(recipient):maskEmail(recipient));
      if (!id) {results[channel]='duplicate-suppressed';continue;}
      const sent=channel==='sms'?await sendTicketSms({to:recipient,message:body}):await sendTicketEmail({to:recipient,subject:title,message:body});
      await complete(id,'accepted',sent.reference);
      results[channel]='provider-accepted'; // Not proof of final handset delivery.
    } catch(error) {
      if (id) {try {await complete(id,'failed','',error.message);} catch (_) {}}
      console.warn('TICKET ALERT DELIVERY WARNING:',channel,error.message);
      results[channel]='failed';
    }
  }
  return results;
}
module.exports={sendTicketAlert};
