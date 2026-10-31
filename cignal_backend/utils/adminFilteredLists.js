// Defense Batch 2C: opt-in, fully filtered admin lists with independent summary counts.
// Does not modify legacy endpoints, DB schemas, or payment processing.
const STATUSES = ['Submitted', 'Under Review', 'Job Order Assigned', 'Resolved', 'Archived'];
const LOAD_STATUSES = ['Received', 'Under Review', 'Attending', 'Completed', 'Rejected'];
const LOCATIONS = ['Balayan', 'Calaca', 'Lian', 'Calatagan', 'Nasugbu', 'Lemery'];

function textParam(value, field, max = 100) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) {
    const error = new Error(`Invalid ${field} filter.`);
    error.statusCode = 400;
    throw error;
  }
  return value.trim();
}
function choice(value, field, options) {
  const result = textParam(value, field, 80) || 'All';
  if (result !== 'All' && !options.includes(result)) {
    const error = new Error(`Invalid ${field} filter.`);
    error.statusCode = 400;
    throw error;
  }
  return result;
}
function normalizeLocation(location) {
  const result = String(location || '').trim();
  if (result.toLowerCase().includes('calaca')) return 'Calaca';
  return result;
}
function searchPattern(value) {
  // Escape SQL LIKE wildcard characters, so the user's query is always literal.
  return `%${value.toLowerCase().replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
function ticketFilter(raw = {}) {
  return {
    search: textParam(raw.search, 'search', 100),
    status: choice(raw.status, 'status', STATUSES),
    category: textParam(raw.category, 'category', 80) || 'All',
    location: choice(raw.location, 'location', LOCATIONS),
  };
}
function loadFilter(raw = {}) {
  return {
    search: textParam(raw.search, 'search', 100),
    status: choice(raw.status, 'status', LOAD_STATUSES),
    location: choice(raw.location, 'location', LOCATIONS),
  };
}
function ticketWhere(filters) {
  const where = ["(t.category <> 'Technician Request' OR t.category IS NULL)"];
  const params = [];
  if (filters.status === 'All') where.push("t.status <> 'Archived'");
  else { where.push('t.status = ?'); params.push(filters.status); }
  if (filters.category !== 'All') { where.push('t.category = ?'); params.push(filters.category); }
  if (filters.location !== 'All') {
    if (filters.location === 'Calaca') where.push("LOWER(COALESCE(u.location, '')) LIKE '%calaca%'");
    else { where.push('u.location = ?'); params.push(filters.location); }
  }
  if (filters.search) {
    const search = searchPattern(filters.search);
    where.push("(CONCAT('', t.id) LIKE ? OR LOWER(COALESCE(t.subject, '')) LIKE ? OR LOWER(COALESCE(t.category, '')) LIKE ? OR LOWER(COALESCE(u.accountName, '')) LIKE ? OR LOWER(COALESCE(u.accountNumber, '')) LIKE ?)");
    params.push(search, search, search, search, search);
  }
  return { where: where.join(' AND '), params };
}
function loadWhere(filters) {
  const where = [], params = [];
  if (filters.status !== 'All') { where.push('status = ?'); params.push(filters.status); }
  if (filters.location !== 'All') {
    if (filters.location === 'Calaca') where.push("LOWER(COALESCE(location, '')) LIKE '%calaca%'");
    else { where.push('location = ?'); params.push(filters.location); }
  }
  if (filters.search) {
    const search = searchPattern(filters.search);
    where.push("(LOWER(COALESCE(account_name, '')) LIKE ? OR LOWER(COALESCE(account_number, '')) LIKE ? OR LOWER(COALESCE(reference_no, '')) LIKE ? OR LOWER(COALESCE(plan_name, '')) LIKE ? OR LOWER(COALESCE(payment_method, '')) LIKE ? OR LOWER(COALESCE(payment_status, '')) LIKE ?)");
    params.push(search, search, search, search, search, search);
  }
  return { where: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
}
async function getFilteredTicketPage(pool, paging, rawFilters) {
  const filters = ticketFilter(rawFilters);
  const {where, params} = ticketWhere(filters);
  const from = ' FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE ' + where;
  const [countRows] = await pool.query('SELECT COUNT(*) AS total' + from, params);
  const [tickets] = await pool.query(
    'SELECT t.*, u.accountName, u.accountNumber, u.location' + from +
    ' ORDER BY t.created_at DESC, t.id DESC LIMIT ? OFFSET ?',
    [...params, paging.limit, paging.offset]
  );
  // Independent of pagination and search/status/category filters, matching the
  // historical UI's KPI and location-tab semantics.
  const [groupRows] = await pool.query(
    "SELECT t.status, u.location, COUNT(*) AS total FROM tickets t LEFT JOIN users u ON u.id = t.user_id WHERE (t.category <> 'Technician Request' OR t.category IS NULL) GROUP BY t.status, u.location"
  );
  const statusCounts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  const locationCounts = Object.fromEntries(LOCATIONS.map((location) => [location, 0]));
  for (const row of groupRows) {
    const status = ({Open:'Submitted', 'In Progress':'Under Review', Closed:'Archived'})[row.status] || row.status;
    const location = normalizeLocation(row.location);
    const total = Number(row.total || 0);
    if (locationCounts[location] !== undefined) locationCounts[location] += total;
    if ((filters.location === 'All' || filters.location === location) && statusCounts[status] !== undefined) {
      statusCounts[status] += total;
    }
  }
  return { tickets, total: Number(countRows?.[0]?.total || 0), summary: {statusCounts, locationCounts} };
}
async function getFilteredLoadPage(pool, paging, rawFilters) {
  const filters = loadFilter(rawFilters);
  const {where, params} = loadWhere(filters);
  const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM load_requests' + where, params);
  const [requests] = await pool.query(
    'SELECT * FROM load_requests' + where + ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
    [...params, paging.limit, paging.offset]
  );
  const [groups] = await pool.query('SELECT status, payment_status, COUNT(*) AS total FROM load_requests GROUP BY status, payment_status');
  const kpis = { total: 0, pendingPayment: 0, readyToProcess: 0, completed: 0, rejected: 0 };
  for (const row of groups) {
    const count = Number(row.total || 0);
    const payment = row.payment_status || 'manual_review';
    kpis.total += count;
    if (payment === 'pending') kpis.pendingPayment += count;
    if (['paid', 'manual_review'].includes(payment) && !['Completed', 'Rejected'].includes(row.status)) kpis.readyToProcess += count;
    if (row.status === 'Completed') kpis.completed += count;
    if (row.status === 'Rejected') kpis.rejected += count;
  }
  return { requests, total: Number(countRows?.[0]?.total || 0), summary: {kpis} };
}
module.exports = {getFilteredTicketPage, getFilteredLoadPage, ticketFilter, loadFilter, ticketWhere, loadWhere, searchPattern};
