"use strict";
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const backend=path.resolve(__dirname,'..');
const source=(p)=>fs.readFileSync(path.join(backend,p),'utf8');

test('external chat alerts use the persisted message ID; no one-alert-per-day collapse',()=>{
  const s=source('controllers/messageController.js');
  assert.match(s,/eventKey:`reply:message:\$\{result\.insertId\}`/);
  assert.doesNotMatch(s,/eventKey:`reply:\$\{new Date\(\)\.toISOString\(\)\.slice\(0,10\)\}`/);
});

test('external call follow-up alerts use the persisted call ID',()=>{
  const s=source('controllers/ticketSupportController.js');
  assert.match(s,/eventKey:`reply:call:\$\{call\.id\}`/);
  assert.doesNotMatch(s,/eventKey:`reply:\$\{new Date\(\)\.toISOString\(\)\.slice\(0,10\)\}`/);
});

test('Postgres migration protects ticket support PII with row-level security and grants',()=>{
  const s=source('migrations/20261115_ticket_support_postgres.sql');
  for(const table of ['ticket_support_details','ticket_support_calls','ticket_support_deliveries']){
    assert.match(s,new RegExp('ALTER TABLE public\\.'+table+' ENABLE ROW LEVEL SECURITY;'));
    assert.match(s,new RegExp('REVOKE ALL ON TABLE[\\s\\S]*'+table+'[\\s\\S]*FROM PUBLIC, anon, authenticated;'));
  }
});
