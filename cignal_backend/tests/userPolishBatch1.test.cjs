'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const utilitySource = read('Cignal_Frontend/src/utils/sessionActivity.js');
const loadUtils = () => import(`data:text/javascript;base64,${Buffer.from(utilitySource).toString('base64')}`);
const pageKnowledge = require('../services/chatbotPageKnowledge');

function fakeStorage() {
  const data = new Map();
  return {
    setItem: (k, v) => data.set(k, String(v)),
    getItem: (k) => data.has(k) ? data.get(k) : null,
    removeItem: (k) => data.delete(k),
  };
}

test('inactivity boundary: three-minute warning and five-minute logout', async () => {
  const u = await loadUtils();
  assert.equal(u.SESSION_WARNING_MS, 180_000);
  assert.equal(u.SESSION_TIMEOUT_MS, 300_000);
  assert.equal(u.getInactivityState(1_000_000, 1_179_999).warning, false);
  assert.equal(u.getInactivityState(1_000_000, 1_180_000).warning, true);
  assert.equal(u.getInactivityState(1_000_000, 1_299_999).expired, false);
  assert.equal(u.getInactivityState(1_000_000, 1_300_000).expired, true);
  assert.equal(u.getInactivityState(1_000_000, 1_300_000).remainingMs, 0);
});

test('inactivity identity uses session fingerprint; new login cannot inherit old idle timeout', async () => {
  const u = await loadUtils();
  const a = u.getSessionIdentity('token-one', { id: 42, role: 'user' });
  const b = u.getSessionIdentity('token-two', { id: 42, role: 'user' });
  const c = u.getSessionIdentity('token-one', { id: 42, role: 'admin' });
  assert.notEqual(a, b);
  assert.notEqual(a, c);
  assert.equal(u.getSessionIdentity('', { id: 42, role: 'user' }), null);
  assert.equal(u.getSessionIdentity('x', { id: 42, role: 'unknown' }), null);
  const s = fakeStorage();
  u.saveLastHumanActivity(s, a);
  assert.ok(Math.abs(u.readLastHumanActivity(s, a) - Date.now()) < 2500);
  assert.equal(u.readLastHumanActivity(s, b), null);
});

test('inactivity storage is robust against corruption and does not store the JWT itself', async () => {
  const u = await loadUtils();
  const s = fakeStorage();
  const token = 'jwt-secret-example-should-not-be-repeated';
  const id = u.getSessionIdentity(token, { id: 27, role: 'admin' });
  u.saveLastHumanActivity(s, id);
  assert.doesNotMatch(s.getItem(u.SESSION_ACTIVITY_KEY), /jwt-secret-example/);
  s.setItem(u.SESSION_ACTIVITY_KEY, 'not-json');
  assert.equal(u.readLastHumanActivity(s, id), null);
});

test('guard is mounted globally and human activity excludes background API polling', () => {
  const app = read('Cignal_Frontend/src/App.jsx');
  const guard = read('Cignal_Frontend/src/components/SessionTimeoutGuard.jsx');
  assert.match(app, /<SessionTimeoutGuard\s*\/>/);
  assert.match(guard, /role="alertdialog"/);
  assert.match(guard, /Stay Signed In/);
  assert.match(guard, /event\.isTrusted/);
  assert.match(guard, /\['pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel', 'scroll'\]/);
  assert.match(guard, /localStorage\.removeItem\('token'\)/);
  assert.match(guard, /window\.location\.replace/);
  assert.doesNotMatch(guard, /fetch\(|axios\(|setInterval\(.*saveLastHumanActivity/);
});

test('subscriber ticket page uses accessible KPI filters, has Archived, and no duplicate status dropdown', () => {
  const tickets = read('Cignal_Frontend/src/pages/user/UserTickets.jsx');
  assert.match(tickets, /aria-pressed=\{statusFilter === status\}/);
  assert.match(tickets, /setStatus\('Archived'\)/);
  assert.match(tickets, /id="my-tickets-sort"/);
  assert.doesNotMatch(tickets, /<select value=\{statusFilter\}/);
  assert.match(tickets, /onKeyDown=\{\(event\) =>/);
  assert.match(tickets, /No archived tickets yet/);
});

test('CignalBot uses page-aware quick suggestions and sends current page to backend', () => {
  const frontend = read('Cignal_Frontend/src/components/CignalBot.jsx');
  const api = read('Cignal_Frontend/src/api/chatbotApi.js');
  const controller = read('cignal_backend/controllers/chatbotController.js');
  assert.match(frontend, /getBotPageGuide\(location\.pathname\)/);
  assert.match(frontend, /page: location\.pathname/);
  assert.match(frontend, /pageGuide\.quickReplies\.map/);
  assert.match(api, /page,/);
  assert.match(controller, /getChatbotPageKnowledge\(req\.body\?\.page\)/);
  assert.match(controller, /pageHelp\?\.context/);
});

test('server-side page context is allowlisted, navigation-only, never grants privileges', () => {
  assert.equal(pageKnowledge.getChatbotPageKnowledge('/admin/security'), null);
  assert.equal(pageKnowledge.getChatbotPageKnowledge('/user/not-a-real-page'), null);
  assert.equal(pageKnowledge.getChatbotPageKnowledge('/user/tickets?injected=true'), null);
  assert.equal(pageKnowledge.getChatbotPageKnowledge({ path: '/user/tickets' }), null);
  const page = pageKnowledge.getChatbotPageKnowledge('/user/tickets');
  assert.equal(page.title, 'My Tickets');
  assert.match(page.context, /NOT authorization/);
  assert.equal(pageKnowledge.isPageGuidanceQuestion('What can I do on this page?'), true);
  assert.equal(pageKnowledge.isPageGuidanceQuestion('What is the status of ticket #123?'), false);
});
