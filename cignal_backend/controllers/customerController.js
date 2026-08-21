const bcrypt = require('bcryptjs');
const {
  findByAccountIdOrCca,
  findById,
  getAllUsers,
  getCustomerStats,
  createUser,
  bulkCreateUsers,
  updateUser,
  issueTemporaryCredentials,
  archiveUser,
  restoreUser,
  checkDuplicate,
  getIdentifierRows,
  normalizeLocation,
} = require('../models/userModel');
const { createAdminNotification } = require('../models/notificationModel');
const { notifySafely } = require('../utils/safeNotification');
const { isAdmin, isSelf, ownsAccount } = require('../utils/ownership');
const {
  validateSubscriberIdentifiers,
  generateTemporaryPassword,
  generateRecoveryCode,
  hashRecoveryCode,
  temporaryPasswordExpiry,
} = require('../utils/subscriberAccount');
const {
  parseSubscriberWorkbook,
  annotateDuplicates,
} = require('../services/subscriberImportService');

function safeCustomer(customer) {
  if (!customer) return customer;
  const {
    password_hash,
    recovery_code_hash,
    auth_session_version,
    email_verification_code_hash,
    password_reset_code_hash,
    ...safe
  } = customer;
  return safe;
}

function canViewCustomer(req, customer) {
  return isAdmin(req) || isSelf(req, customer.id) || ownsAccount(req, customer.accountNumber);
}

function cleanCustomerPayload(body) {
  return {
    accountName: String(body.accountName || '').trim(),
    accountNumber: String(body.accountNumber || '').trim(),
    ccaNumber: String(body.ccaNumber || '').trim(),
    address: String(body.address || '').trim(),
    phone: String(body.phone || '').trim(),
    email: String(body.email || '').trim(),
    location: normalizeLocation(body.location),
    role: 'user',
  };
}

function validateCustomerPayload(data) {
  if (!data.accountName) return 'Subscriber name is required.';
  if (!data.address) return 'Address is required.';
  const { errors } = validateSubscriberIdentifiers(data.accountNumber, data.ccaNumber);
  if (errors.length) return errors[0];
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'Email format is invalid.';
  return '';
}

function getDuplicateMessage(duplicate) {
  if (!duplicate) return 'Account number or CCA number already exists';
  if (String(duplicate.status || '').toLowerCase() === 'archived') {
    return 'Account number or CCA number belongs to an archived customer. Restore that customer instead of creating a duplicate.';
  }
  return 'Account number or CCA number already exists';
}

async function getCustomerByAccount(req, res) {
  try {
    const user = await findByAccountIdOrCca(req.params.accountId);
    if (!user) return res.status(404).json({ error: 'Customer not found' });
    if (!canViewCustomer(req, user)) return res.status(403).json({ error: 'Forbidden' });
    return res.json({ user: safeCustomer(user) });
  } catch (err) {
    console.error('GET CUSTOMER BY ACCOUNT ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getCustomerById(req, res) {
  try {
    const customer = await findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (!canViewCustomer(req, customer)) return res.status(403).json({ error: 'Forbidden' });
    return res.json({ customer: safeCustomer(customer) });
  } catch (err) {
    console.error('GET CUSTOMER BY ID ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getStats(req, res) {
  try { return res.json({ stats: await getCustomerStats() }); }
  catch (err) { console.error('CUSTOMER STATS ERROR', err); return res.status(500).json({ error: 'Server error' }); }
}

async function listCustomers(req, res) {
  try {
    const customers = (await getAllUsers(req.query.status || 'active')).map(safeCustomer);
    return res.json({ customers });
  } catch (err) {
    console.error('LIST CUSTOMERS ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createCustomerController(req, res) {
  try {
    const customerData = cleanCustomerPayload(req.body);
    const validationError = validateCustomerPayload(customerData);
    if (validationError) return res.status(400).json({ error: validationError });

    const dup = await checkDuplicate(customerData.accountNumber, customerData.ccaNumber);
    if (dup) return res.status(409).json({ error: getDuplicateMessage(dup) });

    const temporaryPassword = generateTemporaryPassword();
    const recoveryCode = generateRecoveryCode();
    const expiresAt = temporaryPasswordExpiry();
    const password_hash = await bcrypt.hash(temporaryPassword, 10);
    const id = await createUser({
      ...customerData,
      password_hash,
      must_change_password: true,
      temporary_password_expires_at: expiresAt,
      recovery_code_hash: hashRecoveryCode(recoveryCode),
    });

    await notifySafely('CREATE CUSTOMER', () =>
      createAdminNotification({
        type: 'admin_customer',
        message: `Subscriber account created: ${customerData.accountName} (${customerData.accountNumber}).`,
      })
    );

    return res.status(201).json({
      message: 'Subscriber account created.',
      id,
      credentials: {
        accountNumber: customerData.accountNumber,
        temporaryPassword,
        recoveryCode,
        temporaryPasswordExpiresAt: expiresAt,
      },
    });
  } catch (err) {
    console.error('CREATE CUSTOMER ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateCustomerController(req, res) {
  try {
    const { id } = req.params;
    const customerData = cleanCustomerPayload(req.body);
    const existing = await findById(id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    if (String(existing.status || '').toLowerCase() === 'archived') {
      return res.status(400).json({ error: 'Restore this customer before editing the record.' });
    }

    if (customerData.accountNumber !== String(existing.accountNumber || '') ||
        customerData.ccaNumber !== String(existing.ccaNumber || '')) {
      return res.status(400).json({
        error: 'Account Number and CCA Number are permanent subscriber identifiers and cannot be edited here.',
      });
    }
    if (!customerData.accountName) return res.status(400).json({ error: 'Subscriber name is required.' });
    if (!customerData.address) return res.status(400).json({ error: 'Address is required.' });
    if (customerData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerData.email)) {
      return res.status(400).json({ error: 'Email format is invalid.' });
    }

    await updateUser(id, customerData);
    return res.json({ message: 'Customer updated' });
  } catch (err) {
    console.error('UPDATE CUSTOMER ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function resetCredentialsController(req, res) {
  try {
    const customer = await findById(req.params.id);
    if (!customer || customer.role !== 'user') return res.status(404).json({ error: 'Customer not found' });
    if (String(customer.status || '').toLowerCase() !== 'active') {
      return res.status(400).json({ error: 'Only active subscribers can receive login credentials.' });
    }

    const temporaryPassword = generateTemporaryPassword();
    const recoveryCode = generateRecoveryCode();
    const expiresAt = temporaryPasswordExpiry();
    const hash = await bcrypt.hash(temporaryPassword, 10);
    await issueTemporaryCredentials(customer.id, hash, hashRecoveryCode(recoveryCode), expiresAt);
    return res.json({
      message: 'Temporary credentials generated. The temporary password is valid for 7 days and must be changed on first login.',
      credentials: {
        accountNumber: customer.accountNumber,
        temporaryPassword,
        recoveryCode,
        temporaryPasswordExpiresAt: expiresAt,
      },
    });
  } catch (err) {
    console.error('RESET CREDENTIALS ERROR', err);
    return res.status(500).json({ error: 'Unable to generate credentials.' });
  }
}

async function previewImportController(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Select an .xlsx Excel file.' });
    const location = normalizeLocation(req.body.location);
    const rows = await parseSubscriberWorkbook(req.file.buffer, location);
    annotateDuplicates(rows, await getIdentifierRows());
    const valid = rows.filter((row) => row.errors.length === 0);
    const invalid = rows.filter((row) => row.errors.length > 0);
    return res.json({
      location,
      summary: { total: rows.length, valid: valid.length, invalid: invalid.length },
      rows: rows.map((row) => ({ ...row, valid: row.errors.length === 0 })),
    });
  } catch (err) {
    console.error('IMPORT PREVIEW ERROR', err);
    return res.status(400).json({ error: err.message || 'Unable to read Excel file.' });
  }
}

async function importSubscribersController(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Select an .xlsx Excel file.' });
    const location = normalizeLocation(req.body.location);
    const rows = await parseSubscriberWorkbook(req.file.buffer, location);
    annotateDuplicates(rows, await getIdentifierRows());
    const validRows = rows.filter((row) => row.errors.length === 0);
    const invalidRows = rows.filter((row) => row.errors.length > 0);
    if (!validRows.length) return res.status(400).json({ error: 'No valid new subscribers are available to import.', invalidRows });

    const credentials = [];
    const prepared = [];
    const HASH_BATCH_SIZE = 12;

    for (let start = 0; start < validRows.length; start += HASH_BATCH_SIZE) {
      const batch = validRows.slice(start, start + HASH_BATCH_SIZE);
      const hashedBatch = await Promise.all(
        batch.map(async (row) => {
          const temporaryPassword = generateTemporaryPassword();
          const recoveryCode = generateRecoveryCode();
          const expiresAt = temporaryPasswordExpiry();
          const password_hash = await bcrypt.hash(temporaryPassword, 10);
          return { row, temporaryPassword, recoveryCode, expiresAt, password_hash };
        })
      );

      for (const item of hashedBatch) {
        prepared.push({
          ...item.row,
          password_hash: item.password_hash,
          must_change_password: true,
          temporary_password_expires_at: item.expiresAt,
          recovery_code_hash: hashRecoveryCode(item.recoveryCode),
        });
        credentials.push({
          accountName: item.row.accountName,
          accountNumber: item.row.accountNumber,
          location,
          temporaryPassword: item.temporaryPassword,
          recoveryCode: item.recoveryCode,
          temporaryPasswordExpiresAt: item.expiresAt,
        });
      }
    }

    await bulkCreateUsers(prepared);
    await notifySafely('BULK IMPORT CUSTOMERS', () =>
      createAdminNotification({
        type: 'admin_customer',
        message: `${prepared.length} subscriber account${prepared.length === 1 ? '' : 's'} imported for ${location}.`,
      })
    );

    return res.status(201).json({
      message: `${prepared.length} subscribers imported successfully.`,
      imported: prepared.length,
      skipped: invalidRows.length,
      invalidRows,
      credentials,
    });
  } catch (err) {
    console.error('IMPORT SUBSCRIBERS ERROR', err);
    return res.status(400).json({ error: err.message || 'Unable to import subscribers.' });
  }
}

async function archiveCustomerController(req, res) {
  try {
    const customer = await findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (String(customer.status || '').toLowerCase() === 'archived') return res.json({ message: 'Customer is already archived' });
    await archiveUser(req.params.id);
    return res.json({ message: 'Customer archived' });
  } catch (err) { console.error('ARCHIVE CUSTOMER ERROR', err); return res.status(500).json({ error: 'Server error' }); }
}

async function restoreCustomerController(req, res) {
  try {
    const customer = await findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (String(customer.status || '').toLowerCase() !== 'archived') return res.status(400).json({ error: 'Only archived customers can be restored' });
    const restored = await restoreUser(req.params.id);
    if (!restored) return res.status(400).json({ error: 'Unable to restore customer' });
    return res.json({ message: 'Customer restored' });
  } catch (err) { console.error('RESTORE CUSTOMER ERROR', err); return res.status(500).json({ error: 'Server error' }); }
}

module.exports = {
  getCustomerByAccount,
  getCustomerById,
  getStats,
  listCustomers,
  createCustomerController,
  updateCustomerController,
  resetCredentialsController,
  previewImportController,
  importSubscribersController,
  archiveCustomerController,
  restoreCustomerController,
};
