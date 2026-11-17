// CignalCare+ Administrator KPI location scopes. Side-effect free; no data mutations.
import { manilaDayKey, subscriberLifecycle } from './adminBusinessRules.js';

function normalizedLocation(value) {
  const lower = String(value || '').trim().toLowerCase();
  // Historical Calaca records sometimes include a longer Calaca address.
  return lower.includes('calaca') ? 'calaca' : lower;
}

export function matchesAdminLocation(recordLocation, chosenLocation) {
  return chosenLocation === 'All' || !chosenLocation ||
    normalizedLocation(recordLocation) === normalizedLocation(chosenLocation);
}

const EMPTY_SUBSCRIBER_KPIS = {
  allCustomers: 0, thisMonth: 0, activeCount: 0, atRiskCount: 0,
  inactiveCount: 0, archivedCount: 0, archiveEligibleCount: 0, neverLoadedCount: 0,
};

// Match backend getCustomerStats() definitions, but scope to selected location.
export function subscriberLocationKpis(customers, location, now = new Date()) {
  const counts = { ...EMPTY_SUBSCRIBER_KPIS };
  const month = manilaDayKey(now).slice(0, 7);
  for (const customer of customers || []) {
    if (!matchesAdminLocation(customer.location, location)) continue;
    counts.allCustomers += 1;
    if (manilaDayKey(customer.created_at).slice(0, 7) === month) counts.thisMonth += 1;
    if (String(customer.status || '').toLowerCase() === 'archived') {
      counts.archivedCount += 1;
      continue;
    }
    const lifecycle = subscriberLifecycle(customer.lastLoadDate, now);
    const field = {
      Active: 'activeCount',
      'At Risk': 'atRiskCount',
      Inactive: 'inactiveCount',
      'Archive Eligible': 'archiveEligibleCount',
      'No Load Yet': 'neverLoadedCount',
    }[lifecycle];
    if (field) counts[field] += 1;
  }
  return counts;
}

export function technicianLocationKpis(requests, location) {
  const scoped = (requests || []).filter((r) => matchesAdminLocation(r.location, location));
  return {
    Total: scoped.length,
    Submitted: scoped.filter((r) => ['Submitted', 'Pending'].includes(r.status)).length,
    'Under Review': scoped.filter((r) => r.status === 'Under Review').length,
    Scheduled: scoped.filter((r) => r.status === 'Scheduled').length,
    Completed: scoped.filter((r) => r.status === 'Completed').length,
    Cancelled: scoped.filter((r) => r.status === 'Cancelled').length,
    'From Load Check': scoped.filter((r) => r.source === 'load_request_signal_check').length,
  };
}
