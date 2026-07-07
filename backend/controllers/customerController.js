const {
  findByAccountIdOrCca,
  findById,
  getAllUsers,
  getCustomerStats,
  createUser,
  updateUser,
  deleteUser,
  checkDuplicate,
} = require("../models/userModel");

async function getCustomerByAccount(req, res) {
  try {
    const { accountId } = req.params;
    const user = await findByAccountIdOrCca(accountId);
    if (!user) return res.status(404).json({ error: "Customer not found" });
    return res.json({ user });
  } catch (err) {
    console.error("GET CUSTOMER ERROR", err);
    return res.status(500).json({ error: "Server error fetching customer" });
  }
}

async function getCustomerById(req, res) {
  try {
    const { id } = req.params;
    const user = await findById(id);
    if (!user) return res.status(404).json({ error: "Customer not found" });
    return res.json({ customer: user });
  } catch (err) {
    console.error("GET CUSTOMER BY ID ERROR", err);
    return res.status(500).json({ error: "Server error fetching customer" });
  }
}

async function getStats(req, res) {
  try {
    const stats = await getCustomerStats();
    return res.json({ stats });
  } catch (err) {
    console.error("GET STATS ERROR", err);
    return res.status(500).json({ error: "Server error fetching stats" });
  }
}

async function listCustomers(req, res) {
  try {
    const customers = await getAllUsers();
    return res.json({ customers });
  } catch (err) {
    console.error("LIST CUSTOMERS ERROR", err);
    return res.status(500).json({ error: "Server error listing customers" });
  }
}

async function createCustomerController(req, res) {
  try {
    const { accountName, accountNumber, ccaNumber, address, phone, location, role } = req.body;
    if (!accountName || !accountNumber || !ccaNumber) {
      return res.status(400).json({ error: "accountName, accountNumber, and ccaNumber are required" });
    }
    const duplicate = await checkDuplicate(accountNumber.trim(), ccaNumber.trim());
    if (duplicate) return res.status(409).json({ error: "Account number or CCA number already exists" });
    const id = await createUser({
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      ccaNumber: ccaNumber.trim(),
      address: address?.trim() || "",
      phone: phone?.trim() || "",
      location: location || "Balayan",
      role: role || "user",
    });
    return res.status(201).json({ message: "Customer created", id });
  } catch (err) {
    console.error("CREATE CUSTOMER ERROR", err);
    return res.status(500).json({ error: "Server error creating customer" });
  }
}

async function updateCustomerController(req, res) {
  try {
    const { id } = req.params;
    const { accountName, accountNumber, ccaNumber, address, phone, location, role } = req.body;
    if (!accountName || !accountNumber || !ccaNumber) {
      return res.status(400).json({ error: "accountName, accountNumber, and ccaNumber are required" });
    }
    const duplicate = await checkDuplicate(accountNumber.trim(), ccaNumber.trim(), id);
    if (duplicate) return res.status(409).json({ error: "Account number or CCA number already exists" });
    await updateUser(id, {
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      ccaNumber: ccaNumber.trim(),
      address: address?.trim() || "",
      phone: phone?.trim() || "",
      location: location || "Balayan",
      role: role || "user",
    });
    return res.json({ message: "Customer updated" });
  } catch (err) {
    console.error("UPDATE CUSTOMER ERROR", err);
    return res.status(500).json({ error: "Server error updating customer" });
  }
}

async function deleteCustomerController(req, res) {
  try {
    const { id } = req.params;
    await deleteUser(id);
    return res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error("DELETE CUSTOMER ERROR", err);
    return res.status(500).json({ error: "Server error deleting customer" });
  }
}

module.exports = {
  getCustomerByAccount,
  getCustomerById,
  getStats,
  listCustomers,
  createCustomerController,
  updateCustomerController,
  deleteCustomerController,
};
