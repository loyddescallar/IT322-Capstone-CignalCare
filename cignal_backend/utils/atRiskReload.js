// One source of truth for the 120-day equipment-check requirement.
const { subscriberLifecycle } = require('./subscriberLifecycle');
function isAtRisk(lastLoadDate, now = new Date()) {
  return subscriberLifecycle(lastLoadDate, now) === 'At Risk';
}
function equipmentCheckRequired(lastLoadDate, confirmed, diagnosticResult, now = new Date()) {
  if (!isAtRisk(lastLoadDate, now)) return false;
  if (confirmed !== true) return true;
  // Online requests must also attest that a picture was present during signal check.
  return diagnosticResult !== undefined && diagnosticResult !== 'channel_1_ok';
}
module.exports = { isAtRisk, equipmentCheckRequired };
