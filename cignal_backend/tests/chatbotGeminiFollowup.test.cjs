 'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const service=require('../services/geminiService');

const original = process.env.GEMINI_MODEL;
test.after(() => { if(original===undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL=original; });

test('Gemini 3.8 Flash uses supported low thinking level', () => {
  process.env.GEMINI_MODEL='gemini-3.8-flash';
  assert.equal(service.getGeminiModel(), 'gemini-3.8-flash');
  assert.equal(service.getGeminiThinkingLevel(), 'low');
});
test('Flash-Lite keeps minimal thinking and cost bounds', () => {
  for(const m of ['gemini-3.1-flash-lite','gemini-3.5-flash-lite']) {
    process.env.GEMINI_MODEL=m;
    assert.equal(service.getGeminiThinkingLevel(), 'minimal');
  }
  process.env.GEMINI_MODEL='gemini-3.5-flash';
  assert.equal(service.getGeminiThinkingLevel(), 'minimal');
});
test('Unknown model still fails closed to approved Flash-Lite', () => {
  const originalWarn=console.warn;
  console.warn=()=>{};
  try {
    process.env.GEMINI_MODEL='gemini-4-argon';
    assert.equal(service.getGeminiModel(),'gemini-3.1-flash-lite');
    assert.equal(service.getGeminiThinkingLevel(), 'minimal');
  } finally { console.warn=originalWarn; }
});
test('Both Gemini call paths use model-dependent thinking', () => {
  const src=fs.readFileSync(path.join(__dirname,'../services/geminiService.js'),'utf8');
  assert.equal((src.match(/thinking_level: getGeminiThinkingLevel\(\)/g)||[]).length,2);
  assert.match(src,/max_output_tokens:\s*2048/);
  assert.match(src,/max_output_tokens:\s*1024/);
  assert.match(src,/store:\s*false/);
});
test('Chatbot frontend sends normal chat to backend rather than always intercepting greetings', () => {
  const src=fs.readFileSync(path.resolve(__dirname,'../../Cignal_Frontend/src/components/CignalBot.jsx'),'utf8');
  assert.match(src,/cleanText\.toLowerCase\(\) === 'back to menu'/);
  assert.doesNotMatch(src,/const ruleResponse = shouldUseLiveData \? null : getRuleBasedResponse\(cleanText\)/);
  assert.match(src,/await sendChatbotMessage\(/);
});
