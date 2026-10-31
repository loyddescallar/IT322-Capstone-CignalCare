const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('chat comparator ignores identical message datasets', async () => {
  const mod = await import(pathToFileURL(path.join(ROOT, 'Cignal_Frontend/src/utils/sameChatMessages.mjs')).href);
  const rows = [{ id: 1, message: 'hello', attachment: null }, { id: 2, message: 'world' }];
  assert.equal(mod.sameChatMessages(rows, rows.map(x => ({ ...x }))), true);
  assert.equal(mod.sameChatMessages(rows, [...rows, { id: 3, message: 'new' }]), false);
  assert.equal(mod.sameChatMessages(rows, [{ ...rows[0], message: 'changed' }, rows[1]]), false);
  assert.equal(mod.sameChatMessages(rows, [{ ...rows[1] }, { ...rows[0] }]), false);
});

test('poll helper stops in background, aborts obsolete requests and prevents overlap', () => {
  const s = read('Cignal_Frontend/src/hooks/useAdaptiveMessagePolling.js');
  for (const piece of ['visibilitychange', "visibilityState === 'hidden'", 'inFlight', 'AbortController', 'activeController?.abort()', 'clearInterval(timer)', '8000']) assert.ok(s.includes(piece), piece);
});

test('all three chat views use shared visibility-aware polling', () => {
  for (const p of ['Cignal_Frontend/src/pages/user/UserChat.jsx', 'Cignal_Frontend/src/pages/admin/AdminChat.jsx', 'Cignal_Frontend/src/pages/admin/AdminTickets.jsx']) {
    const s = read(p);
    assert.ok(s.includes('useAdaptiveMessagePolling('), p);
    assert.ok(s.includes('sameChatMessages(current, incoming)'), p);
    assert.ok(s.includes('signal?.aborted'), p);
    assert.ok(!s.includes('window.setInterval(loadMessages, 3000)'), p);
    assert.ok(!s.includes('const interval = setInterval(() => loadMessages'), p);
  }
});

test('existing messages API accepts cancellation and all other callers remain supported', () => {
  const s = read('Cignal_Frontend/src/api/ticketApi.js');
  assert.ok(s.includes('getTicketMessages: (id, config = {})'));
  assert.ok(s.includes('axiosClient.get(`/tickets/${id}/messages`, config)'));
});

test('network timeout is bounded while multipart upload gets a longer timeout', () => {
  assert.ok(read('Cignal_Frontend/src/api/axiosClient.js').includes('timeout: 30000'));
  assert.ok(read('Cignal_Frontend/src/api/ticketApi.js').includes('timeout: 60000'));
});
