'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { getGeminiModel } = require('../services/geminiService');

const oldModel = process.env.GEMINI_MODEL;
test.after(() => {
  if (oldModel === undefined) delete process.env.GEMINI_MODEL;
  else process.env.GEMINI_MODEL = oldModel;
});

test('existing Gemini 3.5 Flash and deployed 3.8 Flash models are not silently changed', () => {
  for (const model of ['gemini-3.1-flash-lite', 'gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash']) {
    process.env.GEMINI_MODEL = model;
    assert.equal(getGeminiModel(), model);
  }
});

test('unapproved Gemini model is still rejected by the allowlist', () => {
  process.env.GEMINI_MODEL = 'gemini-3.1-pro-preview';
  assert.equal(getGeminiModel(), 'gemini-3.1-flash-lite');
});

test('technician form cannot silently preload a potentially stale profile phone', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../Cignal_Frontend/src/pages/user/UserTechnicianRequest.jsx'), 'utf8');
  assert.match(source, /contactPhone:\s*'',/);
  assert.match(source, /setSubmittedContactPhone\(response\.data\?\.contactPhone \|\| submittedPhone\)/);
  assert.match(source, /<strong>\{submittedContactPhone\}<\/strong>/);
});
