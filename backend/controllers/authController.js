const jwt = require("jsonwebtoken");
require("dotenv").config();

const {
  findByAccountName,
  findById,
  checkDuplicate,
  createUser,
  findByAccountIdOrCca
} = require("../models/userModel");

function signToken(user) {
  const payload = {
    id: user.id,
    accountName: user.accountName,
    accountNumber: user.accountNumber,
    ccaNumber: user.ccaNumber,
    role: user.role
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "2h"
  });
}

async function register(req, res) {
  try {
    const { accountName, accountNumber, ccaNumber, address, phone, role } = req.body;

    if (!accountName || !accountNumber || !ccaNumber || !address || !phone) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const duplicate = await checkDuplicate(accountNumber, ccaNumber);
    if (duplicate) {
      return res.status(409).json({ error: "Account number or CCA number already exists" });
    }

    const id = await createUser({
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      ccaNumber: ccaNumber.trim(),
      address: address.trim(),
      phone: phone.trim(),
      role: role || "user"
    });

    return res.status(201).json({ message: "Account registered successfully", id });
  } catch (err) {
    console.error("REGISTER ERROR", err);
    return res.status(500).json({ error: "Server error during registration" });
  }
}

async function login(req, res) {
  try {
    const { accountName, accountId } = req.body;
    if (!accountName || !accountId) {
      return res.status(400).json({ error: "accountName and accountId are required" });
    }

    const user = await findByAccountName(accountName.trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials (name not found)" });
    }

    if (accountId !== user.accountNumber && accountId !== user.ccaNumber) {
      return res.status(401).json({ error: "Invalid credentials (ID mismatch)" });
    }

    const token = signToken(user);
    return res.json({
      token,
      user: {
        id: user.id,
        accountName: user.accountName,
        accountNumber: user.accountNumber,
        ccaNumber: user.ccaNumber,
        address: user.address,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    console.error("LOGIN ERROR", err);
    return res.status(500).json({ error: "Server error during login" });
  }
}

async function me(req, res) {
  try {
    const user = await findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      user: {
        id: user.id,
        accountName: user.accountName,
        accountNumber: user.accountNumber,
        ccaNumber: user.ccaNumber,
        address: user.address,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    console.error("ME ERROR", err);
    return res.status(500).json({ error: "Server error fetching user" });
  }
}

async function lookupByAccountId(req, res) {
  try {
    const { accountId } = req.params;
    const user = await findByAccountIdOrCca(accountId);
    if (!user) {
      return res.status(404).json({ error: "Account not found" });
    }
    return res.json({
      user: {
        id: user.id,
        accountName: user.accountName,
        accountNumber: user.accountNumber,
        ccaNumber: user.ccaNumber,
        address: user.address,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (err) {
    console.error("LOOKUP ERROR", err);
    return res.status(500).json({ error: "Server error during lookup" });
  }
}

module.exports = {
  register,
  login,
  me,
  lookupByAccountId
};
