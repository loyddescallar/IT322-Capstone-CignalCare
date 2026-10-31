const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const { validatePaidPaymentEvent } = require('../utils/paymentEventValidation');
const { createAbuseRateLimit } = require('../middleware/abuseRateLimit');
const { extractPayMongoWebhookData } = require('../utils/paymongoWebhook');
const goodRequest = { id: 9, payment_method: 'PayMongo', paymongo_checkout_session_id: 'cs_good', reference_no: 'PM-good', amount: '200.00' };
function event(overrides={}) {
  return { referenceNo:'PM-good', checkoutSessionId:'cs_good', resourceAttributes:{metadata:{load_request_id:'9'}}, paymentAttributes:{ amount:20000, currency:'PHP', status:'paid'},...overrides};
}
function check(overrides={},request=goodRequest,mode=false){return validatePaidPaymentEvent({webhook:event(overrides),request,livemode:mode,secretKey:'sk_test_PLACEHOLDER'});}
test('paid checkout: only verified matching transaction passes',()=>assert.equal(check(),true));
test('wrong amount, currency, status and missing details are rejected',()=>{
  for(const data of [{amount:19900},{amount:20001},{amount:undefined},{currency:'USD'},{currency:undefined},{status:'pending'},{status:undefined}]) {
    assert.throws(()=>check({paymentAttributes:{amount:20000,currency:'PHP',status:'paid',...data}}), /payment verification failed/);
  }
});
test('cannot apply a signed payment from another session or order',()=>{
  for(const change of [{checkoutSessionId:'cs_other'},{referenceNo:'PM-other'},{resourceAttributes:{metadata:{load_request_id:'10'}}}]) {
    assert.throws(()=>check(change), /payment verification failed/);
  }
  assert.throws(()=>check({},null));
});
test('test/live mode mismatch is blocked',()=>{
  assert.throws(()=>check({},goodRequest,true));
  assert.equal(validatePaidPaymentEvent({webhook:event(),request:goodRequest,livemode:true,secretKey:'sk_live_PLACEHOLDER'}),true);
});
test('per-user limiter does not block a second user, applies Retry-After at cap',()=>{
  const middleware=createAbuseRateLimit('technicianCreate');
  function run(id){const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(x){this.statusCode=x;return this;},json(x){this.body=x;return this;}};let next=0;middleware({user:{id}},res,()=>next++);return {res,next};}
  for(let i=0;i<6;i++) assert.equal(run(989100).next,1);
  const blocked=run(989100);assert.equal(blocked.res.statusCode,429);assert.ok(Number(blocked.res.headers['Retry-After'])>0);
  assert.equal(run(989101).next,1);
});
test('public static attachment mount removed and ticket-scoped auth route installed',()=>{
  const server=fs.readFileSync(path.join(root,'server.js'),'utf8');
  const routes=fs.readFileSync(path.join(root,'routes/ticketRoutes.js'),'utf8');
  const ui=fs.readFileSync(path.join(root,'../Cignal_Frontend/src/components/ChatAttachment.jsx'),'utf8');
  assert.doesNotMatch(server,/app\.use\(\s*['"]\/uploads\/messages['"]/);
  assert.match(routes,/\/:id\/attachments\/:filename/);
  assert.match(routes,/getTicketAttachmentController/);
  assert.match(ui,/responseType:\s*['"]blob['"]/);
});
test('paid webhook verifies payment before marking paid',()=>{
  const controller=fs.readFileSync(path.join(root,'controllers/loadRequestController.js'),'utf8');
  const anchor=controller.indexOf('if (PAYMONGO_PAID_EVENTS.has(webhook.eventType))');
  const verify=controller.indexOf('validatePaidPaymentEvent(',anchor);
  const mark=controller.indexOf('await markPayMongoPaymentPaid(',anchor);
  assert.ok(anchor>0&&verify>anchor&&mark>verify);
});

test('parses official checkout-session-shaped webhook and chooses the paid payment',()=>{
  const raw={data:{id:'evt_example',type:'event',attributes:{type:'checkout_session.payment.paid',livemode:false,data:{id:'cs_good',type:'checkout_session',attributes:{reference_number:'PM-good',metadata:{load_request_id:'9'},payments:[{id:'pay_failed',attributes:{amount:20000,currency:'PHP',status:'failed'}},{id:'pay_paid',attributes:{amount:20000,currency:'PHP',status:'paid'}}]}}}}};
  const out=extractPayMongoWebhookData(raw);
  assert.equal(out.paymentId,'pay_paid');
  assert.equal(out.paymentAttributes.status,'paid');
  assert.equal(check(out),true);
});
