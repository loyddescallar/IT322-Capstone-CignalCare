'use strict';
const crypto = require('crypto');
const pool = require('../config/db');
const { assertSchema } = require('../utils/schemaSafety');

async function assertSupportReady() { await assertSchema(pool, 'ticket_support'); }

async function insertDetailsUsing(conn, ticketId, data) {
  await conn.query(`INSERT INTO ticket_support_details
   (ticket_id, report_group, issue_code, issue_label, diagnostics_json, receiver_model, receiver_code,
    contact_phone, alternative_phone, contact_email, preferred_contact, sms_opt_in, email_opt_in, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`, [
    ticketId, data.group, data.issueCode, data.issueLabel, data.diagnostics, data.receiverModel,
    data.receiverCode, data.phone || null, data.alternativePhone || null,
    data.email || null, data.preferredMethod, data.smsOptIn ? 1 : 0, data.emailOptIn ? 1 : 0,
  ]);
}

async function getTicketSupport(ticketId) {
  await assertSupportReady();
  const [rows] = await pool.query(`SELECT t.id AS ticket_id, t.user_id, t.status, u.accountNumber,
   u.accountName, u.phone AS profile_phone, u.email AS profile_email, u.recovery_phone,
   u.recovery_phone_verified_at, u.email_verified_at,
   d.report_group, d.issue_code, d.issue_label, d.diagnostics_json, d.receiver_model, d.receiver_code,
   d.contact_phone, d.alternative_phone, d.contact_email, d.preferred_contact,
   d.sms_opt_in, d.email_opt_in
   FROM tickets t JOIN users u ON u.id=t.user_id
   LEFT JOIN ticket_support_details d ON d.ticket_id=t.id WHERE t.id=? LIMIT 1`, [ticketId]);
  if (!rows.length) return null;
  const row=rows[0];
  let diagnostics={};
  try { diagnostics=JSON.parse(row.diagnostics_json || '{}'); } catch (_) { /* legacy */ }
  return {
    ...row, diagnostics,
    contact_phone:row.report_group ? (row.contact_phone || '') : (row.profile_phone || ''),
    contact_email:row.report_group ? (row.contact_email || '') : (row.profile_email || ''),
    preferred_contact:row.preferred_contact || 'chat',
    sms_opt_in:row.sms_opt_in === true || Number(row.sms_opt_in) === 1,
    email_opt_in:row.email_opt_in === true || Number(row.email_opt_in) === 1,
  };
}

async function getCallHistory(ticketId) {
  await assertSupportReady();
  const [rows] = await pool.query(`SELECT id, ticket_id, admin_id, outcome, contact_number,
   admin_notes, subscriber_message, callback_at, marked_resolved, created_at
   FROM ticket_support_calls WHERE ticket_id=? ORDER BY created_at DESC LIMIT 50`,[ticketId]);
  return rows;
}

async function getAwaitingReply(ticketId) {
  const [rows] = await pool.query(`SELECT sender_role, MAX(created_at) AS latest
     FROM ticket_messages WHERE ticket_id=? AND sender_role IN ('admin','user') GROUP BY sender_role`,[ticketId]);
  const admin = rows.find(x=>x.sender_role==='admin')?.latest;
  const user = rows.find(x=>x.sender_role==='user')?.latest;
  if (!admin) return { awaitingReply:false, over24Hours:false, lastAdminReply:null };
  const waiting = !user || new Date(admin).getTime() > new Date(user).getTime();
  const elapsed=Date.now()-new Date(admin).getTime();
  return { awaitingReply:waiting, over24Hours:waiting && elapsed >= 24*60*60*1000,
   lastAdminReply:admin };
}

const OUTCOMES = Object.freeze({
  resolved:'Thank you for speaking with our support team. Based on our phone conversation, your reported issue has been resolved. Please contact us through this ticket if it happens again.',
  technician:'Thank you for speaking with our support team. Your issue requires further technician inspection. Our team will update this ticket when the service arrangements are confirmed.',
  troubleshoot:'Thank you for speaking with our support team. Further troubleshooting is needed. We will share the next instructions through this ticket.',
  noanswer:'Our support team attempted to contact you about this ticket but could not reach you. Please reply here when you are available.',
  callback:'Thank you for speaking with our support team. We have noted your request for a callback and will follow up according to the agreed arrangement.',
  invalid:'We could not reach you using the number provided for this ticket. Please check your contact details or reply here so we can assist you.',
});

async function recordCallOutcome({ticketId, adminId, outcome, phone, notes, message, callbackAt, markResolved, requestKey}) {
  await assertSupportReady();
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(String(requestKey || ''))) {const err=new Error('Missing or invalid call submission key.');err.statusCode=400;throw err;}
  if (!Object.hasOwn(OUTCOMES,outcome)) {const err=new Error('Invalid call outcome.');err.statusCode=400;throw err;}
  const selectedMessage=String(message || OUTCOMES[outcome]).trim();
  if (!selectedMessage || selectedMessage.length > 2000) {const err=new Error('Subscriber message must be between 1 and 2000 characters.');err.statusCode=400;throw err;}
  if (markResolved && outcome!=='resolved') {const err=new Error('Only an Issue Resolved call outcome may close a ticket.');err.statusCode=400;throw err;}
  const conn=await pool.getConnection();
  const id=crypto.randomUUID();
  try {
    await conn.beginTransaction();
    const [existing] = await conn.query('SELECT id,ticket_id,outcome,subscriber_message,marked_resolved FROM ticket_support_calls WHERE request_key=? LIMIT 1',[requestKey]);
    if (existing.length) {
      if (Number(existing[0].ticket_id)!==Number(ticketId)) {const err=new Error('Call submission key is already used.');err.statusCode=409;throw err;}
      await conn.rollback();
      return {id:existing[0].id,outcome:existing[0].outcome,message:existing[0].subscriber_message,markedResolved:Boolean(existing[0].marked_resolved),duplicate:true};
    }
    const [tRows]=await conn.query('SELECT id, status FROM tickets WHERE id=? FOR UPDATE',[ticketId]);
    const ticket=tRows[0];
    if (!ticket) {const err=new Error('Ticket not found.');err.statusCode=404;throw err;}
    if (['Resolved','Archived'].includes(ticket.status)) {const err=new Error('This ticket is already closed.');err.statusCode=409;throw err;}
    await conn.query(`INSERT INTO ticket_support_calls
      (id, request_key, ticket_id, admin_id, outcome, contact_number, admin_notes, subscriber_message, callback_at, marked_resolved, created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,NOW())`,[
       id,requestKey,ticketId,adminId,outcome,phone||null,notes||null,selectedMessage,callbackAt||null,markResolved?1:0,
    ]);
    await conn.query(`INSERT INTO ticket_messages (ticket_id,sender_id,sender_role,message,attachment,attachment_type)
       VALUES (?,?,'admin',?,NULL,NULL)`,[ticketId,adminId,selectedMessage]);
    if (markResolved) await conn.query(`UPDATE tickets SET status='Resolved',updated_at=NOW() WHERE id=?`,[ticketId]);
    await conn.commit();
    return {id, outcome, message:selectedMessage, markedResolved:Boolean(markResolved)};
  } catch(error) {
    await conn.rollback();
    // Concurrent retry: the unique request key prevents duplicate call/chat inserts.
    if (['ER_DUP_ENTRY','23505'].includes(error.code)) {
      const [existing] = await pool.query('SELECT id,ticket_id,outcome,subscriber_message,marked_resolved FROM ticket_support_calls WHERE request_key=? LIMIT 1',[requestKey]);
      if (existing.length && Number(existing[0].ticket_id)===Number(ticketId))
        return {id:existing[0].id,outcome:existing[0].outcome,message:existing[0].subscriber_message,markedResolved:Boolean(existing[0].marked_resolved),duplicate:true};
    }
    throw error;
  }
  finally {conn.release();}
}

module.exports={assertSupportReady,insertDetailsUsing,getTicketSupport,getCallHistory,getAwaitingReply,recordCallOutcome,OUTCOMES};
