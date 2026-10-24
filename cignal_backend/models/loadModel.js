const pool = require("../config/db");
const { FIXED_LOAD_VALIDITY_DAYS } = require("../utils/loadValidity");
const { isSamePosTransaction, replayConflict } = require("../utils/posIdempotency");

async function processPosLoad(entry) {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const referenceNo = String(entry.reference_no || "").trim();
    // Replays return the ORIGINAL completed sale. They must not refresh expiry,
    // add load history, or create another subscriber notification.
    const [existingRows] = await connection.query(
      'SELECT * FROM prepaid_transactions WHERE reference_no = ? LIMIT 1 FOR UPDATE',
      [referenceNo]
    );
    if (existingRows[0]) {
      if (!isSamePosTransaction(existingRows[0], entry)) throw replayConflict();
      const [plans] = await connection.query(
        'SELECT * FROM prepaid_plans WHERE id = ? LIMIT 1',
        [existingRows[0].plan_id]
      );
      await connection.commit();
      return {
        historyId: null,
        transactionId: existingRows[0].id,
        referenceNo,
        plan: plans[0] || { plan_name: 'Prepaid load', amount: existingRows[0].amount },
        replayed: true,
      };
    }

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

    const validityDays = FIXED_LOAD_VALIDITY_DAYS;

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
    // Concurrent POSTs may both see no sale. The unique reference constraint
    // makes only one insert succeed; return that committed result on retry.
    if (error.code === 'ER_DUP_ENTRY') {
      const referenceNo = String(entry.reference_no || '').trim();
      const [rows] = await pool.query(
        'SELECT * FROM prepaid_transactions WHERE reference_no = ? LIMIT 1',
        [referenceNo]
      );
      if (rows[0]) {
        if (!isSamePosTransaction(rows[0], entry)) throw replayConflict();
        const [plans] = await pool.query(
          'SELECT * FROM prepaid_plans WHERE id = ? LIMIT 1', [rows[0].plan_id]
        );
        return {
          historyId: null,
          transactionId: rows[0].id,
          referenceNo,
          plan: plans[0] || { plan_name: 'Prepaid load', amount: rows[0].amount },
          replayed: true,
        };
      }
    }
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

async function getAllPrepaidTransactions(filters = {}) {
  const conditions = ["pt.status = 'completed'"];
  const params = [];
  if (filters.source === 'pos') conditions.push("pt.reference_no LIKE 'POS-%'");
  if (filters.accountNumber) {
    conditions.push('pt.account_number LIKE ?');
    // Account-number search is intentional; escape SQL wildcard characters.
    params.push(`%${String(filters.accountNumber).replace(/[\\%_]/g, '\\$&')}%`);
  }
  if (filters.paymentMethod && filters.paymentMethod !== 'All') {
    conditions.push('pt.payment_method = ?');
    params.push(filters.paymentMethod);
  }
  const [rows] = await pool.query(
    `SELECT pt.*, pp.plan_name
       FROM prepaid_transactions pt
       LEFT JOIN prepaid_plans pp ON pp.id = pt.plan_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY pt.created_at DESC`, params
  );
  return rows;
}

// Optional server-side pagination for Completed Sales. All previous callers of
// getAllPrepaidTransactions continue to receive the original response format.
async function getPagedPrepaidTransactions(filters = {}) {
  const conditions = ["pt.status = 'completed'"];
  const params = [];
  if (filters.paymentMethod && filters.paymentMethod !== 'All') {
    conditions.push('pt.payment_method = ?');
    params.push(filters.paymentMethod);
  }
  if (filters.accountNumber) {
    conditions.push('pt.account_number LIKE ?');
    params.push(`%${String(filters.accountNumber).replace(/[\\%_]/g, '\\$&')}%`);
  }

  // Dates arrive as YYYY-MM-DD Philippine calendar dates. Compare actual
  // persisted timestamps against corresponding UTC epoch boundaries.
  // FROM_UNIXTIME uses MySQL's session time zone for TIMESTAMP comparison;
  // TO_TIMESTAMP returns the correct PostgreSQL instant.
  const epochExpression = pool.driver === 'mysql' ? 'FROM_UNIXTIME(?)' : 'TO_TIMESTAMP(?)';
  if (filters.from) {
    conditions.push(`pt.created_at >= ${epochExpression}`);
    params.push(Date.parse(`${filters.from}T00:00:00+08:00`) / 1000);
  }
  if (filters.to) {
    conditions.push(`pt.created_at < ${epochExpression}`);
    params.push((Date.parse(`${filters.to}T00:00:00+08:00`) + 86400000) / 1000);
  }
  const where = conditions.join(' AND ');
  const [totals] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(pt.amount), 0) AS sales
       FROM prepaid_transactions pt WHERE ${where}`, params
  );
  const total = Number(totals[0]?.total || 0);
  const sales = Number(totals[0]?.sales || 0);
  const page = Number(filters.page || 1);
  const pageSize = Number(filters.pageSize || 25);
  const offset = (page - 1) * pageSize;
  const [rows] = await pool.query(
    `SELECT pt.*, pp.plan_name
       FROM prepaid_transactions pt
       LEFT JOIN prepaid_plans pp ON pp.id = pt.plan_id
      WHERE ${where}
      ORDER BY pt.created_at DESC, pt.id DESC
      LIMIT ? OFFSET ?`, [...params, pageSize, offset]
  );
  return {
    transactions: rows,
    pagination: {
      page, pageSize, total,
      totalPages: Math.ceil(total / pageSize),
    },
    summary: { transactions: total, sales, grossProfit: total * 40 },
  };
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
  getPagedPrepaidTransactions,
  updateLoadStatus,
};
