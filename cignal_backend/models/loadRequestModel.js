const pool = require('../config/db');

let columnsReady = false;

const EXTRA_COLUMNS = [
  {
    name: 'plan_id',
    sql: 'ALTER TABLE load_requests ADD COLUMN plan_id INT DEFAULT NULL AFTER user_id',
  },
  {
    name: 'payment_status',
    sql: "ALTER TABLE load_requests ADD COLUMN payment_status ENUM('pending','paid','failed','cancelled','manual_review') NOT NULL DEFAULT 'manual_review' AFTER payment_method",
  },
  {
    name: 'paymongo_checkout_session_id',
    sql: 'ALTER TABLE load_requests ADD COLUMN paymongo_checkout_session_id VARCHAR(120) DEFAULT NULL AFTER reference_no',
  },
  {
    name: 'paymongo_checkout_url',
    sql: 'ALTER TABLE load_requests ADD COLUMN paymongo_checkout_url TEXT DEFAULT NULL AFTER paymongo_checkout_session_id',
  },
  {
    name: 'paymongo_payment_intent_id',
    sql: 'ALTER TABLE load_requests ADD COLUMN paymongo_payment_intent_id VARCHAR(120) DEFAULT NULL AFTER paymongo_checkout_url',
  },
  {
    name: 'paymongo_payment_id',
    sql: 'ALTER TABLE load_requests ADD COLUMN paymongo_payment_id VARCHAR(120) DEFAULT NULL AFTER paymongo_payment_intent_id',
  },
  {
    name: 'paymongo_payment_method',
    sql: 'ALTER TABLE load_requests ADD COLUMN paymongo_payment_method VARCHAR(60) DEFAULT NULL AFTER paymongo_payment_id',
  },
  {
    name: 'paymongo_fee',
    sql: 'ALTER TABLE load_requests ADD COLUMN paymongo_fee DECIMAL(10,2) DEFAULT NULL AFTER paymongo_payment_method',
  },
  {
    name: 'paymongo_net_amount',
    sql: 'ALTER TABLE load_requests ADD COLUMN paymongo_net_amount DECIMAL(10,2) DEFAULT NULL AFTER paymongo_fee',
  },
  {
    name: 'payment_completed_at',
    sql: 'ALTER TABLE load_requests ADD COLUMN payment_completed_at DATETIME DEFAULT NULL AFTER paymongo_net_amount',
  },
  {
    name: 'fulfilled_at',
    sql: 'ALTER TABLE load_requests ADD COLUMN fulfilled_at DATETIME DEFAULT NULL AFTER payment_completed_at',
  },
];

async function ensureLoadRequestColumns() {
  if (columnsReady) return;

  const [rows] = await pool.query(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'load_requests'`
  );

  const existing = new Set(rows.map((row) => row.COLUMN_NAME));

  for (const column of EXTRA_COLUMNS) {
    if (!existing.has(column.name)) {
      await pool.query(column.sql);
    }
  }

  columnsReady = true;
}


async function getActivePlanForRequest({ planId, planName, amount }) {
  const parsedPlanId = Number(planId);

  if (Number.isInteger(parsedPlanId) && parsedPlanId > 0) {
    const [rows] = await pool.query(
      `SELECT * FROM prepaid_plans
       WHERE id = ? AND status = 'active'
       LIMIT 1`,
      [parsedPlanId]
    );

    if (rows[0]) return rows[0];
  }

  const normalizedName = String(planName || '').trim();
  const parsedAmount = Number(amount);

  if (!normalizedName || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  const [rows] = await pool.query(
    `SELECT * FROM prepaid_plans
     WHERE plan_name = ?
       AND amount = ?
       AND status = 'active'
     LIMIT 1`,
    [normalizedName, Number(parsedAmount.toFixed(2))]
  );

  return rows[0] || null;
}

async function createLoadRequest(data) {
  await ensureLoadRequestColumns();

  const [result] = await pool.query(
    `INSERT INTO load_requests
     (user_id, plan_id, account_number, account_name, plan_name, amount,
      payment_method, payment_status, reference_no, receipt_photo,
      screen_photo, diagnostic_result, location)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.user_id,
      data.plan_id || null,
      data.account_number,
      data.account_name,
      data.plan_name,
      data.amount,
      data.payment_method,
      data.payment_status || 'manual_review',
      data.reference_no,
      data.receipt_photo || null,
      data.screen_photo || null,
      data.diagnostic_result || null,
      data.location || 'Balayan',
    ]
  );

  return result.insertId;
}

async function getLoadRequestById(id) {
  await ensureLoadRequestColumns();

  const [rows] = await pool.query(
    'SELECT * FROM load_requests WHERE id = ? LIMIT 1',
    [id]
  );

  return rows[0] || null;
}

async function getLoadRequestByReference(referenceNo) {
  await ensureLoadRequestColumns();

  const [rows] = await pool.query(
    'SELECT * FROM load_requests WHERE reference_no = ? LIMIT 1',
    [referenceNo]
  );

  return rows[0] || null;
}

async function getLoadRequestByPayMongoIdentifiers(
  referenceNo,
  checkoutSessionId
) {
  await ensureLoadRequestColumns();

  const conditions = [];
  const params = [];

  if (referenceNo) {
    conditions.push('reference_no = ?');
    params.push(referenceNo);
  }

  if (checkoutSessionId) {
    conditions.push('paymongo_checkout_session_id = ?');
    params.push(checkoutSessionId);
  }

  if (!conditions.length) return null;

  const [rows] = await pool.query(
    `SELECT *
     FROM load_requests
     WHERE ${conditions.join(' OR ')}
     ORDER BY id DESC
     LIMIT 1`,
    params
  );

  return rows[0] || null;
}

async function getLoadRequestsByUser(userId) {
  await ensureLoadRequestColumns();

  const [rows] = await pool.query(
    'SELECT * FROM load_requests WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );

  return rows;
}

async function getAllLoadRequests() {
  await ensureLoadRequestColumns();

  const [rows] = await pool.query(
    'SELECT * FROM load_requests ORDER BY created_at DESC'
  );

  return rows;
}

async function updateLoadRequestStatus(id, status, adminNote) {
  await ensureLoadRequestColumns();

  const [result] = await pool.query(
    `UPDATE load_requests
     SET status = ?, admin_note = ?, updated_at = NOW()
     WHERE id = ?`,
    [status, adminNote || null, id]
  );

  return result.affectedRows;
}

async function attachPayMongoCheckout(id, checkout) {
  await ensureLoadRequestColumns();

  const [result] = await pool.query(
    `UPDATE load_requests
     SET paymongo_checkout_session_id = ?,
         paymongo_checkout_url = ?,
         payment_status = 'pending',
         updated_at = NOW()
     WHERE id = ?`,
    [
      checkout?.data?.id || null,
      checkout?.data?.attributes?.checkout_url || null,
      id,
    ]
  );

  return result.affectedRows;
}

async function markPayMongoCheckoutCreationFailed(id) {
  await ensureLoadRequestColumns();

  const [result] = await pool.query(
    `UPDATE load_requests
     SET payment_status = 'failed', updated_at = NOW()
     WHERE id = ? AND payment_status <> 'paid'`,
    [id]
  );

  return result.affectedRows;
}

async function markPayMongoPaymentPaid({
  referenceNo,
  checkoutSessionId,
  paymentIntentId,
  paymentId,
  paymentMethod,
  fee,
  netAmount,
}) {
  await ensureLoadRequestColumns();

  const [result] = await pool.query(
    `UPDATE load_requests
     SET payment_status = 'paid',
         paymongo_checkout_session_id = COALESCE(?, paymongo_checkout_session_id),
         paymongo_payment_intent_id = COALESCE(?, paymongo_payment_intent_id),
         paymongo_payment_id = COALESCE(?, paymongo_payment_id),
         paymongo_payment_method = COALESCE(?, paymongo_payment_method),
         paymongo_fee = COALESCE(?, paymongo_fee),
         paymongo_net_amount = COALESCE(?, paymongo_net_amount),
         payment_completed_at = COALESCE(payment_completed_at, NOW()),
         updated_at = NOW()
     WHERE (reference_no = ? OR paymongo_checkout_session_id = ?)`,
    [
      checkoutSessionId || null,
      paymentIntentId || null,
      paymentId || null,
      paymentMethod || null,
      fee != null ? Number(fee) / 100 : null,
      netAmount != null ? Number(netAmount) / 100 : null,
      referenceNo || '',
      checkoutSessionId || '',
    ]
  );

  return result.affectedRows;
}

async function markPayMongoPaymentStatus({
  referenceNo,
  checkoutSessionId,
  status,
}) {
  await ensureLoadRequestColumns();

  if (!['failed', 'cancelled'].includes(status)) {
    throw new Error('Invalid PayMongo failure status');
  }

  const [result] = await pool.query(
    `UPDATE load_requests
     SET payment_status = ?, updated_at = NOW()
     WHERE (reference_no = ? OR paymongo_checkout_session_id = ?)
       AND payment_status <> 'paid'`,
    [status, referenceNo || '', checkoutSessionId || '']
  );

  return result.affectedRows;
}

async function markPayMongoPaymentFailed({
  referenceNo,
  checkoutSessionId,
}) {
  return markPayMongoPaymentStatus({
    referenceNo,
    checkoutSessionId,
    status: 'failed',
  });
}

async function markPayMongoPaymentCancelled({
  referenceNo,
  checkoutSessionId,
}) {
  return markPayMongoPaymentStatus({
    referenceNo,
    checkoutSessionId,
    status: 'cancelled',
  });
}

async function fulfillLoadRequest(id, processedBy = 'Admin', adminNote = null) {
  await ensureLoadRequestColumns();

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [[request]] = await connection.query(
      'SELECT * FROM load_requests WHERE id = ? FOR UPDATE',
      [id]
    );

    if (!request) {
      throw new Error('Load request not found');
    }

    if (request.fulfilled_at) {
      await connection.query(
        `UPDATE load_requests
         SET status = 'Completed', admin_note = ?, updated_at = NOW()
         WHERE id = ?`,
        [adminNote || null, id]
      );

      await connection.commit();
      return { alreadyFulfilled: true, request };
    }

    const [[plan]] = await connection.query(
      `SELECT *
       FROM prepaid_plans
       WHERE (id = ? AND ? IS NOT NULL)
          OR (plan_name = ? AND amount = ?)
       ORDER BY CASE WHEN id = ? THEN 0 ELSE 1 END, id ASC
       LIMIT 1`,
      [
        request.plan_id || null,
        request.plan_id || null,
        request.plan_name,
        request.amount,
        request.plan_id || 0,
      ]
    );

    if (!plan) {
      const error = new Error('The prepaid plan for this load request no longer exists. Restore or recreate the plan before completing the request.');
      error.code = 'PLAN_NOT_FOUND';
      throw error;
    }

    const validityDays = Number(plan.validity_days || 30);
    const planId = plan.id;
    let transactionId = null;

    if (planId) {
      const [transaction] = await connection.query(
        `INSERT INTO prepaid_transactions
         (reference_no, user_id, account_number, account_name, plan_id,
          amount, payment_method, processed_by, validity_days, expiry_date, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY), 'completed')
         ON DUPLICATE KEY UPDATE
           status = 'completed', transaction_date = NOW()`,
        [
          request.reference_no,
          request.user_id,
          request.account_number,
          request.account_name,
          planId,
          request.amount,
          request.payment_method,
          processedBy,
          validityDays,
          validityDays,
        ]
      );

      transactionId = transaction.insertId || null;
    }

    await connection.query(
      `INSERT INTO load_history
       (user_id, accountNumber, loadAmount, description, status)
       VALUES (?, ?, ?, ?, 'completed')`,
      [
        request.user_id,
        request.account_number,
        request.amount,
        `${request.plan_name} processed from load request #${request.id}`,
      ]
    );

    if (planId) {
      await connection.query(
        `INSERT INTO prepaid_accounts
         (user_id, account_number, account_name, current_plan_id,
          last_load_amount, last_load_date, expiry_date, status)
         VALUES (?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? DAY), 'active')
         ON DUPLICATE KEY UPDATE
           user_id = VALUES(user_id),
           account_name = VALUES(account_name),
           current_plan_id = VALUES(current_plan_id),
           last_load_amount = VALUES(last_load_amount),
           last_load_date = NOW(),
           expiry_date = DATE_ADD(NOW(), INTERVAL ? DAY),
           status = 'active'`,
        [
          request.user_id,
          request.account_number,
          request.account_name,
          planId,
          request.amount,
          validityDays,
          validityDays,
        ]
      );
    }

    await connection.query(
      `UPDATE load_requests
       SET status = 'Completed',
           admin_note = ?,
           fulfilled_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [adminNote || null, id]
    );

    await connection.commit();

    return {
      alreadyFulfilled: false,
      request,
      transactionId,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

module.exports = {
  ensureLoadRequestColumns,
  getActivePlanForRequest,
  createLoadRequest,
  getLoadRequestById,
  getLoadRequestByReference,
  getLoadRequestByPayMongoIdentifiers,
  getLoadRequestsByUser,
  getAllLoadRequests,
  updateLoadRequestStatus,
  attachPayMongoCheckout,
  markPayMongoCheckoutCreationFailed,
  markPayMongoPaymentPaid,
  markPayMongoPaymentStatus,
  markPayMongoPaymentFailed,
  markPayMongoPaymentCancelled,
  fulfillLoadRequest,
};
