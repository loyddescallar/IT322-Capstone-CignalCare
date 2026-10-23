// Pure lifecycle rules shared by the server KPI summary; no archived records are deleted.
const formatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
});
function dayKey(date) {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) ? formatter.format(parsed) : null;
}
function daysSinceLoad(lastLoad, now = new Date()) {
  const last = dayKey(lastLoad);
  const today = dayKey(now);
  if (!last || !today) return null;
  return Math.max(0, Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(last + 'T00:00:00Z')) / 86400000));
}
function subscriberLifecycle(lastLoad, now = new Date()) {
  const days = daysSinceLoad(lastLoad, now);
  if (days === null) return 'No Load Yet';
  if (days < 60) return 'Active';
  if (days < 90) return 'At Risk';
  if (days < 120) return 'Inactive';
  return 'Archive Eligible';
}
module.exports = { dayKey, daysSinceLoad, subscriberLifecycle };
