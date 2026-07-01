const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatShortDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString([], {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildMonthlySeries(items, key = "created_at", limit = 6) {
  const now = new Date();
  const buckets = [];

  for (let offset = limit - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      key: bucketKey,
      label: MONTH_LABELS[date.getMonth()],
      value: 0,
    });
  }

  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  items.forEach((item) => {
    const raw = item?.[key];
    if (!raw) return;
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return;
    const bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const bucket = index.get(bucketKey);
    if (bucket) bucket.value += 1;
  });

  return buckets;
}

export function summarizeTicketsByStatus(tickets = []) {
  const counts = {
    Open: 0,
    "In Progress": 0,
    Resolved: 0,
    Closed: 0,
  };

  tickets.forEach((ticket) => {
    const status = ticket?.status;
    if (counts[status] !== undefined) counts[status] += 1;
  });

  return counts;
}

export function summarizeTicketsByCategory(tickets = []) {
  const map = new Map();

  tickets.forEach((ticket) => {
    const category = ticket?.category || "Uncategorized";
    map.set(category, (map.get(category) || 0) + 1);
  });

  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}

export function buildDashboardInsights({ tickets = [], customers = [], loads = [] }) {
  const ticketStatus = summarizeTicketsByStatus(tickets);
  const categories = summarizeTicketsByCategory(tickets);
  const topCategory = categories[0];
  const repeatedCustomers = new Map();

  tickets.forEach((ticket) => {
    const customerName = ticket?.accountName || `User #${ticket?.user_id || "Unknown"}`;
    repeatedCustomers.set(customerName, (repeatedCustomers.get(customerName) || 0) + 1);
  });

  const frequentCustomer = [...repeatedCustomers.entries()].sort((a, b) => b[1] - a[1])[0];
  const completedLoads = loads.filter((load) => Number(load?.loadAmount || 0) > 0);
  const revenue = completedLoads.reduce((sum, load) => sum + Number(load?.loadAmount || 0), 0);
  const resolvedBase = ticketStatus.Resolved + ticketStatus.Closed;
  const resolutionRate = tickets.length ? Math.round((resolvedBase / tickets.length) * 100) : 0;

  return {
    topIssue: topCategory
      ? `${topCategory.label} is currently the most reported issue.`
      : "No ticket trend yet. Start collecting support tickets.",
    repeatedConcern: frequentCustomer && frequentCustomer[1] > 1
      ? `${frequentCustomer[0]} submitted ${frequentCustomer[1]} tickets, which may need follow-up.`
      : "No repeated customer concern detected yet.",
    operationsSummary:
      customers.length === 0
        ? "Customer records are still empty. Populate Customer Management first."
        : `You currently have ${customers.length} customers, ${tickets.length} tickets, and PHP ${revenue.toFixed(2)} total load value logged.`,
    recommendation:
      topCategory && ticketStatus.Open > 0
        ? `Prioritize ${topCategory.label.toLowerCase()} cases to reduce the open queue faster.`
        : "Keep customer records updated so CCA inquiry and prepaid support stay accurate.",
    resolutionRate,
  };
}
