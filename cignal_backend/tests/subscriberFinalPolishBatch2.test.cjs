'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.resolve(__dirname, '../..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { getGuidedSupportReply, buildVerifiedPersonalStatusReply, isPrivateStatusQuestion } = require('../services/chatbotGuidedSupport');
const pageKnowledge = require('../services/chatbotPageKnowledge');

function activeSession(completedStepIds = []) {
  return {
    valid: true,
    text: 'ACTIVE CIGNALCARE TROUBLESHOOTING SESSION (server-verified model, issue, and step mapping):\nCurrent displayed step: Step 3 [Signal]: Check the verified on-screen signal indicator.',
    completedStepIds,
    meta: {
      modelId: 'samsung-hd', modelName: 'Samsung HD', issueId: 'no-signal',
      issueTitle: 'No Signal', currentStepId: 'samsung-hd:no-signal:1:3',
      fullStepCount: 4, completedStepCount: 2,
    },
  };
}

function controllerWithMocks(mocks) {
  const src = read('cignal_backend/controllers/chatbotController.js');
  const mod = {exports: {}};
  const factory = vm.runInNewContext(`(function(require,module,exports){\n${src}\n})`, { console, process, setTimeout, clearTimeout });
  factory(name => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw new Error('Unexpected controller dependency: ' + name);
  }, mod, mod.exports);
  return mod.exports;
}
function response() { return {statusCode: 200, body: null, status(n) {this.statusCode=n;return this;}, json(body){this.body=body;return this;}}; }
const guided = require('../services/chatbotGuidedSupport');
function knowledgeMocks(record = null) {
  return {
    '../services/geminiService': {getGeminiModel: ()=>'test'},
    '../services/chatbotKnowledgeService': {
      getChatbotKnowledge: async () => record,
      buildChatbotUiHints: () => ({quickReplies:[],actions:[]}),
      buildTroubleshootingSessionContext: () => ({valid:false}),
    },
    '../services/chatbotPageKnowledge': pageKnowledge,
    '../services/chatbotGuidedSupport': guided,
  };
}

test('B+C: chatbot knowledge remains restricted to whitelisted subscriber paths', () => {
  assert.equal(pageKnowledge.getChatbotPageKnowledge('/admin/security'), null);
  assert.equal(pageKnowledge.getChatbotPageKnowledge('/user/tickets?status=secret'), null);
  assert.match(pageKnowledge.getChatbotPageKnowledge('/user/tickets').guidance, /Past Tickets/);
  assert.doesNotMatch(pageKnowledge.getChatbotPageKnowledge('/user/tickets').guidance, /select Archived/);
});

test('B+C: no signal asks for exact receiver model rather than inventing settings', () => {
  const r = getGuidedSupportReply({message:'Walang signal yung TV'});
  assert.match(r.reply, /receiver model/i);
  assert.doesNotMatch(r.reply, /press menu.*factory reset/i);
  assert.ok(r.actions.some(a => a.path === '/troubleshoot'));
});

test('B+C: context carries an unresolved follow-up without guessing a diagnosis', () => {
  const context = [{role:'user',text:'No Signal'}, {role:'assistant',text:'What receiver model?'}, {role:'user',text:'Hindi pa rin gumagana'}];
  const r = getGuidedSupportReply({message:'Hindi pa rin gumagana',context});
  assert.match(r.reply, /hindi pa rin maayos/i);
  assert.ok(r.actions.some(a=>a.draftTarget==='ticket'));
  assert.ok(r.actions.some(a=>a.draftTarget==='technician'));
  assert.doesNotMatch(r.reply, /your technician has been assigned/i);
});

test('B+C: Past Tickets guidance keeps archived records accessible', () => {
  const r = getGuidedSupportReply({message:'Where are Past Tickets?'});
  assert.match(r.reply,/Past Tickets/);
  assert.match(r.reply,/Archived/);
  assert.ok(r.actions.some(action => action.path === '/user/tickets'));
});

test('B+C: receiver-model guidance does not guess a model', () => {
  const r = getGuidedSupportReply({message:'What receiver model should I choose?'});
  assert.match(r.reply,/label ng Cignal receiver/);
  assert.doesNotMatch(r.reply,/Samsung PVR ang gamit mo/);
});

test('B+C: unrelated vague follow-up does not fabricate a troubleshooting session', () => {
  assert.equal(getGuidedSupportReply({message:'still not working',context:[]}),null);
  assert.equal(getGuidedSupportReply({message:'what next?',context:[]}),null);
});

test('B+C: verified active troubleshooting step is referenced exactly', () => {
  const r = getGuidedSupportReply({message:'What is my next troubleshooting step?',verifiedSession:activeSession()});
  assert.match(r.reply,/Step 3 \[Signal\]: Check the verified on-screen signal indicator/);
  assert.match(r.reply,/Samsung HD/);
});

test('B+C: marked-complete current step is not repeated as an unfinished task', () => {
  const r = getGuidedSupportReply({message:'What is next?',verifiedSession:activeSession(['samsung-hd:no-signal:1:3'])});
  assert.match(r.reply,/Next/);
  assert.doesNotMatch(r.reply,/Check the verified on-screen signal indicator/);
});

test('B+C: unfinished problem after all marked steps proposes only user-reviewed escalation', () => {
  const active = activeSession(); active.meta.fullStepCount=2; active.meta.completedStepCount=2;
  const r = getGuidedSupportReply({message:'Hindi pa rin gumagana',verifiedSession:active});
  assert.match(r.reply,/support ticket/i);
  assert.ok(r.actions.some(a=>a.path==='/user/report-problem'));
  assert.doesNotMatch(r.reply,/automatically submitted/i);
});

test('B+C: no OTP or password sharing is requested by CignalBot', () => {
  const r = getGuidedSupportReply({message:'Should I share my OTP or password?'});
  assert.ok(r);
  assert.match(r.reply,/Huwag ibahagi/i);
});

test('B+C: only requested owned record can answer a specific ticket status', () => {
  const record = {latestTicket:{id:42,status:'Resolved'},requested:{ticket:{id:99,record:null}}};
  const r = buildVerifiedPersonalStatusReply({message:'My ticket #99 status?',personalSupport:record,requestedIds:{ticket:99}});
  assert.match(r,/#99/); assert.doesNotMatch(r,/#42/); assert.doesNotMatch(r,/Resolved/);
});

test('B+C: verified offline personal status uses actual record values, not invented data', () => {
  const r = buildVerifiedPersonalStatusReply({message:'My ticket status',personalSupport:{latestTicket:{id:234,status:'Under Review'}}});
  assert.match(r,/#234/); assert.match(r,/Under Review/);
  assert.doesNotMatch(r,/technician assigned/i);
});

test('B+C: short follow-up reads earlier user status intent, never an assistant-only claim', () => {
  assert.equal(isPrivateStatusQuestion('ano na?', [{role:'user',text:'my ticket'}, {role:'assistant',text:'ask for status'}, {role:'user',text:'ano na?'}]),true);
  assert.equal(isPrivateStatusQuestion('ano na?', [{role:'assistant',text:'ticket status'}, {role:'user',text:'ano na?'}]),false);
});

test('B+C: offline controller checks authorized user id and makes no Gemini call', async () => {
  let calledWith=null;
  const mocks=knowledgeMocks({personalSupport:{latestTicket:{id:234,status:'Under Review'}},requestedIds:{}});
  mocks['../services/geminiService'].generateGeminiReply=async()=>{throw new Error('Gemini should not run when disabled');};
  mocks['../services/chatbotKnowledgeService'].getChatbotKnowledge=async args=>{calledWith=args;return {personalSupport:{latestTicket:{id:234,status:'Under Review'}},requestedIds:{}};};
  const controller=controllerWithMocks(mocks);
  const res=response();
  await controller.sendChatbotMessage({body:{message:'My ticket status'},user:{id:15},aiAccess:{allowed:false,reason:'disabled'}},res);
  assert.equal(res.statusCode,200);
  assert.equal(calledWith.userId,15);
  assert.equal(calledWith.includePersonalData,true);
  assert.match(res.body.reply,/#234/);
  assert.match(res.body.source,/verified-personal-data/);
});

test('B+C: non-authenticated offline status never attempts a private lookup', async () => {
  let calls=0;
  const mocks=knowledgeMocks(null);
  mocks['../services/chatbotKnowledgeService'].getChatbotKnowledge=async()=>{calls++;return null;};
  const controller=controllerWithMocks(mocks);
  const res=response();
  await controller.sendChatbotMessage({body:{message:'My ticket status'},aiAccess:{allowed:false,reason:'disabled'}},res);
  assert.equal(calls,0);
  assert.match(res.body.reply,/cannot verify/i);
});

test('B+C: quota HTTP 429 remains enforced without invoking database or provider', async () => {
  let calls=0;
  const mocks=knowledgeMocks(null);
  mocks['../services/chatbotKnowledgeService'].getChatbotKnowledge=async()=>{calls++;};
  const controller=controllerWithMocks(mocks);
  const res=response();
  await controller.sendChatbotMessage({body:{message:'my ticket status'},user:{id:5},aiAccess:{allowed:false,reason:'quota'}},res);
  assert.equal(res.statusCode,429);assert.equal(calls,0);
});

test('B+C: subscriber ticket history is collapsible and statuses remain intact', () => {
  const ui=read('Cignal_Frontend/src/pages/user/UserTickets.jsx');
  assert.match(ui,/aria-expanded=\{pastOpen\}/);
  assert.match(ui,/Past Tickets/);
  assert.match(ui,/\['Resolved', 'Archived'\]\.includes\(displayStatus\(ticket\.status\)\)/);
  assert.doesNotMatch(ui,/setStatus\('Archived'\)/);
  assert.match(ui,/handleTicketClick\(ticket\)/);
});

test('B+C: chat is 50 percent wider/taller on desktop and outgoing text is white', () => {
  const ui=read('Cignal_Frontend/src/components/CignalBot.jsx');
  assert.match(ui,/max-w-\[540px\]/);
  assert.match(ui,/min\(630px, calc\(100dvh - 7rem\)\)/);
  assert.match(ui,/renderText\(message\.text, message\.from === 'user'\)/);
  assert.match(ui,/fromUser \? 'text-white' : 'text-gray-800'/);
  assert.match(ui,/w-\[calc\(100vw-1\.5rem\)\]/);
});

test('B+C: conversation continuity remains ephemeral and account scoped', () => {
  const ui=read('Cignal_Frontend/src/components/CignalBot.jsx');
  assert.match(ui,/conversationCache = \{ identity: null, messages: null \}/);
  assert.match(ui,/localStorage\.getItem\('token'\)/);
  assert.match(ui,/setMessages\] = useState\(readConversation\)/);
  assert.doesNotMatch(ui,/sessionStorage\.setItem\(/);
  assert.doesNotMatch(ui,/localStorage\.setItem\('cignalcare_bot_messages'/);
});

test('B+C: no ticket or provider mutation paths are created by new backend service', () => {
  const module=read('cignal_backend/services/chatbotGuidedSupport.js');
  assert.doesNotMatch(module,/\b(?:pool|fetch|axios|INSERT|UPDATE|DELETE|PAYMENT_SECRET)\s*\(/);
  assert.doesNotMatch(module,/stripe|paymongo\.create|adminRevoke/i);
});


test('B+C regression: page guidance bypasses Gemini and DB when enabled', async () => {
  let providerCalls=0, dbCalls=0;
  const mocks=knowledgeMocks(null);
  mocks['../services/geminiService'].generateGeminiReply=async()=>{providerCalls++; throw new Error('No AI allowed for page help');};
  mocks['../services/chatbotKnowledgeService'].getChatbotKnowledge=async()=>{dbCalls++; throw new Error('No DB for page help');};
  const controller=controllerWithMocks(mocks), res=response();
  await controller.sendChatbotMessage({body:{message:'What can I do on this page?',page:'/user/tickets'},user:{id:8},aiAccess:{allowed:true,reason:'verified-free'}},res);
  assert.equal(res.statusCode,200);
  assert.match(res.body.reply,/Past Tickets/);
  assert.equal(res.body.source,'built-in-support');
  assert.equal(providerCalls,0);
  assert.equal(dbCalls,0);
});

test('B+C regression: Gemini failure returns verified guided fallback not 504', async () => {
  const mocks=knowledgeMocks({text:'',personalSupport:null,needs:{},requestedIds:{}});
  mocks['../services/geminiService'].generateGeminiReply=async()=>{const e=new Error('timed out');e.code='GEMINI_TIMEOUT';throw e;};
  const controller=controllerWithMocks(mocks), res=response();
  await controller.sendChatbotMessage({body:{message:'Walang signal yung TV',page:'/user-dashboard'},user:{id:8},aiAccess:{allowed:true,reason:'verified-free'}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.body.source,'built-in-support+ai-fallback');
  assert.match(res.body.reply,/receiver model/i);
  assert.ok(res.body.actions.some(a=>a.path==='/troubleshoot'));
});

test('B+C regression: Gemini timeout is shorter than Axios client timeout', () => {
  const service=require('../services/geminiService');
  const previous=process.env.GEMINI_TIMEOUT_MS;
  try {
    delete process.env.GEMINI_TIMEOUT_MS;
    assert.equal(service.getGeminiTimeoutMs(),12000);
    process.env.GEMINI_TIMEOUT_MS='30000';
    assert.equal(service.getGeminiTimeoutMs(),20000);
  } finally {
    if (previous === undefined) delete process.env.GEMINI_TIMEOUT_MS;
    else process.env.GEMINI_TIMEOUT_MS=previous;
  }
});
