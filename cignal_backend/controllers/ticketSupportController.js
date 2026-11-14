'use strict';
const {getTicketById}=require('../models/ticketModel');
const { getTicketSupport,getCallHistory,getAwaitingReply,recordCallOutcome,OUTCOMES }=require('../models/ticketSupportModel');
const {createNotification}=require('../models/notificationModel');
const {notifySafely}=require('../utils/safeNotification');
const {sendTicketAlert}=require('../services/ticketDeliveryService');

async function getAdminTicketSupport(req,res) {
 try {
  const ticket=await getTicketById(req.params.id);
  if (!ticket) return res.status(404).json({error:'Ticket not found.'});
  const [support,calls,reply]=await Promise.all([
   getTicketSupport(ticket.id),getCallHistory(ticket.id),getAwaitingReply(ticket.id),
  ]);
  // Never expose account-recovery credentials/phone metadata as part of a
  // ticket support response. The UI needs only ticket-scoped contact details.
  const safeSupport=support ? Object.fromEntries([
   'ticket_id','status','report_group','issue_code','issue_label',
   'diagnostics','receiver_model','receiver_code','contact_phone',
   'alternative_phone','contact_email','preferred_contact',
  ].map(key=>[key,support[key]])) : null;
  return res.json({support:safeSupport,calls,reply,templates:OUTCOMES});
 } catch(error) {
  console.error('TICKET SUPPORT DETAILS ERROR:',error);
  return res.status(error.code==='SCHEMA_NOT_READY'?503:500).json({error:'Ticket contact records are unavailable. Verify the ticket-support migration.'});
 }
}
async function recordAdminCall(req,res) {
 try {
  const ticket=await getTicketById(req.params.id);
  if (!ticket) return res.status(404).json({error:'Ticket not found.'});
  const support=await getTicketSupport(ticket.id);
  const outcome=String(req.body?.outcome||'');
  const notes=String(req.body?.notes||'').trim();
  const message=String(req.body?.message||'').trim();
  if (notes.length>2000) return res.status(400).json({error:'Call notes are too long.'});
  const eligibleNumbers=[support.contact_phone,support.alternative_phone].filter(Boolean);
  const selectedPhone=String(req.body?.phone||'').trim() || eligibleNumbers[0] || '';
  if (!selectedPhone) return res.status(400).json({error:'No customer contact number is available for a call. Request one in the ticket chat first.'});
  if (!eligibleNumbers.includes(selectedPhone)) return res.status(400).json({error:'Select a phone number provided for this ticket.'});
  const callbackAt=req.body?.callbackAt ? new Date(req.body.callbackAt) : null;
  if (callbackAt && Number.isNaN(callbackAt.getTime())) return res.status(400).json({error:'Invalid callback date.'});
  if (outcome==='callback' && (!callbackAt || callbackAt.getTime()<Date.now())) return res.status(400).json({error:'Please choose a future callback date.'});
  const call=await recordCallOutcome({
   ticketId:ticket.id,adminId:req.user.id,outcome,phone:selectedPhone,notes,
   message,callbackAt,markResolved:req.body?.markResolved===true,requestKey:req.body?.requestKey,
  });
  if (call.duplicate) return res.status(200).json({message:'Call outcome was already saved.',call});
  await notifySafely('CALL OUTCOME CHAT',()=>createNotification({
    user_id:ticket.user_id,account_number:ticket.accountNumber,type:'ticket_reply',
    message:call.markedResolved
      ? `Support provided a phone follow-up update and resolved ticket #${ticket.id}.`
      : `Support provided an update on ticket #${ticket.id} following a contact attempt.`,
  }));
  await notifySafely('CALL OUTCOME ALERT',()=>sendTicketAlert({
    ticketId:ticket.id,eventKey:`reply:call:${call.id}`,kind:'reply',
  }));
  return res.status(201).json({message:'Call outcome and subscriber message saved.',call});
 } catch(error) {
  console.error('RECORD CALL OUTCOME ERROR:',error);
  const status=error.statusCode || (error.code==='SCHEMA_NOT_READY'?503:500);
  return res.status(status).json({error:status===500?'Could not save the call outcome. No confirmation was issued.':error.message});
 }
}
module.exports={getAdminTicketSupport,recordAdminCall};
