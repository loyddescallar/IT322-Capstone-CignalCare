'use strict';

// A prepaid load is valid for 30 calendar days. Seasonal promotion availability
// is a separate business concept; it never changes an issued load's validity.
const FIXED_LOAD_VALIDITY_DAYS = 30;

module.exports = { FIXED_LOAD_VALIDITY_DAYS };
