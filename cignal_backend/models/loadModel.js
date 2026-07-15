const pool = require("../config/db");

async function processPosLoad(entry) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    let plan = null;
    const parsedPlanId = Number(entry.plan_id);

    if (Number.isInteger(parsedPlanId) && parsedPlanId > 0) {
      const [rows] = await connection.query(
        `
        SELECT *
        FROM prepaid_plans
        WHERE id = ?
          AND status = 'active'
        LIMIT 1
        FOR UPDATE
        `,
        [parsedPlanId]
      );

      plan = rows[0] || null;
    }

    if (!plan) {
      const [rows] = await connection.query(
        `
        SELECT *
        FROM prepaid_plans
        WHERE amount = ?
          AND status = 'active'
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE
        `,
        [entry.loadAmount]
      );

      plan = rows[0] || null;
    }

    if (!plan) {
      const error = new Error(
        "Selected prepaid plan is unavailable or inactive."
      );
      error.code = "PLAN_NOT_FOUND";
      throw error;
    }

    const validityDays = Number(plan.validity_days || 30);
    const referenceNo = String(entry.reference_no || "").trim();

    const description =
      entry.description ||
      `POS Load — ${plan.plan_name} via ${entry.payment_method}`;

    const [transaction] = await connection.query(
      `
      INSERT INTO prepaid_transactions (
        reference_no,
        user_id,
        account_number,
        account_name,
        plan_id,
        amount,
        payment_method,
        processed_by,
        validity_days,
        expiry_date,
        status
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        NOW() + (? * INTERVAL '1 day'),
        'completed'
      )
      `,
      [
        referenceNo,
        entry.user_id,
        entry.accountNumber,
        entry.accountName,
        plan.id,
        plan.amount,
        entry.payment_method,
        entry.processed_by || "Admin",
        validityDays,
        validityDays,
      ]
    );

    const [history] = await connection.query(
      `
      INSERT INTO load_history (
        user_id,
        accountNumber,
        loadAmount,
        description,
        status
      )
      VALUES (?, ?, ?, ?, 'completed')
      `,
      [
        entry.user_id,
        entry.accountNumber,
        plan.amount,
        description,
      ]
    );

    await connection.query(
      `
      INSERT INTO prepaid_accounts (
        user_id,
        account_number,
        account_name,
        current_plan_id,
        last_load_amount,
        last_load_date,
        expiry_date,
        status
      )
      VALUES (
        ?, ?, ?, ?, ?,
        NOW(),
        NOW() + (? * INTERVAL '1 day'),
        'active'
      )
      ON CONFLICT (account_number)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        account_name = EXCLUDED.account_name,
        current_plan_id = EXCLUDED.current_plan_id,
        last_load_amount = EXCLUDED.last_load_amount,
        last_load_date = NOW(),
        expiry_date = NOW() + (? * INTERVAL '1 day'),
        status = 'active'
      `,
      [
        entry.user_id,
        entry.accountNumber,
        entry.accountName,
        plan.id,
        plan.amount,
        validityDays,
        validityDays,
      ]
    );

    await connection.commit();

    return {
      historyId: history.insertId,
      transactionId: transaction.insertId,
      referenceNo,
      plan,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function addLoadHistory(entry) {
  const [result] = await pool.query(
    `
    INSERT INTO load_history (
      user_id,
      accountNumber,
      loadAmount,
      description,
      status
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [
      entry.user_id,
      entry.accountNumber,
      entry.loadAmount,
      entry.description || null,
      entry.status || "completed",
    ]
  );

  return result.insertId;
}

async function getLoadHistoryByUser(userId) {
  const [rows] = await pool.query(
    `
    SELECT *
    FROM load_history
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
    [userId]
  );

  return rows;
}

async function getAllLoadHistory() {
  const [rows] = await pool.query(
    `
    SELECT
      lh.*,
      u.accountName
    FROM load_history lh
    LEFT JOIN users u
      ON u.id = lh.user_id
    ORDER BY lh.created_at DESC
    `
  );

  return rows;
}

async function getAllPrepaidTransactions() {
  const [rows] = await pool.query(
    `
    SELECT
      pt.*,
      pp.plan_name
    FROM prepaid_transactions pt
    LEFT JOIN prepaid_plans pp
      ON pp.id = pt.plan_id
    ORDER BY pt.transaction_date DESC
    `
  );

  return rows;
}

async function updateLoadStatus(id, status) {
  await pool.query(
    `
    UPDATE load_history
    SET status = ?
    WHERE id = ?
    `,
    [status, id]
  );
}

module.exports = {
  processPosLoad,
  addLoadHistory,
  getLoadHistoryByUser,
  getAllLoadHistory,
  getAllPrepaidTransactions,
  updateLoadStatus,
};
