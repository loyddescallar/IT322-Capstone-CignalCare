const {
  createLoadRequest,
  getActivePlanForRequest,
  getLoadRequestById,
  getLoadRequestByPayMongoIdentifiers,
  getLoadRequestsByUser,
  getAllLoadRequests,
  updateLoadRequestStatus,
  attachPayMongoCheckout,
  markPayMongoCheckoutCreationFailed,
  markPayMongoPaymentPaid,
  markPayMongoPaymentFailed,
  markPayMongoPaymentCancelled,
  fulfillLoadRequest,
} = require('../models/loadRequestModel');

const { findByAccountIdOrCca } = require('../models/userModel');
const { createCheckoutSession } = require('../utils/paymongoClient');
const { uploadImageMaybe } = require('../utils/cloudinaryUpload');
const { isAdmin, ownsAccount } = require('../utils/ownership');
const { createNotification, createAdminNotification } = require('../models/notificationModel');
const { notifySafely } = require('../utils/safeNotification');
const {
  verifyPayMongoSignature,
  hashWebhookPayload,
  extractPayMongoWebhookData,
} = require('../utils/paymongoWebhook');
const {
  claimPayMongoWebhookEvent,
  markPayMongoWebhookEventProcessed,
  markPayMongoWebhookEventFailed,
} = require('../models/paymongoWebhookEventModel');

const ALLOWED_STATUS = [
  'Received',
  'Under Review',
  'Attending',
  'Completed',
  'Rejected',
];

const MANUAL_PAYMENT_METHODS = new Set(['GCash', 'Maya']);

const BLOCKED_DIAGNOSTICS = [
  'no_signal',
  'weak_signal',
  'smartcard',
  'black_screen',
  'unknown',
];

function makeReference(prefix = 'LR') {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

function normalizeAmount(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Number(value.toFixed(2));
}

function getWebhookPayload(req) {
  if (!Buffer.isBuffer(req.body)) {
    const error = new Error(
      'PayMongo webhook raw body is unavailable. Register the webhook route with express.raw() before express.json().'
    );
    error.statusCode = 400;
    throw error;
  }

  const raw = req.body;
  const bodyText = raw.toString('utf8');

  try {
    return {
      raw,
      json: JSON.parse(bodyText || '{}'),
    };
  } catch {
    const error = new Error('Invalid JSON webhook payload.');
    error.statusCode = 400;
    throw error;
  }
}

const PAYMONGO_PAID_EVENTS = new Set([
  'checkout_session.payment.paid',
  'payment.paid',
]);

const PAYMONGO_FAILED_EVENTS = new Set([
  'checkout_session.payment.failed',
  'payment.failed',
]);

const PAYMONGO_CANCELLED_EVENTS = new Set([
  'checkout_session.payment.cancelled',
  'checkout_session.cancelled',
  'checkout_session.expired',
  'payment.cancelled',
  'payment.expired',
]);

async function createLoadRequestController(req, res) {
  try {
    const {
      account_number,
      account_name,
      plan_id,
      plan_name,
      amount,
      payment_method,
      reference_no,
      receipt_photo,
      screen_photo,
      diagnostic_result,
      location,
    } = req.body;

    const parsedAmount = normalizeAmount(amount);
    const cleanPaymentMethod = String(payment_method || '').trim();
    const cleanReferenceNo = String(reference_no || '').trim();

    if (
      !account_number ||
      !plan_name ||
      !parsedAmount ||
      !cleanPaymentMethod ||
      !cleanReferenceNo
    ) {
      return res.status(400).json({
        error: 'Required fields missing',
      });
    }

    if (!MANUAL_PAYMENT_METHODS.has(cleanPaymentMethod)) {
      return res.status(400).json({
        error: 'Unsupported manual payment method.',
      });
    }

    if (cleanReferenceNo.length > 100) {
      return res.status(400).json({
        error: 'Reference number must be 100 characters or fewer.',
      });
    }

    const customer = await findByAccountIdOrCca(
      String(account_number).trim()
    );

    if (!customer) {
      return res.status(404).json({
        error: 'Customer account not found',
      });
    }

    if (!isAdmin(req) && !ownsAccount(req, customer.accountNumber)) {
      return res.status(403).json({
        error: 'Forbidden',
      });
    }

    const selectedPlan = await getActivePlanForRequest({
      planId: plan_id,
      planName: plan_name,
      amount: parsedAmount,
    });

    if (!selectedPlan) {
      return res.status(400).json({
        error: 'The selected prepaid plan is unavailable or no longer active.',
      });
    }

    const [receiptUrl, screenUrl] = await Promise.all([
      uploadImageMaybe(receipt_photo, 'cignalcare/load-receipts'),
      uploadImageMaybe(screen_photo, 'cignalcare/tv-screens'),
    ]);

    const id = await createLoadRequest({
      user_id: customer.id,
      plan_id: selectedPlan.id,
      account_number: customer.accountNumber,
      account_name: customer.accountName || '',
      plan_name: selectedPlan.plan_name,
      amount: Number(selectedPlan.amount),
      payment_method: cleanPaymentMethod,
      payment_status: 'manual_review',
      reference_no: cleanReferenceNo,
      receipt_photo: receiptUrl || null,
      screen_photo: screenUrl || null,
      diagnostic_result: diagnostic_result || null,
      location: customer.location || 'Balayan',
    });

    await notifySafely('CREATE MANUAL LOAD REQUEST', async () => {
      await createNotification({
        user_id: customer.id,
        account_number: customer.accountNumber,
        type: 'load_request',
        message: `Your ${selectedPlan.plan_name} load request was submitted and is awaiting payment review.`,
      });

      await createAdminNotification({
        type: 'admin_load_request',
        message: `New manual load request #${id} from ${customer.accountName} (${customer.accountNumber}) for ${selectedPlan.plan_name}.`,
      });
    });

    return res.status(201).json({
      message: 'Load request submitted',
      id,
    });
  } catch (err) {
    console.error('CREATE LOAD REQUEST ERROR', err);

    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Reference number already exists',
      });
    }

    return res.status(500).json({
      error: 'Server error',
    });
  }
}

async function createPayMongoCheckoutController(req, res) {
  let createdRequestId = null;

  try {
    const {
      account_number,
      account_name,
      plan_id,
      plan_name,
      amount,
      screen_photo,
      diagnostic_result,
      location,
    } = req.body;

    const parsedAmount = normalizeAmount(amount);

    if (!account_number || !plan_name || !parsedAmount) {
      return res.status(400).json({
        error: 'Account number, plan, and amount are required.',
      });
    }

    if (BLOCKED_DIAGNOSTICS.includes(diagnostic_result)) {
      return res.status(400).json({
        error:
          'This TV screen issue should be troubleshooted first before loading.',
      });
    }

    const customer = await findByAccountIdOrCca(
      String(account_number).trim()
    );

    if (!customer) {
      return res.status(404).json({
        error: 'Customer account not found',
      });
    }

    if (!isAdmin(req) && !ownsAccount(req, customer.accountNumber)) {
      return res.status(403).json({
        error: 'Forbidden',
      });
    }

    const selectedPlan = await getActivePlanForRequest({
      planId: plan_id,
      planName: plan_name,
      amount: parsedAmount,
    });

    if (!selectedPlan) {
      return res.status(400).json({
        error: 'The selected prepaid plan is unavailable or no longer active.',
      });
    }

    const referenceNo = makeReference('PM');
    const screenUrl = await uploadImageMaybe(
      screen_photo,
      'cignalcare/tv-screens'
    );

    const id = await createLoadRequest({
      user_id: customer.id,
      plan_id: selectedPlan.id,
      account_number: customer.accountNumber,
      account_name: customer.accountName || '',
      plan_name: selectedPlan.plan_name,
      amount: Number(selectedPlan.amount),
      payment_method: 'PayMongo',
      payment_status: 'pending',
      reference_no: referenceNo,
      receipt_photo: null,
      screen_photo: screenUrl || null,
      diagnostic_result: diagnostic_result || null,
      location: customer.location || 'Balayan',
    });

    createdRequestId = id;

    const checkout = await createCheckoutSession({
      referenceNumber: referenceNo,
      planName: selectedPlan.plan_name,
      amount: Number(selectedPlan.amount),
      accountName: customer.accountName || '',
      accountNumber: customer.accountNumber,
      requestId: id,
    });

    await attachPayMongoCheckout(id, checkout);

    await notifySafely('CREATE PAYMONGO CHECKOUT', async () => {
      await createNotification({
        user_id: customer.id,
        account_number: customer.accountNumber,
        type: 'payment',
        message: `PayMongo checkout was created for ${selectedPlan.plan_name}. Complete payment to continue your load request.`,
      });

      await createAdminNotification({
        type: 'admin_load_request',
        message: `New PayMongo load request #${id} from ${customer.accountName} (${customer.accountNumber}) for ${selectedPlan.plan_name}. Awaiting payment confirmation.`,
      });
    });

    return res.status(201).json({
      message: 'PayMongo checkout created',
      request: {
        id,
        reference_no: referenceNo,
        payment_status: 'pending',
      },
      checkout_url: checkout?.data?.attributes?.checkout_url,
      checkout_session_id: checkout?.data?.id,
    });
  } catch (err) {
    if (createdRequestId) {
      try {
        await markPayMongoCheckoutCreationFailed(createdRequestId);
      } catch (markError) {
        console.error('MARK PAYMONGO CHECKOUT FAILED ERROR:', markError.message);
      }
    }

    console.error('CREATE PAYMONGO CHECKOUT ERROR', {
      message: err.message,
      gatewayStatus: err.gatewayStatus || err.status,
      details: err.details,
    });

    const isDevelopment =
      String(process.env.NODE_ENV || '').toLowerCase() === 'development';

    return res.status(502).json({
      error: err.message || 'Unable to create PayMongo checkout.',
      ...(isDevelopment
        ? {
            gatewayStatus: err.gatewayStatus || err.status || null,
            details: err.details || undefined,
          }
        : {}),
    });
  }
}

async function getMyLoadRequestsController(req, res) {
  try {
    const requests = await getLoadRequestsByUser(req.user.id);

    return res.json({
      requests,
    });
  } catch (err) {
    console.error('GET MY LOAD REQUESTS ERROR', err);

    return res.status(500).json({
      error: 'Server error',
    });
  }
}

async function getAllLoadRequestsController(req, res) {
  try {
    const requests = await getAllLoadRequests();

    return res.json({
      requests,
    });
  } catch (err) {
    console.error('GET ALL LOAD REQUESTS ERROR', err);

    return res.status(500).json({
      error: 'Server error',
    });
  }
}

async function updateLoadStatusController(req, res) {
  try {
    const { status, admin_note } = req.body;

    if (!ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
      });
    }

    const request = await getLoadRequestById(req.params.id);

    if (!request) {
      return res.status(404).json({
        error: 'Load request not found',
      });
    }

    if (request.status === status && String(request.admin_note || '') === String(admin_note || '')) {
      return res.json({
        message: 'Load request already has this status',
        unchanged: true,
      });
    }

    if (
      status === 'Completed' &&
      request.payment_method === 'PayMongo' &&
      request.payment_status !== 'paid'
    ) {
      return res.status(400).json({
        error: 'PayMongo payment is not confirmed yet.',
      });
    }

    if (status === 'Completed') {
      await fulfillLoadRequest(
        req.params.id,
        req.user?.accountName || 'Admin',
        admin_note || null
      );
    } else {
      await updateLoadRequestStatus(
        req.params.id,
        status,
        admin_note || null
      );
    }

    await notifySafely('UPDATE LOAD REQUEST', () =>
      createNotification({
        user_id: request.user_id,
        account_number: request.account_number,
        type: 'load_status',
        message: `Your ${request.plan_name} load request is now ${status}.`,
      })
    );

    return res.json({
      message: 'Load request updated',
    });
  } catch (err) {
    console.error('UPDATE LOAD REQUEST STATUS ERROR', err);

    if (err.code === 'PLAN_NOT_FOUND') {
      return res.status(409).json({ error: err.message });
    }

    return res.status(500).json({
      error: 'Unable to update the load request.',
    });
  }
}

async function payMongoWebhookController(req, res) {
  let claimedEventId = null;

  try {
    const { raw, json } = getWebhookPayload(req);
    const verification = verifyPayMongoSignature(req, raw);

    if (!verification.valid) {
      console.warn('PAYMONGO WEBHOOK SIGNATURE REJECTED:', {
        reason: verification.reason,
        hasSignatureHeader: Boolean(
          req.headers['paymongo-signature'] ||
            req.headers['x-paymongo-signature']
        ),
        rawBodyIsBuffer: Buffer.isBuffer(raw),
        rawBodyLength: raw.length,
      });

      return res.status(401).json({
        error: 'Invalid PayMongo webhook signature',
        reason: verification.reason,
      });
    }

    const webhook = extractPayMongoWebhookData(json);
    const payloadHash = hashWebhookPayload(raw);
    const eventId = webhook.eventId || `payload_${payloadHash}`;

    const claim = await claimPayMongoWebhookEvent({
      eventId,
      eventType: webhook.eventType,
      payloadHash,
    });

    if (!claim.shouldProcess) {
      return res.status(200).json({
        received: true,
        duplicate: true,
        eventId,
        eventType: webhook.eventType,
      });
    }

    claimedEventId = eventId;

    console.log('PAYMONGO WEBHOOK VERIFIED:', {
      eventId,
      eventType: webhook.eventType,
      referenceNo: webhook.referenceNo,
      checkoutSessionId: webhook.checkoutSessionId,
      paymentIntentId: webhook.paymentIntentId,
      paymentId: webhook.paymentId,
      paymentMethod: webhook.paymentMethod,
      unsigned: Boolean(verification.unsigned),
    });

    if (PAYMONGO_PAID_EVENTS.has(webhook.eventType)) {
      const existingRequest = await getLoadRequestByPayMongoIdentifiers(
        webhook.referenceNo,
        webhook.checkoutSessionId
      );

      const affected = await markPayMongoPaymentPaid({
        referenceNo: webhook.referenceNo,
        checkoutSessionId: webhook.checkoutSessionId,
        paymentIntentId: webhook.paymentIntentId,
        paymentId: webhook.paymentId,
        paymentMethod: webhook.paymentMethod,
        fee: webhook.paymentAttributes?.fee || null,
        netAmount: webhook.paymentAttributes?.net_amount || null,
      });

      console.log('PAYMONGO PAYMENT MARK PAID RESULT:', {
        affected,
        requestId: existingRequest?.id || null,
        referenceNo: webhook.referenceNo,
        checkoutSessionId: webhook.checkoutSessionId,
      });

      if (
        existingRequest &&
        existingRequest.payment_status !== 'paid' &&
        affected
      ) {
        try {
          await createNotification({
            user_id: existingRequest.user_id,
            account_number: existingRequest.account_number,
            type: 'payment',
            message: `Payment confirmed for ${existingRequest.plan_name}. Your load request is now ready for processing.`,
          });

          await createAdminNotification({
            type: 'admin_payment',
            message: `PayMongo payment confirmed for load request #${existingRequest.id} (${existingRequest.account_name}, ${existingRequest.plan_name}).`,
          });
        } catch (notifyError) {
          console.error(
            'PAYMONGO PAYMENT NOTIFICATION ERROR:',
            notifyError.message
          );
        }
      }
    } else if (PAYMONGO_FAILED_EVENTS.has(webhook.eventType)) {
      const existingRequest = await getLoadRequestByPayMongoIdentifiers(
        webhook.referenceNo,
        webhook.checkoutSessionId
      );

      const affected = await markPayMongoPaymentFailed({
        referenceNo: webhook.referenceNo,
        checkoutSessionId: webhook.checkoutSessionId,
      });

      if (
        existingRequest &&
        existingRequest.payment_status !== 'paid' &&
        affected
      ) {
        try {
          await createNotification({
            user_id: existingRequest.user_id,
            account_number: existingRequest.account_number,
            type: 'payment',
            message: `Payment failed for ${existingRequest.plan_name}. You may create a new checkout and try again.`,
          });

          await createAdminNotification({
            type: 'admin_payment',
            message: `PayMongo payment failed for load request #${existingRequest.id} (${existingRequest.account_name}).`,
          });
        } catch (notifyError) {
          console.error(
            'PAYMONGO FAILURE NOTIFICATION ERROR:',
            notifyError.message
          );
        }
      }
    } else if (PAYMONGO_CANCELLED_EVENTS.has(webhook.eventType)) {
      const existingRequest = await getLoadRequestByPayMongoIdentifiers(
        webhook.referenceNo,
        webhook.checkoutSessionId
      );

      const affected = await markPayMongoPaymentCancelled({
        referenceNo: webhook.referenceNo,
        checkoutSessionId: webhook.checkoutSessionId,
      });

      if (
        existingRequest &&
        existingRequest.payment_status !== 'paid' &&
        affected
      ) {
        try {
          await createNotification({
            user_id: existingRequest.user_id,
            account_number: existingRequest.account_number,
            type: 'payment',
            message: `Payment was cancelled or expired for ${existingRequest.plan_name}. You may create a new checkout.`,
          });
        } catch (notifyError) {
          console.error(
            'PAYMONGO CANCELLATION NOTIFICATION ERROR:',
            notifyError.message
          );
        }
      }
    }

    await markPayMongoWebhookEventProcessed(eventId);

    return res.status(200).json({
      received: true,
      duplicate: false,
      eventId,
      eventType: webhook.eventType,
      referenceNo: webhook.referenceNo,
      checkoutSessionId: webhook.checkoutSessionId,
    });
  } catch (error) {
    console.error('PAYMONGO WEBHOOK ERROR:', {
      message: error.message,
      stack:
        String(process.env.NODE_ENV || '').toLowerCase() === 'development'
          ? error.stack
          : undefined,
    });

    if (claimedEventId) {
      try {
        await markPayMongoWebhookEventFailed(
          claimedEventId,
          error.message
        );
      } catch (markError) {
        console.error(
          'PAYMONGO WEBHOOK FAILURE RECORD ERROR:',
          markError.message
        );
      }
    }

    return res.status(error.statusCode || 500).json({
      error:
        error.statusCode === 400
          ? error.message
          : 'Unable to process PayMongo webhook.',
    });
  }
}

module.exports = {
  createLoadRequestController,
  createPayMongoCheckoutController,
  getMyLoadRequestsController,
  getAllLoadRequestsController,
  updateLoadStatusController,
  payMongoWebhookController,
};