const pool = require("../config/db");
const {
  addLoadHistory,
  getLoadHistoryByUser,
  getAllLoadHistory,
  getAllPrepaidTransactions
} = require("../models/loadModel");

async function addLoad(req, res) {
  try {
    const { accountNumber, loadAmount, description } = req.body;
    if (!accountNumber || !loadAmount) {
      return res.status(400).json({ error: "accountNumber and loadAmount are required" });
    }
    const id = await addLoadHistory({
      user_id: req.user.id,
      accountNumber,
      loadAmount,
      description,
      status: "pending"
    });
    return res.status(201).json({ message: "Load request submitted", requestId: id, status: "pending" });
  } catch (err) {
    console.error("ADD LOAD ERROR", err);
    return res.status(500).json({ error: "Server error creating load request" });
  }
}

async function getMyLoadHistory(req, res) {
  try {
    const history = await getLoadHistoryByUser(req.user.id);
    return res.json({ success: true, history });
  } catch (err) {
    console.error("GET MY LOAD HISTORY ERROR", err);
    return res.status(500).json({ error: "Server error fetching load history" });
  }
}

async function getAllLoadHistoryController(req, res) {
  try {
    const history = await getAllLoadHistory();
    return res.json({ success: true, history });
  } catch (err) {
    console.error("GET ALL LOAD HISTORY ERROR", err);
    return res.status(500).json({ error: "Server error fetching load history" });
  }
}

async function getPrepaidTransactionsController(req, res) {
  try {
    const transactions = await getAllPrepaidTransactions();
    return res.json({ success: true, transactions });
  } catch (err) {
    console.error("GET PREPAID TX ERROR", err);
    return res.status(500).json({ error: "Server error fetching prepaid transactions" });
  }
}

async function getPlansController(req, res) {
  try {
    const [plans] = await pool.query(
      `SELECT id, plan_code, plan_name, amount, validity_days, hd_channels, sd_channels, benefits_text, ai_note, status
       FROM prepaid_plans ORDER BY amount ASC`
    );
    return res.json({ success: true, plans });
  } catch (err) {
    console.error("GET PLANS ERROR", err);
    return res.status(500).json({ error: "Server error fetching plans" });
  }
}

async function updateLoadStatusController(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: "Status is required" });
    await require("../models/loadModel").updateLoadStatus(id, status);
    return res.json({ success: true, message: `Load updated to ${status}` });
  } catch (err) {
    console.error("UPDATE LOAD STATUS ERROR", err);
    return res.status(500).json({ error: "Server error updating load status" });
  }
}

module.exports = {
  addLoad,
  getMyLoadHistory,
  getAllLoadHistoryController,
  getPrepaidTransactionsController,
  getPlansController,
  updateLoadStatusController
};
