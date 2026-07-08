const db = require("../config/db");

async function findPlanForRequest(loadRequest) {
  const amount = Number(loadRequest.amount || 0);
  const [rows] = await db.query(
    `SELECT id, plan_name, amount, validity_days
     FROM prepaid_plans
     WHERE amount = ? OR plan_name = ?
     ORDER BY ABS(amount - ?) ASC
     LIMIT 1`,
    [amount, loadRequest.plan_name, amount]
  );
  return rows[0] || null;
}

async function executeLoad(loadRequest, processedBy = "Remote Load Admin") {
  const plan = await findPlanForRequest(loadRequest);
  const validityDays = plan?.validity_days || 30;
  const planId = plan?.id || 1;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + validityDays);
  const expiryDate = expiry.toISOString().slice(0, 19).replace("T", " ");
  const referenceNo = loadRequest.reference_no || loadRequest.reference_number || `REMOTE-${Date.now()}`;

  const [txResult] = await db.query(
    `INSERT INTO prepaid_transactions
      (reference_no, user_id, account_number, account_name, plan_id, amount,
       payment_method, processed_by, validity_days, expiry_date, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')
     ON DUPLICATE KEY UPDATE
       status = 'completed',
       payment_method = VALUES(payment_method),
       processed_by = VALUES(processed_by)`,
    [
      referenceNo,
      loadRequest.user_id || null,
      loadRequest.account_number,
      loadRequest.account_name,
      planId,
      loadRequest.amount,
      loadRequest.payment_method || "Remote Payment",
      processedBy,
      validityDays,
      expiryDate,
    ]
  );

  const transactionId = txResult.insertId || null;

  await db.query(
    `INSERT INTO prepaid_accounts
      (user_id, account_number, account_name, current_plan_id, last_transaction_id,
       last_load_amount, last_load_date, expiry_date, status)
     VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, 'active')
     ON DUPLICATE KEY UPDATE
       current_plan_id = VALUES(current_plan_id),
       last_transaction_id = VALUES(last_transaction_id),
       last_load_amount = VALUES(last_load_amount),
       last_load_date = NOW(),
       expiry_date = VALUES(expiry_date),
       status = 'active',
       updated_at = NOW()`,
    [
      loadRequest.user_id || null,
      loadRequest.account_number,
      loadRequest.account_name,
      planId,
      transactionId,
      loadRequest.amount,
      expiryDate,
    ]
  );

  return {
    message: "Load executed successfully",
    transaction_id: transactionId,
    expiry_date: expiryDate,
  };
}

module.exports = { executeLoad };
