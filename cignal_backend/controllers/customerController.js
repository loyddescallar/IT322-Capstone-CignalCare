const {
  findByAccountIdOrCca,
  findById,
  getAllUsers,
  getCustomerStats,
  createUser,
  updateUser,
  archiveUser,
  restoreUser,
  permanentDeleteUser,
  checkDuplicate,
  normalizeLocation,
} = require('../models/userModel');
const { createAdminNotification } = require('../models/notificationModel');
const { notifySafely } = require('../utils/safeNotification');
const { isAdmin, isSelf, ownsAccount } = require('../utils/ownership');

function safeCustomer(customer) {
  if (!customer) return customer;
  const { password_hash, ...safe } = customer;
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
    location: normalizeLocation(body.location),
    role: 'user',
  };
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
  try {
    const stats = await getCustomerStats();
    return res.json({ stats });
  } catch (err) {
    console.error('CUSTOMER STATS ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function listCustomers(req, res) {
  try {
    const status = req.query.status || 'active';
    const customers = (await getAllUsers(status)).map(safeCustomer);
    return res.json({ customers });
  } catch (err) {
    console.error('LIST CUSTOMERS ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function createCustomerController(req, res) {
  try {
    const customerData = cleanCustomerPayload(req.body);

    if (!customerData.accountName || !customerData.accountNumber || !customerData.ccaNumber) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const dup = await checkDuplicate(customerData.accountNumber, customerData.ccaNumber);
    if (dup) return res.status(409).json({ error: getDuplicateMessage(dup) });

    const id = await createUser(customerData);

    await notifySafely('CREATE CUSTOMER', () =>
      createAdminNotification({
        type: 'admin_customer',
        message: `Customer record created: ${customerData.accountName} (${customerData.accountNumber}).`,
      })
    );

    return res.status(201).json({ message: 'Customer created', id });
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

    if (!customerData.accountName || !customerData.accountNumber || !customerData.ccaNumber) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const dup = await checkDuplicate(customerData.accountNumber, customerData.ccaNumber, id);
    if (dup) return res.status(409).json({ error: getDuplicateMessage(dup) });

    await updateUser(id, customerData);
    return res.json({ message: 'Customer updated' });
  } catch (err) {
    console.error('UPDATE CUSTOMER ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function archiveCustomerController(req, res) {
  try {
    const customer = await findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (String(customer.status || '').toLowerCase() === 'archived') {
      return res.json({ message: 'Customer is already archived' });
    }

    await archiveUser(req.params.id);

    await notifySafely('ARCHIVE CUSTOMER', () =>
      createAdminNotification({
        type: 'admin_customer',
        message: `Customer archived: ${customer.accountName} (${customer.accountNumber}).`,
      })
    );

    return res.json({ message: 'Customer archived' });
  } catch (err) {
    console.error('ARCHIVE CUSTOMER ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function restoreCustomerController(req, res) {
  try {
    const customer = await findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    if (String(customer.status || '').toLowerCase() !== 'archived') {
      return res.status(400).json({ error: 'Only archived customers can be restored' });
    }

    const restored = await restoreUser(req.params.id);
    if (!restored) return res.status(400).json({ error: 'Unable to restore customer' });

    await notifySafely('RESTORE CUSTOMER', () =>
      createAdminNotification({
        type: 'admin_customer',
        message: `Customer restored: ${customer.accountName} (${customer.accountNumber}).`,
      })
    );

    return res.json({ message: 'Customer restored' });
  } catch (err) {
    console.error('RESTORE CUSTOMER ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function permanentDeleteCustomerController(req, res) {
  try {
    const customer = await findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    if (String(customer.status || '').toLowerCase() !== 'archived') {
      return res.status(400).json({ error: 'Archive the customer before permanent deletion' });
    }

    const confirmAccountNumber = String(req.body?.confirmAccountNumber || '').trim();
    if (confirmAccountNumber !== String(customer.accountNumber)) {
      return res.status(400).json({ error: 'Account number confirmation does not match' });
    }

    const customerName = customer.accountName;
    const accountNumber = customer.accountNumber;
    const deleted = await permanentDeleteUser(req.params.id);

    if (!deleted) return res.status(400).json({ error: 'Unable to permanently delete customer' });

    await notifySafely('DELETE CUSTOMER', () =>
      createAdminNotification({
        type: 'admin_customer',
        message: `Customer permanently deleted: ${customerName} (${accountNumber}).`,
      })
    );

    return res.json({ message: 'Customer permanently deleted' });
  } catch (err) {
    console.error('PERMANENT DELETE CUSTOMER ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getCustomerByAccount,
  getCustomerById,
  getStats,
  listCustomers,
  createCustomerController,
  updateCustomerController,
  archiveCustomerController,
  restoreCustomerController,
  permanentDeleteCustomerController,
};
