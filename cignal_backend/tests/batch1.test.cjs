'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { FIXED_LOAD_VALIDITY_DAYS } = require('../utils/loadValidity');
const { posReferenceFromKey, isSamePosTransaction } = require('../utils/posIdempotency');

const backendDir = path.resolve(__dirname, '..');
const frontendDir = path.resolve(__dirname, '../../Cignal_Frontend/src');

const key = '123e4567-e89b-42d3-a456-426614174000';
const ref = 'POS-' + key.toUpperCase();

function fakeLoadModel({ existing = null, duplicateAtInsert = false, planValidity = 75 } = {}) {
  const calls = [];
  let visibleExisting = existing;
  let commits = 0, rollbacks = 0, releases = 0;
  const plan = { id: 12, plan_name: 'Test plan', amount: 600, validity_days: planValidity };
  const fakeConnection = {
    beginTransaction: async () => {},
    commit: async () => { commits += 1; },
    rollback: async () => { rollbacks += 1; },
    release: () => { releases += 1; },
    query: async (sql, args = []) => {
      calls.push({ sql, args });
      if (/SELECT \* FROM prepaid_transactions WHERE reference_no/.test(sql)) return [[visibleExisting].filter(Boolean)];
      if (/FROM prepaid_plans/.test(sql)) return [[plan]];
      if (/INSERT INTO prepaid_transactions/.test(sql)) {
        if (duplicateAtInsert) {
          visibleExisting = { id: 89, status: 'completed', reference_no: ref,
            account_number: '123456789', user_id: 7, plan_id: 12, amount: 600, payment_method: 'Cash' };
          throw Object.assign(new Error('duplicate reference'), { code: 'ER_DUP_ENTRY' });
        }
        return [{ insertId: 44 }];
      }
      if (/INSERT INTO load_history/.test(sql)) return [{ insertId: 45 }];
      if (/INSERT INTO prepaid_accounts/.test(sql)) return [{ affectedRows: 1 }];
      throw new Error('Unexpected SQL ' + sql.slice(0, 120));
    },
  };
  const pool = {
    getConnection: async () => fakeConnection,
    query: async (sql, args = []) => {
      calls.push({ sql, args });
      if (/FROM prepaid_transactions/.test(sql)) return [[visibleExisting].filter(Boolean)];
      if (/FROM prepaid_plans/.test(sql)) return [[plan]];
      throw new Error('Unexpected pool SQL');
    },
  };
  const source = fs.readFileSync(path.join(backendDir, 'models/loadModel.js'), 'utf8');
  const moduleObject = { exports: {} };
  const context = {
    module: moduleObject,
    exports: moduleObject.exports,
    require: (specifier) => {
      if (specifier === '../config/db') return pool;
      if (specifier === '../utils/loadValidity') return { FIXED_LOAD_VALIDITY_DAYS };
      if (specifier === '../utils/posIdempotency') return require('../utils/posIdempotency');
      throw new Error('Unexpected require ' + specifier);
    },
  };
  vm.runInNewContext(source, context, { filename: 'loadModel.js' });
  const entry = { user_id: 7, accountNumber: '123456789', accountName: 'Test Customer',
    plan_id: 12, loadAmount: 600, payment_method: 'Cash', processed_by: 'Admin', reference_no: ref };
  return { process: () => moduleObject.exports.processPosLoad(entry), entry, calls,
    state: () => ({ commits, rollbacks, releases }) };
}

test('POS UUID is stable and invalid identities are refused', () => {
  assert.equal(FIXED_LOAD_VALIDITY_DAYS, 30);
  assert.equal(posReferenceFromKey(key), ref);
  assert.equal(posReferenceFromKey(''), null);
  assert.equal(posReferenceFromKey('not-a-uuid'), null);
});

test('30-day validity persists even when stored plan is 75 days', async () => {
  const sut = fakeLoadModel({ planValidity: 75 });
  const result = await sut.process();
  assert.equal(result.replayed, undefined);
  const transaction = sut.calls.find(x => /INSERT INTO prepaid_transactions/.test(x.sql));
  const account = sut.calls.find(x => /INSERT INTO prepaid_accounts/.test(x.sql));
  assert.ok(transaction);
  assert.ok(account);
  assert.deepEqual(Array.from(transaction.args.slice(-2)), [30, 30]);
  assert.deepEqual(Array.from(account.args.slice(-2)), [30, 30]);
  assert.equal(sut.calls.filter(x => /INSERT INTO load_history/.test(x.sql)).length, 1);
  assert.deepEqual(sut.state(), { commits: 1, rollbacks: 0, releases: 1 });
});

test('exact POS retry returns the original sale without load-history or expiry changes', async () => {
  const sut = fakeLoadModel({ existing: { id: 71, status: 'completed', reference_no: ref,
    account_number: '123456789', user_id: 7, plan_id: 12, amount: 600, payment_method: 'Cash' } });
  const result = await sut.process();
  assert.equal(result.replayed, true);
  assert.equal(result.transactionId, 71);
  assert.equal(sut.calls.some(x => /INSERT INTO/.test(x.sql)), false);
  assert.deepEqual(sut.state(), { commits: 1, rollbacks: 0, releases: 1 });
});

test('reuse of POS identity for different account is rejected', async () => {
  const sut = fakeLoadModel({ existing: { id: 71, status: 'completed', reference_no: ref,
    account_number: 'DIFFERENT', user_id: 7, plan_id: 12, amount: 600, payment_method: 'Cash' } });
  await assert.rejects(sut.process(), e => e.code === 'POS_IDEMPOTENCY_CONFLICT');
  assert.equal(sut.calls.some(x => /INSERT INTO/.test(x.sql)), false);
  assert.deepEqual(sut.state(), { commits: 0, rollbacks: 1, releases: 1 });
});

test('concurrent unique-key collision resolves to committed identical sale', async () => {
  const sut = fakeLoadModel({ duplicateAtInsert: true });
  const result = await sut.process();
  assert.equal(result.replayed, true);
  assert.equal(result.transactionId, 89);
  assert.equal(sut.calls.filter(x => /INSERT INTO load_history/.test(x.sql)).length, 0);
  assert.deepEqual(sut.state(), { commits: 0, rollbacks: 1, releases: 1 });
});

test('Batch 1 removes configurable prepaid validity everywhere it is issued', () => {
  const request = fs.readFileSync(path.join(backendDir, 'models/loadRequestModel.js'), 'utf8');
  const controller = fs.readFileSync(path.join(backendDir, 'controllers/loadController.js'), 'utf8');
  const chatbot = fs.readFileSync(path.join(backendDir, 'services/chatbotKnowledgeService.js'), 'utf8');
  const plans = fs.readFileSync(path.join(frontendDir, 'pages/admin/AdminPlans.jsx'), 'utf8');
  const helpers = fs.readFileSync(path.join(frontendDir, 'utils/planHelpers.js'), 'utf8');
  assert.match(request, /const validityDays = FIXED_LOAD_VALIDITY_DAYS/);
  assert.match(controller, /const validityDays = FIXED_LOAD_VALIDITY_DAYS/);
  assert.match(chatbot, /validityDays: FIXED_LOAD_VALIDITY_DAYS/);
  assert.doesNotMatch(plans, /name: 'validity_days'/);
  assert.match(helpers, /duration: '30 days'/);
});

test('MySQL local setup SQL includes structure only; no prior rows', () => {
  const schema = fs.readFileSync(path.join(backendDir, 'sql/CignalCare_Schema.sql'), 'utf8');
  assert.match(schema, /CREATE TABLE `prepaid_transactions`/);
  assert.match(schema, /UNIQUE KEY `uq_reference`/);
  assert.doesNotMatch(schema, /\bINSERT\s+INTO\b/i);
});
