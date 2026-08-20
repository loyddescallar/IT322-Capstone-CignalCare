const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getJwtSecret, getJwtExpiry } = require('../utils/authConfig');
const {
  findForAdminLogin,
  findByAccountNumber,
  findById,
  findByAccountIdOrCca,
  setPassword,
} = require('../models/userModel');
const { ACCOUNT_NUMBER_RE, validateNewPassword } = require('../utils/subscriberAccount');

function signToken(user) {
  return jwt.sign(
    { id: user.id, accountName: user.accountName, accountNumber: user.accountNumber, ccaNumber: user.ccaNumber, role: user.role, location: user.location, status: user.status },
    getJwtSecret(),
    { expiresIn: getJwtExpiry() }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    accountName: user.accountName,
    accountNumber: user.accountNumber,
    ccaNumber: user.ccaNumber,
    address: user.address,
    phone: user.phone,
    email: user.email || null,
    role: user.role,
    location: user.location,
    status: user.status,
  };
}

async function login(req, res) {
  try {
    // Admin portal keeps its existing internal credential flow.
    if (req.body.accountName && req.body.accountId && !req.body.password) {
      const user = await findForAdminLogin(String(req.body.accountName).trim(), String(req.body.accountId).trim());
      if (!user) return res.status(401).json({ error: 'Invalid admin credentials' });
      return res.json({ token: signToken(user), user: publicUser(user) });
    }

    const accountNumber = String(req.body.accountNumber || '').trim();
    const password = String(req.body.password || '');
    if (!ACCOUNT_NUMBER_RE.test(accountNumber)) return res.status(400).json({ error: 'Enter a valid Account Number of up to 9 digits.' });
    if (!password) return res.status(400).json({ error: 'Password is required.' });

    const user = await findByAccountNumber(accountNumber);
    if (!user) return res.status(401).json({ error: 'Invalid Account Number or password.' });
    if (!user.password_hash) {
      return res.status(403).json({ error: 'Login credentials have not been issued for this subscriber. Please contact Descallar Satellite Services.' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) return res.status(401).json({ error: 'Invalid Account Number or password.' });

    if (Boolean(user.must_change_password)) {
      const passwordChangeToken = jwt.sign(
        { id: user.id, role: 'user', purpose: 'password_change' },
        getJwtSecret(),
        { expiresIn: '20m' }
      );
      return res.json({ mustChangePassword: true, passwordChangeToken, user: publicUser(user) });
    }

    return res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    console.error('LOGIN ERROR', err);
    return res.status(500).json({ error: 'Server error during login' });
  }
}

async function register(_req, res) {
  return res.status(410).json({
    error: 'Public registration is disabled. CignalCare+ accounts are issued to verified Descallar Satellite Services subscribers.',
  });
}

async function changePassword(req, res) {
  try {
    const header = String(req.headers.authorization || '');
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Password-change session is required.' });
    const payload = jwt.verify(header.slice(7).trim(), getJwtSecret());
    if (payload.purpose !== 'password_change' || payload.role !== 'user') {
      return res.status(403).json({ error: 'Invalid password-change session.' });
    }

    const password = String(req.body.password || '');
    const error = validateNewPassword(password);
    if (error) return res.status(400).json({ error });

    const user = await findById(payload.id);
    if (!user || user.role !== 'user' || String(user.status || '').toLowerCase() !== 'active') {
      return res.status(401).json({ error: 'Account is unavailable.' });
    }

    const hash = await bcrypt.hash(password, 10);
    await setPassword(user.id, hash, false);
    const updated = { ...user, must_change_password: false };
    return res.json({ message: 'Password updated successfully.', token: signToken(updated), user: publicUser(updated) });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Password-change session expired. Please log in again.' });
    }
    console.error('CHANGE PASSWORD ERROR', err);
    return res.status(500).json({ error: 'Unable to change password.' });
  }
}

async function me(req, res) {
  try {
    const user = await findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const { password_hash, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (err) { return res.status(500).json({ error: 'Server error' }); }
}

async function lookupByAccountId(req, res) {
  try {
    const user = await findByAccountIdOrCca(req.params.accountId);
    if (!user) return res.status(404).json({ error: 'Account not found' });
    return res.json({ user: {
      accountName: user.accountName, accountNumber: user.accountNumber, ccaNumber: user.ccaNumber,
      phone: user.phone, location: user.location, status: user.status, lastLoadDate: user.lastLoadDate || null,
    } });
  } catch (err) { return res.status(500).json({ error: 'Server error' }); }
}

module.exports = { login, register, changePassword, me, lookupByAccountId };
