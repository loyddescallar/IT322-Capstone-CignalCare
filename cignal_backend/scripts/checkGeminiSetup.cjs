#!/usr/bin/env node
'use strict';
// Run from cignal_backend: node scripts/checkGeminiSetup.cjs
// Displays config readiness only. Does not send an API request or print secrets.
require('dotenv').config();
const { aiEnabled, limits } = require('../middleware/aiUsageGuard');
const { getGeminiModel, getGeminiThinkingLevel } = require('../services/geminiService');
const shared = require('../utils/sharedQuotaStore');
const production = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const mode = String(process.env.CIGNALCARE_AI_MODE || 'disabled').trim();
const keyPresent = Boolean(String(process.env.GEMINI_API_KEY || '').trim());
const model = getGeminiModel();
const thinking = getGeminiThinkingLevel(model);
let sharedReady = false;
let sharedConfigError = '';
try { sharedReady = shared.configured(); }
catch (e) { sharedConfigError = e.message || 'Invalid shared quota configuration'; }
console.log('CignalCare Gemini configuration (no secrets):');
console.log('  Environment:', production ? 'production' : 'development');
console.log('  Opt-in mode:', mode === 'verified-free' ? 'verified-free' : 'not enabled');
console.log('  Gemini API key:', keyPresent ? 'present' : 'missing');
console.log('  Approved model:', model);
console.log('  Thinking level:', thinking);
console.log('  Shared quota:', sharedConfigError ? 'INVALID' : (sharedReady ? 'configured' : 'not configured'));
console.log('  Limits:', JSON.stringify(limits()));
if (sharedConfigError) console.error('  Shared quota issue:', sharedConfigError);
const problems=[];
if (!aiEnabled()) problems.push('Set CIGNALCARE_AI_MODE=verified-free and GEMINI_API_KEY on the backend.');
if (sharedConfigError) problems.push('Correct the Upstash Redis REST URL/token settings.');
if (production && !sharedReady) problems.push('Production requires both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.');
if (problems.length) {
  console.error('AI availability: BLOCKED by configuration');
  for(const p of problems) console.error(' -',p);
  process.exitCode=1;
} else {
  console.log('AI availability: CONFIGURATION READY (provider connectivity/credits/quota not tested)');
}
