const {
  createRequest,
  getRequestsByUser,
  getAllRequests,
  updateRequestStatus
} = require("../models/technicianModel");

async function createTechnicianRequest(req, res) {
  try {
    const { accountNumber, contactName, contactPhone, issueDescription } = req.body;
    if (!accountNumber || !contactName || !contactPhone || !issueDescription) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const id = await createRequest({
      user_id: req.user.id,
      accountNumber,
      contactName,
      contactPhone,
      issueDescription
    });
    return res.status(201).json({ message: "Technician request submitted", id });
  } catch (err) {
    console.error("CREATE TECH REQUEST ERROR", err);
    return res.status(500).json({ error: "Server error creating technician request" });
  }
}

async function getMyTechnicianRequests(req, res) {
  try {
    const requests = await getRequestsByUser(req.user.id);
    return res.json({ requests });
  } catch (err) {
    console.error("GET MY TECH REQUESTS ERROR", err);
    return res.status(500).json({ error: "Server error fetching technician requests" });
  }
}

async function getAllTechnicianRequests(req, res) {
  try {
    const requests = await getAllRequests();
    return res.json({ requests });
  } catch (err) {
    console.error("GET ALL TECH REQUESTS ERROR", err);
    return res.status(500).json({ error: "Server error fetching technician requests" });
  }
}

async function updateTechnicianRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, technician_name, admin_note } = req.body;
    if (!status) return res.status(400).json({ error: "status is required" });
    await updateRequestStatus(id, status, technician_name || null, admin_note || null);
    return res.json({ message: "Technician request updated" });
  } catch (err) {
    console.error("UPDATE TECH STATUS ERROR", err);
    return res.status(500).json({ error: "Server error updating technician request" });
  }
}

module.exports = {
  createTechnicianRequest,
  getMyTechnicianRequests,
  getAllTechnicianRequests,
  updateTechnicianRequestStatus
};
