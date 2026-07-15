function isAdmin(req) {
  return req.user?.role === 'admin';
}

function isSelf(req, userId) {
  return String(req.user?.id) === String(userId);
}

function ownsAccount(req, accountNumber) {
  if (!accountNumber) return false;
  return String(req.user?.accountNumber) === String(accountNumber);
}

module.exports = { isAdmin, isSelf, ownsAccount };
