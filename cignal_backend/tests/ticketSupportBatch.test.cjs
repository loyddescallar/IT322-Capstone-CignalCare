'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const base=path.join(__dirname,'..');
function harness(relative,mocks,env={}) {
 const source=fs.readFileSync(path.join(base,relative),'utf8');
 const module={exports:{}};
 const factory=new vm.Script('(function(require,module,exports){'+source+'\n})',{filename:relative}).runInNewContext({
  process:{env},console,Date,JSON,Math,Number,String,Boolean,Array,Set,Map,Promise,Object,
 });
 factory(name=>{if(Object.hasOwn(mocks,name))return mocks[name];if(name==='crypto')return require('node:crypto');throw Error('Unexpected import '+name);},module,module.exports);
 return module.exports;
}
const fakePhones={
 normalizePhilippinePhone(x){const digits=String(x||'').replace(/\D/g,'');return /^09\d{9}$/.test(digits)?'+63'+digits.slice(1):/^639\d{9}$/.test(digits)?'+'+digits:null;},
 maskPhone(){return '091******23';},isSmsDeliveryConfigured:()=>true,
};
test('structured support validation accepts real Cignal symptoms and normalized contacts',()=>{
 const m=harness('utils/ticketSupportValidation.js',{'../services/smsService':fakePhones});
 const x=m.normalizeSupportDetails({group:'signal',issueCode:'no_signal',issueLabel:'No Signal',phone:'09123456789',
  alternativePhone:'',email:'CUSTOMER@EXAMPLE.COM',preferredMethod:'sms',smsOptIn:true,
  diagnostics:{affected_channels:'All channels'}});
 assert.equal(x.phone,'+639123456789');assert.equal(x.email,'customer@example.com');assert.equal(x.smsOptIn,true);
 assert.match(x.diagnostics,/All channels/);
 assert.equal(x.legacyCategory,'Connection Issue');
 assert.equal(x.issueLabel,'No Signal');
 assert.throws(()=>m.normalizeSupportDetails({group:'signal',issueCode:'invented',phone:'09123456789'}),/specific problem/i);
 assert.throws(()=>m.normalizeSupportDetails({group:'remote',issueCode:'no_signal'}),/specific problem/i);
 assert.throws(()=>m.normalizeSupportDetails({group:'signal',issueCode:'no_signal',phone:'111'}),/mobile number/i);
});
test('new issue codes distinguish shared outages from private hardware/payment tickets',()=>{
 const m=harness('models/incidentModel.js',{'crypto':require('node:crypto'),'../config/db':{}});
 assert.equal(m.issueDescriptor({issue_code:'no_signal',subject:'foo'}).key,'no_signal');
 assert.equal(m.issueDescriptor({issue_code:'pixelated_signal',subject:'foo'}).key,'weak_signal');
 assert.equal(m.issueDescriptor({issue_code:'remote_not_working',subject:'No Signal'}),null);
 assert.equal(m.issueDescriptor({issue_code:'payment_concern',subject:'No Signal'}),null);
});
test('SMS/email alerts are off by default, regardless of contact preferences',async()=>{
 let reads=0;
 const m=harness('services/ticketDeliveryService.js',{
  crypto:require('node:crypto'),'../config/db':{query:async()=>{reads++;return [[]];}},
  './smsService':fakePhones,'./emailService':{isEmailDeliveryConfigured:()=>true},
  './ticketAlertTransports':{sendTicketSms:async()=>{},sendTicketEmail:async()=>{}},
  '../models/ticketSupportModel':{getTicketSupport:async()=>{reads++;return {};}}
 },{});
 assert.equal((await m.sendTicketAlert({ticketId:3,eventKey:'receipt',kind:'receipt'})).disabled,true);
 assert.equal(reads,0);
});
test('external notifications require verified opted-in matching destinations',async()=>{
 let sent=0;
 const pool={query:async()=>[{affectedRows:1}]};
 const m=harness('services/ticketDeliveryService.js',{
  crypto:require('node:crypto'),'../config/db':pool,'./smsService':fakePhones,
  './emailService':{isEmailDeliveryConfigured:()=>true},
  './ticketAlertTransports':{sendTicketSms:async()=>{sent++;return {reference:'x'};},sendTicketEmail:async()=>{sent++;return {reference:'y'};}},
  '../models/ticketSupportModel':{getTicketSupport:async()=>({
    contact_phone:'+639123456789',recovery_phone:'+639123456789',recovery_phone_verified_at:null,
    contact_email:'abc@example.com',profile_email:'abc@example.com',email_verified_at:null,
    sms_opt_in:true,email_opt_in:true,
  })},
 },{TICKET_ALERTS_ENABLED:'true',TICKET_SMS_ALERTS_ENABLED:'true',TICKET_EMAIL_ALERTS_ENABLED:'true'});
 await m.sendTicketAlert({ticketId:3,eventKey:'receipt',kind:'receipt'});
 assert.equal(sent,0);
});
test('call outcome atomically creates internal record and subscriber message; resolved status is explicit',async()=>{
 const sql=[];let committed=0,rolledBack=0;
 const conn={
  beginTransaction:async()=>{sql.push('BEGIN');},
  query:async(query)=>{sql.push(query);if(/SELECT id,ticket_id,outcome,subscriber_message/i.test(query))return [[]];return /SELECT id, status FROM tickets/i.test(query)?[[{id:3,status:'Under Review'}]]:[{affectedRows:1}];},
  commit:async()=>{committed++;},rollback:async()=>{rolledBack++;},release:()=>{},
 };
 const m=harness('models/ticketSupportModel.js',{
  crypto:require('node:crypto'),'../config/db':{getConnection:async()=>conn},
  '../utils/schemaSafety':{assertSchema:async()=>{}},
 });
 await assert.rejects(()=>m.recordCallOutcome({ticketId:3,adminId:9,outcome:'invalid_outcome',requestKey:'11111111-2222-3333-4444-555555555555'}),/Invalid call outcome/);
 const r=await m.recordCallOutcome({ticketId:3,adminId:9,outcome:'resolved',phone:'09123456789',
   message:'Resolved after diagnostic phone discussion.',markResolved:true,requestKey:'11111111-2222-3333-4444-555555555555'});
 assert.equal(r.markedResolved,true);assert.equal(committed,1);assert.equal(rolledBack,0);
 assert.ok(sql.some(s=>/INSERT INTO ticket_support_calls/i.test(s)));
 assert.ok(sql.some(s=>/INSERT INTO ticket_messages/i.test(s)));
 assert.ok(sql.some(s=>/UPDATE tickets SET status='Resolved'/i.test(s)));
});
test('subscriber call details endpoint requires admin authentication; no public route added',()=>{
 const routes=fs.readFileSync(path.join(base,'routes/ticketRoutes.js'),'utf8');
 assert.match(routes,/router\.get\('\/admin\/:id\/support', authRequired, requireRole\('admin'\)/);
 assert.match(routes,/router\.post\('\/admin\/:id\/calls', authRequired, requireRole\('admin'\)/);
});
test('incident auto refresh does not invoke candidate detection',()=>{
 const view=fs.readFileSync(path.join(base,'../Cignal_Frontend/src/pages/admin/AdminIncidents.jsx'),'utf8');
 assert.match(view,/useVisibleRefresh/);
 assert.match(view,/onClick=\{runDetection\}/);
});


test('call submission idempotency returns the existing call without creating another chat',async()=>{
 let chatInserts=0;
 const existing={id:'old-call',ticket_id:7,outcome:'noanswer',subscriber_message:'Attempted contact.',marked_resolved:0};
 const conn={
  beginTransaction:async()=>{},
  query:async(sql)=>{
   if(/SELECT id,ticket_id,outcome,subscriber_message/i.test(sql))return [[existing]];
   if(/INSERT INTO ticket_messages/i.test(sql))chatInserts++;
   return [[]];
  },commit:async()=>{},rollback:async()=>{},release:()=>{},
 };
 const m=harness('models/ticketSupportModel.js',{
  crypto:require('node:crypto'),'../config/db':{getConnection:async()=>conn},
  '../utils/schemaSafety':{assertSchema:async()=>{}},
 });
 const result=await m.recordCallOutcome({ticketId:7,adminId:3,outcome:'noanswer',requestKey:'22222222-3333-4444-5555-666666666666'});
 assert.equal(result.duplicate,true);assert.equal(result.id,'old-call');assert.equal(chatInserts,0);
});

test('verified and opted-in contacts receive minimal, provider-accepted notifications',async()=>{
 let smsSent=0,emailSent=0,logged=0;
 const pool={query:async(sql)=>{if(/INSERT INTO ticket_support_deliveries/i.test(sql))logged++;return [{affectedRows:1}];}};
 const m=harness('services/ticketDeliveryService.js',{
  crypto:require('node:crypto'),'../config/db':pool,'./smsService':fakePhones,
  './emailService':{isEmailDeliveryConfigured:()=>true},
  './ticketAlertTransports':{
   sendTicketSms:async({message})=>{smsSent++;assert.match(message,/ticket #8/i);return {reference:'sms-accepted'};},
   sendTicketEmail:async({message})=>{emailSent++;assert.match(message,/ticket #8/i);return {reference:'mail-accepted'};},
  },
  '../models/ticketSupportModel':{getTicketSupport:async()=>({
   contact_phone:'+639123456789',recovery_phone:'+639123456789',recovery_phone_verified_at:new Date(),
   contact_email:'abc@example.com',profile_email:'abc@example.com',email_verified_at:new Date(),
   sms_opt_in:true,email_opt_in:true,
  })},
 },{TICKET_ALERTS_ENABLED:'true',TICKET_SMS_ALERTS_ENABLED:'true',TICKET_EMAIL_ALERTS_ENABLED:'true'});
 const result=await m.sendTicketAlert({ticketId:8,eventKey:'receipt',kind:'receipt'});
 assert.equal(result.sms,'provider-accepted');assert.equal(result.email,'provider-accepted');
 assert.equal(smsSent,1);assert.equal(emailSent,1);assert.equal(logged,2);
});
