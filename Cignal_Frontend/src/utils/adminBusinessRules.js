// CignalCare+ admin reporting rules. PHP/Manila is UTC+08:00 with no DST.
export const GROSS_PROFIT_PER_COMPLETED_LOAD = 40;
export const DATE_PERIODS = ['Today', 'This Week', 'This Month', 'Custom Range'];
export const MANILA_ZONE = 'Asia/Manila';

export function manilaDayKey(value) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: MANILA_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

function offsetDay(day, days) {
  const start = new Date(`${day}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() + days);
  return start.toISOString().slice(0, 10);
}

export function dateBounds(period, from = '', to = '', now = new Date()) {
  const today = manilaDayKey(now);
  if (period === 'Today') return { from: today, to: today };
  if (period === 'This Week') {
    const day = new Date(`${today}T00:00:00.000Z`).getUTCDay();
    return { from: offsetDay(today, -((day + 6) % 7)), to: today };
  }
  if (period === 'This Month') return { from: `${today.slice(0, 7)}-01`, to: today };
  if (period === 'Custom Range') return { from, to };
  return { from: '', to: '' };
}

export function isInManilaRange(value, from, to) {
  const day = manilaDayKey(value);
  return Boolean(day && (!from || day >= from) && (!to || day <= to));
}

// created_at is the actual persisted instant. Legacy transaction_date may contain a
// Manila-local DATETIME with no UTC offset, which can shift a midnight sale by 8h.
export function transactionDate(tx) { return tx.created_at || tx.transaction_date; }
export function isCompletedSale(tx) { return String(tx.status || '').toLowerCase() === 'completed'; }
export function isPosSale(tx) { return /^POS-/i.test(String(tx.reference_no || '')); }
export function salesSummary(rows) {
  const completed = rows.filter(isCompletedSale);
  return {
    transactions: completed.length,
    sales: completed.reduce((sum, row) => sum + Number(row.amount ?? row.loadAmount ?? 0), 0),
    grossProfit: completed.length * GROSS_PROFIT_PER_COMPLETED_LOAD,
  };
}

export function daysSinceLoad(date, now = new Date()) {
  if (!date) return null;
  const day = manilaDayKey(date);
  if (!day) return null;
  return Math.max(0, Math.round((Date.parse(`${manilaDayKey(now)}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86400000));
}
export function subscriberLifecycle(lastLoadDate, now = new Date()) {
  const days = daysSinceLoad(lastLoadDate, now);
  if (days == null) return 'No Load Yet';
  if (days < 60) return 'Active';
  if (days < 90) return 'At Risk';
  if (days < 120) return 'Inactive';
  return 'Archive Eligible';
}
