'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ExcelJS = require('exceljs');
const { buildPremiumExcelReport, activityCounts, scopeCounts } = require('../services/premiumExcelReport');
const base = path.resolve(__dirname, '../..');
const read = file => fs.readFileSync(path.join(base, file), 'utf8');
const daysAgo = days => new Date(Date.now() - days * 86400000).toISOString();

test('premium workbook uses 120-day At Risk logic, separate archive cohort and location segmentation', () => {
  const rows = activityCounts([
    {location:'Nasugbu',status:'active',lastLoadDate:daysAgo(10)},
    {location:'Nasugbu',status:'active',lastLoadDate:daysAgo(80)},
    {location:'Nasugbu',status:'active',lastLoadDate:daysAgo(130)},
    {location:'Nasugbu',status:'active',lastLoadDate:null},
    {location:'Balayan',status:'archived',lastLoadDate:daysAgo(200)},
  ]);
  const n = scopeCounts(rows,'Nasugbu');
  assert.deepEqual(n,{active:1,inactive:1,atRisk:1,noLoad:1,archived:0,total:4});
  const b = scopeCounts(rows,'Balayan');
  assert.deepEqual(b,{active:0,inactive:0,atRisk:0,noLoad:0,archived:1,total:1});
});

test('premium Excel export creates a real branded 5-tab xlsx with correct financial and safety labels', async () => {
  const payload={
    filters:{days:30,location:null},
    kpis:{totalRevenue:1500,prepaidRevenue:900,serviceRevenue:600,grossProfit:120,totalTickets:4,resolvedTickets:3,resolutionRate:75,totalTransactions:7},
    salesByLocation:[{location:'Nasugbu',revenue:1500,count:7}],
    salesByChannel:[{channel:'POS',revenue:900,count:3},{channel:'Service — Cash',revenue:600,count:4}],
    topIssues:[{label:'No Signal',count:4}],
    locations:[{location:'Nasugbu',subscribers:3,support:4,supportPer100:133.3}],
    trend:[{date:'2026-11-17',sales:1500,support:4,resolved:3}],
    selfServiceMethods:[],supportFunnel:{sessions:5,selfResolved:2},technician:{total:2},
  };
  const bytes=await buildPremiumExcelReport(payload,[{location:'Nasugbu',status:'active',lastLoadDate:daysAgo(135)}]);
  assert.equal(bytes.subarray(0,2).toString(),'PK');
  const wb=new ExcelJS.Workbook();await wb.xlsx.load(bytes);
  assert.deepEqual(wb.worksheets.map(s=>s.name),[
    'EXECUTIVE HOME','SUBSCRIBER INSIGHTS','REVENUE & SALES','SUPPORT PERFORMANCE','REPORT NOTES'
  ]);
  const home=wb.getWorksheet('EXECUTIVE HOME');
  assert.equal(home.getCell('A1').value,'CIGNALCARE+  /  BUSINESS INTELLIGENCE');
  assert.equal(home.getCell('A10').value,1500);
  assert.equal(home.getCell('D16').value,1);
  assert.equal(home.getCell('A1').fill.fgColor.argb,'FFCC0000');
  assert.equal(home.getImages().length,1,'Executive sheet must embed the sales/support chart');
  const subs=wb.getWorksheet('SUBSCRIBER INSIGHTS');
  assert.equal(subs.getCell('B6').dataValidation.type,'list');
  assert.equal(subs.getCell('B13').value.result,1);
  assert.equal(subs.getCell('D26').value,1);
  assert.match(String(subs.getCell('A31').value),/not automatically archived/i);
  assert.ok(bytes.length>7000);
});

test('premium subscriber import header remains parser-compatible in FIRST worksheet row ONE', async () => {
  const file=path.join(base,'Cignal_Frontend/public/templates/CignalCare_Subscriber_Import_Template.xlsx');
  const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(file);
  const subs=wb.worksheets[0];
  assert.equal(subs.name,'Subscribers');
  assert.deepEqual(subs.getRow(1).values.slice(1),['NAME','ADDRESS','CCA NUMBER','ACCT NUMBER','EMAIL','PHONE']);
  subs.getCell('A2').value='SAMPLE TEST ACCOUNT';
  subs.getCell('B2').value='Sample Address';
  subs.getCell('C2').value='1234567890';
  subs.getCell('D2').value='12345678';
  const { parseSubscriberWorkbook }=require('../services/subscriberImportService');
  const rows=await parseSubscriberWorkbook(await wb.xlsx.writeBuffer(),'Nasugbu');
  assert.equal(rows.length,1);
  assert.deepEqual(rows[0].errors,[]);
  assert.equal(rows[0].location,'Nasugbu');
});

test('Excel download reuses authenticated analytics route; CSV path remains untouched', () => {
  const controller=read('cignal_backend/controllers/analyticsController.js');
  const routes=read('cignal_backend/routes/analyticsRoutes.js');
  const page=read('Cignal_Frontend/src/pages/admin/AdminAnalytics.jsx');
  const api=read('Cignal_Frontend/src/api/analyticsApi.js');
  assert.match(routes,/router\.get\('\/admin',authRequired,requireRole\('admin'\),getAdminAnalytics\)/);
  assert.match(controller,/req\.query\.format === 'xlsx'/);
  assert.match(controller,/getAllUsers\('all'\)/);
  assert.match(controller,/buildPremiumExcelReport/);
  assert.match(page,/Export Excel Dashboard/);
  assert.match(page,/Export CSV/);
  assert.match(api,/getAdminAnalyticsExcel/);
});
