const {
  createRequest,
  getRequestsByUser,
  getAllRequests,
  getRequestById,
  updateRequestStatus,
} = require('../models/technicianModel');
const { findByAccountIdOrCca } = require('../models/userModel');
const { createNotification, createAdminNotification } = require('../models/notificationModel');
const { notifySafely } = require('../utils/safeNotification');
const { isAdmin, ownsAccount } = require('../utils/ownership');
const { uploadImageMaybe } = require('../utils/cloudinaryUpload');

const ALLOWED_STATUS = ['Submitted', 'Under Review', 'Scheduled', 'Completed', 'Cancelled'];

async function createTechnicianRequest(req, res) {
  try {
    const {
      accountNumber,
      contactName,
      contactPhone,
      issueDescription,
      preferred_date,
      preferred_time,
      source,
      screen_issue,
      screen_photo,
    } = req.body;

    if (!accountNumber || !contactName || !contactPhone || !issueDescription) {
      return res.status(400).json({ error: 'Required fields missing' });
    }

    const customer = await findByAccountIdOrCca(String(accountNumber).trim());
    if (!customer) return res.status(404).json({ error: 'Customer account not found' });
    if (!isAdmin(req) && !ownsAccount(req, customer.accountNumber)) return res.status(403).json({ error: 'Forbidden' });

    const screenPhotoUrl = await uploadImageMaybe(screen_photo, 'cignalcare/technician/screens');

    const id = await createRequest({
      user_id: customer.id,
      accountNumber: customer.accountNumber,
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      issueDescription: issueDescription.trim(),
      preferred_date,
      preferred_time,
      source: source || null,
      screen_issue: screen_issue || null,
      screen_photo_url: screenPhotoUrl || null,
    });

    await notifySafely('CREATE TECHNICIAN REQUEST', async () => {
      await createNotification({
        user_id: customer.id,
        account_number: customer.accountNumber,
        type: 'technician',
        message: `Your technician request #${id} was submitted and is now Submitted.`,
      });

      await createAdminNotification({
        type: 'admin_technician',
        message: `New technician request #${id} from ${customer.accountName}: ${issueDescription.trim()}.`,
      });
    });

    return res.status(201).json({ message: 'Request submitted', id });
  } catch (err) {
    console.error('CREATE TECHNICIAN REQUEST ERROR', err);

    if (
      err.message?.includes('Only JPG') ||
      err.message?.includes('Upload must be')
    ) {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: 'Server error' });
  }
}

async function getMyTechnicianRequests(req, res) {
  try {
    const requests = await getRequestsByUser(req.user.id);
    return res.json({ requests });
  } catch (err) {
    console.error('GET MY TECHNICIAN REQUESTS ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function getAllTechnicianRequests(req, res) {
  try {
    const requests = await getAllRequests();
    return res.json({ requests });
  } catch (err) {
    console.error('GET ALL TECHNICIAN REQUESTS ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

async function updateTechnicianRequestStatus(req, res) {
  try {
    const { status, technician_name, admin_note } = req.body;

    if (!ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const request = await getRequestById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Technician request not found' });

    const nextTechnician = technician_name || null;
    const nextNote = admin_note || null;

    if (
      request.status === status &&
      String(request.technician_name || '') === String(nextTechnician || '') &&
      String(request.admin_note || '') === String(nextNote || '')
    ) {
      return res.json({
        message: 'Technician request already has these details',
        unchanged: true,
      });
    }

    await updateRequestStatus(req.params.id, status, nextTechnician, nextNote);

    await notifySafely('UPDATE TECHNICIAN REQUEST', () =>
      createNotification({
        user_id: request.user_id,
        account_number: request.accountNumber,
        type: 'technician_status',
        message: `Your technician request #${request.id} is now ${status}.${technician_name ? ` Assigned technician: ${technician_name}.` : ''}`,
      })
    );

    return res.json({ message: 'Request updated' });
  } catch (err) {
    console.error('UPDATE TECHNICIAN REQUEST STATUS ERROR', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  createTechnicianRequest,
  getMyTechnicianRequests,
  getAllTechnicianRequests,
  updateTechnicianRequestStatus,
};
