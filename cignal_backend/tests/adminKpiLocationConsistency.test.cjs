// CignalCare+ Administrator KPI location consistency: real pure logic and page wiring.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const pages = name => fs.readFileSync(path.resolve(__dirname, '../../Cignal_Frontend/src/pages/admin', name), 'utf8');
const helpers = () => import('../../Cignal_Frontend/src/utils/adminKpiLocation.js');

test('Technician KPIs obey location, retain Pending/Cancelled and source counts', async () => {
  const { technicianLocationKpis, matchesAdminLocation } = await helpers();
  const records = [
    {location:'Nasugbu',status:'Pending',source:'load_request_signal_check'},
    {location:'Nasugbu',status:'Cancelled',source:'manual'},
    {location:'Balayan',status:'Completed',source:'load_request_signal_check'},
    {location:'Calaca City',status:'Scheduled',source:'manual'},
  ];
  assert.deepEqual(technicianLocationKpis(records, 'Nasugbu'), {
    Total:2, Submitted:1, 'Under Review':0, Scheduled:0,
    Completed:0, Cancelled:1, 'From Load Check':1,
  });
  assert.equal(technicianLocationKpis(records, 'All').Total, 4);
  assert.equal(technicianLocationKpis(records, 'Balayan').Completed, 1);
  assert.equal(matchesAdminLocation('Calaca City','Calaca'), true);
});

test('Subscriber KPIs obey location, archive and Manila month consistently', async () => {
  const { subscriberLocationKpis } = await helpers();
  const now = new Date('2026-11-18T02:00:00.000Z');
  const records = [
    {location:'Nasugbu',status:'active',created_at:'2026-11-10T02:00:00Z',lastLoadDate:'2026-11-17T00:00:00Z'},
    {location:'Nasugbu',status:'archived',created_at:'2026-11-12T02:00:00Z',lastLoadDate:null},
    {location:'Balayan',status:'active',created_at:'2026-10-01T02:00:00Z',lastLoadDate:null},
  ];
  const n = subscriberLocationKpis(records, 'Nasugbu', now);
  assert.equal(n.allCustomers,2);
  assert.equal(n.thisMonth,2);
  assert.equal(n.archivedCount,1);
  assert.equal(n.activeCount,1);
  assert.equal(n.neverLoadedCount,0);
  const b = subscriberLocationKpis(records, 'Balayan', now);
  assert.equal(b.allCustomers,1);
  assert.equal(b.neverLoadedCount,1);
  assert.equal(subscriberLocationKpis(records, 'All', now).allCustomers,3);
});

test('Technician table filter and KPI counts share identical location matching', () => {
  const s = pages('AdminTechnicianRequests.jsx');
  assert.match(s, /technicianLocationKpis\(requests, locF\)/);
  assert.match(s, /matchesAdminLocation\(r\.location,locF\)/);
  assert.match(s, /value:locationKpis\.Submitted/);
});

test('Subscriber list fetches complete admin-authorized population and filters records locally', () => {
  const s = pages('AdminCustomers.jsx');
  assert.match(s, /customerApi\.getCustomers\('all'\)/);
  assert.match(s, /subscriberLocationKpis\(customers, locTab\)/);
  assert.match(s, /matchesRecordStatus && matchesLocation/);
  assert.match(s, /\[customers, recordStatus\]/);
  assert.match(s, /status !== 'Archived'/);
});

test('Plans With Channels count matches the number of filtered plan cards', () => {
  const s = pages('AdminPlans.jsx');
  assert.match(s, /label: 'Plans With Channels', value: plansWithChannels/);
  assert.match(s, /const plansWithChannels = plans\.filter/);
  assert.match(s, /channel entries/);
});

test('Other admin KPI totals remain location-aware or explicitly location-independent', () => {
  const tickets = pages('AdminTickets.jsx');
  const incidents = pages('AdminIncidents.jsx');
  const plans = pages('AdminPlans.jsx');
  assert.match(tickets, /status: statusFilter, category: catFilter, location: locTab/);
  assert.match(tickets, /summary\.statusCounts/);
  assert.match(incidents, /status: key,\s*location,/);
  assert.match(incidents, /status: 'dismissed', location, sort/);
  assert.match(plans, /statusFilter === 'with-channels'/);
});
