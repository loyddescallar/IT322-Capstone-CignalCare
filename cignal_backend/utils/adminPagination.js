// Opt-in pagination only. Existing clients that omit pagination keep legacy results.
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE = 100000;

function parsePositiveInteger(value, fallback, maximum) {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  if (!/^[1-9][0-9]*$/.test(text)) return null;
  const number = Number(text);
  if (!Number.isSafeInteger(number) || number > maximum) return null;
  return number;
}

function parseAdminPagination(query = {}) {
  const enabled = query.page !== undefined || query.pageSize !== undefined;
  if (!enabled) return { enabled: false };
  const page = parsePositiveInteger(query.page, 1, MAX_PAGE);
  const pageSize = parsePositiveInteger(query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  if (page === null || pageSize === null) {
    return { enabled: true, error: 'page must be 1–100000 and pageSize must be 1–100.' };
  }
  return { enabled: true, page, pageSize, limit: pageSize, offset: (page-1)*pageSize };
}

function paginationMeta(page, pageSize, total) {
  const safeTotal = Math.max(0, Number(total) || 0);
  return {
    page, pageSize, total: safeTotal,
    totalPages: Math.ceil(safeTotal / pageSize),
    hasNextPage: page * pageSize < safeTotal,
    hasPreviousPage: page > 1,
  };
}
module.exports = { parseAdminPagination, paginationMeta, MAX_PAGE_SIZE };
