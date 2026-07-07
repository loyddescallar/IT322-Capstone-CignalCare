const LoadRequest = require("../models/loadRequestModel");
const loadService = require("../services/loadService");

const NOTIF_MSGS = {
  Received: (p) => `Your ${p} request has been received. We are now reviewing your payment.`,
  "Under Review": (p) => `Your ${p} request is now Under Review. Our team is verifying your payment.`,
  Attending: (p) => `Your ${p} request is being Attended to. Your account will be updated shortly.`,
  Completed: (p) => `Your ${p} request has been Completed. Your Cignal account is now active.`,
  Rejected: (p) => `Your ${p} request was Rejected. Please contact our office for assistance.`,
};

function notificationType(status) {
  if (status === "Completed") return "success";
  if (status === "Rejected") return "error";
  return "info";
}

exports.createLoadRequest = async (req, res) => {
  try {
    const body = req.body || {};
    const user = req.user || {};
    const payload = {
      ...body,
      user_id: body.user_id || user.id || null,
      account_number: body.account_number || body.accountNumber || user.accountNumber,
      account_name: body.account_name || body.accountName || user.accountName,
    };

    if (!payload.account_number || !payload.account_name || !payload.amount || !payload.plan_name) {
      return res.status(400).json({
        error: "account_number, account_name, plan_name, and amount are required",
      });
    }

    if (!payload.payment_method || !(payload.reference_no || payload.reference_number)) {
      return res.status(400).json({
        error: "payment_method and reference_no are required",
      });
    }

    const id = await LoadRequest.createLoadRequest(payload);
    const request = await LoadRequest.getLoadRequestById(id);

    await LoadRequest.addNotification({
      user_id: payload.user_id,
      account_number: payload.account_number,
      type: "info",
      message: NOTIF_MSGS.Received(payload.plan_name),
      related_id: id,
    }).catch(() => null);

    return res.status(201).json({
      message: "Load request submitted successfully",
      request,
    });
  } catch (err) {
    console.error("CREATE LOAD REQUEST ERROR", err);
    return res.status(500).json({ error: "Server error creating load request" });
  }
};

exports.getMyLoadRequests = async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "Login required" });

    const rows = user.id
      ? await LoadRequest.getUserLoadRequests(user.id)
      : await LoadRequest.getUserLoadRequestsByAccount(user.accountNumber);

    return res.json({ requests: rows, history: rows });
  } catch (err) {
    console.error("GET MY LOAD REQUESTS ERROR", err);
    return res.status(500).json({ error: "Server error fetching load requests" });
  }
};

exports.getUserLoadRequests = async (req, res) => {
  try {
    const userId = req.params.userId;
    const rows = await LoadRequest.getUserLoadRequests(userId);
    return res.json({ requests: rows, history: rows });
  } catch (err) {
    console.error("GET USER LOAD REQUESTS ERROR", err);
    return res.status(500).json({ error: "Server error fetching user load requests" });
  }
};

exports.getAllLoadRequests = async (_req, res) => {
  try {
    const rows = await LoadRequest.getAllLoadRequests();
    return res.json({ requests: rows, history: rows });
  } catch (err) {
    console.error("GET ALL LOAD REQUESTS ERROR", err);
    return res.status(500).json({ error: "Server error fetching load requests" });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_note } = req.body;
    const normalized = LoadRequest.normalizeStatus(status);

    const requestBefore = await LoadRequest.getLoadRequestById(id);
    if (!requestBefore) return res.status(404).json({ error: "Load request not found" });

    await LoadRequest.updateStatus(id, normalized, admin_note || null);

    let loadResult = null;
    if (normalized === "Completed") {
      loadResult = await loadService.executeLoad({ ...requestBefore, status: normalized }, req.user?.accountName || "Admin");
    }

    const updatedRequest = await LoadRequest.getLoadRequestById(id);

    await LoadRequest.addNotification({
      user_id: updatedRequest.user_id,
      account_number: updatedRequest.account_number,
      type: notificationType(normalized),
      message: (NOTIF_MSGS[normalized] || NOTIF_MSGS.Received)(updatedRequest.plan_name),
      related_id: id,
    }).catch(() => null);

    return res.json({
      message: "Load request status updated successfully",
      request: updatedRequest,
      loadResult,
    });
  } catch (err) {
    console.error("UPDATE LOAD REQUEST STATUS ERROR", err);
    return res.status(500).json({ error: "Server error updating load request status" });
  }
};
