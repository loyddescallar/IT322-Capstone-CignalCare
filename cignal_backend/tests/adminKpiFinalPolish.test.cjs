// Admin KPI final-polish guardrails. No running app / network required.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = name => fs.readFileSync(path.join(__dirname, '../../Cignal_Frontend/src/pages/admin', name), 'utf8');

test('Subscriber KPI navigation preserves archived data and safe row actions', () => {
  const s = read('AdminCustomers.jsx');
  assert.match(s, /function StatCard\(\{ label, value, color, icon, active, onClick \}\)/);
  assert.match(s, /setRecordStatus\(next === 'Archived' \? 'archived'/);
  assert.match(s, /next === 'Total Subscribers' \|\| next === 'New This Month' \? 'all'/);
  assert.match(s, /status !== 'Archived'/);
  assert.match(s, /manilaDayKey\(customer\.created_at\)/);
  assert.doesNotMatch(s, /Current Subscribers\s*<\/button>/);
});
test('Ticket KPI is keyboard accessible and duplicate status row was removed', () => {
  const s = read('AdminTickets.jsx');
  assert.match(s, /aria-pressed=\{statusFilter === status\}/);
  assert.doesNotMatch(s, /\['All', \.\.\.STATUSES\]\.map/);
  assert.match(s, /ticketApi\.getAdminTickets/);
});
test('Technician KPI preserves Pending mapping, cancel status and source filter', () => {
  const s = read('AdminTechnicianRequests.jsx');
  assert.match(s, /label:'Cancelled'/);
  assert.match(s, /kpiFilter === 'From Load Check'/);
  assert.match(s, /\['Submitted','Pending'\]\.includes\(r\.status\)/);
  assert.doesNotMatch(s, /setStatusF/);
  assert.match(s, /aria-pressed=\{kpiFilter===s\.label\}/);
});
test('Incidents use KPI navigation without search; confirmation and history remain', () => {
  const s = read('AdminIncidents.jsx');
  assert.doesNotMatch(s, /Search incidents|setSearch\(|search,|\[search, location/);
  assert.match(s, /setHistoryOpen\(true\)/);
  assert.match(s, /incidentApi\.detectCandidates/);
  assert.match(s, /activeLane === 'all'/);
  assert.match(s, /dismissedCount/);
});
test('Plan KPI provides all, active, inactive and channel filters', () => {
  const s = read('AdminPlans.jsx');
  assert.match(s, /filter: 'with-channels'/);
  assert.match(s, /filter: 'inactive'/);
  assert.match(s, /aria-pressed=\{statusFilter === item\.filter\}/);
  assert.doesNotMatch(s, /\['All', 'active', 'inactive'\]\.map/);
  assert.match(s, /handleSavePlan/);
});
