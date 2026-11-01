'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');

function harness(file, mocks) {
  const source = fs.readFileSync(path.join(base, file), 'utf8');
  const mod = { exports: {} };
  const factory = vm.runInNewContext(`(function(require,module,exports){\n${source}\n})`, { console, process, setTimeout, clearTimeout });
  factory(name => {
    if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name];
    throw new Error('Unexpected module dependency: ' + name);
  }, mod, mod.exports);
  return mod.exports;
}
function response() {
  return {
    statusCode: 200, body: null,
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}
const notifications = { createNotification: async () => {}, createAdminNotification: async () => {} };
const ownership = { isAdmin: () => false, isSelf: () => true, ownsAccount: () => true };

test('Chatbot stays usable as built-in support when Gemini is deliberately disabled', async () => {
  let aiCalls = 0;
  const ctrl = harness('controllers/chatbotController.js', {
    '../services/geminiService': { getGeminiModel: () => 'test', generateGeminiReply: async () => { aiCalls++; } },
    '../services/chatbotKnowledgeService': {
      getChatbotKnowledge: async () => { throw new Error('Should not require DB in offline mode'); },
      buildChatbotUiHints: () => ({ actions: [{ path: '/troubleshoot' }], quickReplies: [] }),
      buildTroubleshootingSessionContext: () => ({ valid: false }),
    },
  });
  const req = { body: { message: 'My ticket status' }, aiAccess: { allowed: false, reason: 'disabled' }, user: { id: 11 } };
  const res = response();
  await ctrl.sendChatbotMessage(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.source, 'built-in-support');
  assert.match(res.body.reply, /cannot verify your personal request status/i);
  assert.equal(aiCalls, 0);
  assert.equal(res.body.actions[0].path, '/troubleshoot');
});

test('Disabled mode does not override AI quota HTTP 429', async () => {
  const ctrl = harness('controllers/chatbotController.js', {
    '../services/geminiService': {},
    '../services/chatbotKnowledgeService': { buildChatbotUiHints: () => ({actions: [], quickReplies: []}) },
  });
  const res = response();
  await ctrl.sendChatbotMessage({ body: { message: 'hello' }, aiAccess: { allowed: false, reason: 'quota' } }, res);
  assert.equal(res.statusCode, 429);
});

test('Ticket remains a success when optional incident association fails', async () => {
  let inserts = 0;
  const ctrl = harness('controllers/ticketController.js', {
    '../models/ticketModel': { createTicket: async () => {inserts++; return 105;} },
    '../models/notificationModel': notifications,
    '../utils/safeNotification': { notifySafely: async (_label, fn) => fn() },
    '../utils/ownership': ownership,
    '../models/incidentModel': { linkTicketIfActive: async () => {throw new Error('optional incident DB unavailable');} },
    '../config/db': {},
    '../utils/adminFilteredLists': {},
    '../utils/adminPagination': {},
  });
  const res = response();
  await ctrl.createTicketController({ body: { category: 'Connection Issue', subject: 'No signal' }, user: {id: 12,location: 'Balayan',accountName:'Test',accountNumber:'123'} }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.id, 105);
  assert.equal(inserts, 1);
});

test('Incomplete local ticket schema produces actionable HTTP 503, not a misleading generic error', async () => {
  const ctrl = harness('controllers/ticketController.js', {
    '../models/ticketModel': { createTicket: async () => { const error = new Error('missing columns'); error.code='SCHEMA_NOT_READY'; throw error; } },
    '../models/notificationModel': notifications,
    '../utils/safeNotification': { notifySafely: async () => {} },
    '../utils/ownership': ownership,
    '../models/incidentModel': {},
    '../config/db': {},
    '../utils/adminFilteredLists': {},
    '../utils/adminPagination': {},
  });
  const res = response();
  await ctrl.createTicketController({ body: {category:'Other',subject:'Test'},user:{id:12}},res);
  assert.equal(res.statusCode, 503);
  assert.match(res.body.error, /schema/i);
});

test('Technician request is successful even if optional incident association fails', async () => {
  let inserts = 0;
  const ctrl = harness('controllers/technicianController.js', {
    '../models/technicianModel': { createRequest: async () => {inserts++;return 107;} },
    '../models/userModel': { findByAccountIdOrCca: async () => ({id:12,accountNumber:'123',accountName:'Test',address:'Balayan',location:'Balayan'}) },
    '../models/notificationModel': notifications,
    '../utils/safeNotification': { notifySafely: async (_label, fn) => fn() },
    '../utils/ownership': ownership,
    '../utils/cloudinaryUpload': { uploadImageMaybe: async () => null, isUploadStorageError:()=>false },
    '../models/incidentModel': {linkTechnicianIfActive: async () => {throw new Error('incident unavailable');}},
  });
  const res = response();
  await ctrl.createTechnicianRequest({body:{accountNumber:'123',contactName:'Demo',contactPhone:'09123456789',issueDescription:'No signal',service_address:'Test location'},user:{id:12}},res);
  assert.equal(res.statusCode,201);
  assert.equal(res.body.id,107);
  assert.equal(inserts,1);
});
