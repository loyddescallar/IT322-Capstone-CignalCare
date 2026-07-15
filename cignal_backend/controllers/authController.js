const jwt = require('jsonwebtoken');
const { getJwtSecret, getJwtExpiry } = require('../utils/authConfig');
const { findForLogin, findById, findByAccountIdOrCca, createUser, checkDuplicate } = require('../models/userModel');
const { createNotification, createAdminNotification } = require('../models/notificationModel');
const { notifySafely } = require('../utils/safeNotification');


const VALID_LOCATIONS = ['Balayan', 'Calaca', 'Lian', 'Calatagan', 'Nasugbu', 'Lemery'];

function normalizeLocation(location) {
  if (!location) return 'Balayan';
  const value = String(location).trim();
  if (value === 'Calaca City' || value === 'City of Calaca') return 'Calaca';
  return VALID_LOCATIONS.includes(value) ? value : 'Balayan';
}

function signToken(user) {
  return jwt.sign({ id:user.id, accountName:user.accountName, accountNumber:user.accountNumber, ccaNumber:user.ccaNumber, role:user.role, location:user.location, status:user.status },
    getJwtSecret(),
    { expiresIn: getJwtExpiry() });
}

async function login(req, res) {
  try {
    const { accountName, accountId } = req.body;
    if (!accountName || !accountId) return res.status(400).json({ error: 'accountName and accountId are required' });
    const user = await findForLogin(accountName.trim(), String(accountId).trim());
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    return res.json({ token, user: { id:user.id, accountName:user.accountName, accountNumber:user.accountNumber, ccaNumber:user.ccaNumber, address:user.address, phone:user.phone, role:user.role, location:user.location, status:user.status } });
  } catch(err) { console.error('LOGIN ERROR', err); return res.status(500).json({ error: 'Server error during login' }); }
}

async function register(req, res) {
  try {
    const { accountName, accountNumber, ccaNumber, address, phone, location } = req.body;
    if (!accountName||!accountNumber||!ccaNumber||!address||!phone) return res.status(400).json({ error: 'All fields are required' });
    const dup = await checkDuplicate(accountNumber.trim(), ccaNumber.trim());
    if (dup) return res.status(409).json({ error: 'Account number or CCA number already exists' });
    const cleanLocation = normalizeLocation(location);
    const id = await createUser({ accountName:accountName.trim(), accountNumber:accountNumber.trim(), ccaNumber:ccaNumber.trim(), address:address.trim(), phone:phone.trim(), location: cleanLocation, role:'user' });

    await notifySafely('REGISTER', async () => {
      await createNotification({
        user_id: id,
        account_number: accountNumber.trim(),
        type: 'welcome',
        message: 'Welcome to CignalCare+. Your account is ready.',
      });

      await createAdminNotification({
        type: 'admin_customer',
        message: `New subscriber registered: ${accountName.trim()} (${accountNumber.trim()}) from ${cleanLocation}.`,
      });
    });

    return res.status(201).json({ message: 'Account registered successfully', id });
  } catch(err) { console.error('REGISTER ERROR', err); return res.status(500).json({ error: 'Server error during registration' }); }
}

async function me(req, res) {
  try {
    const user = await findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { password_hash, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch(err) { return res.status(500).json({ error: 'Server error' }); }
}

async function lookupByAccountId(req, res) {
  try {
    const user = await findByAccountIdOrCca(req.params.accountId);
    if (!user) return res.status(404).json({ error: 'Account not found' });

    return res.json({
      user: {
        accountName: user.accountName,
        accountNumber: user.accountNumber,
        ccaNumber: user.ccaNumber,
        phone: user.phone,
        location: user.location,
        status: user.status,
        lastLoadDate: user.lastLoadDate || null,
      },
    });
  } catch(err) { return res.status(500).json({ error: 'Server error' }); }
}

module.exports = { login, register, me, lookupByAccountId };
