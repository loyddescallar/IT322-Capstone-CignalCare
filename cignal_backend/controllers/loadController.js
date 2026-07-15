const pool = require("../config/db");

const {
  processPosLoad,
  addLoadHistory,
  getLoadHistoryByUser,
  getAllLoadHistory,
  getAllPrepaidTransactions,
  updateLoadStatus,
} = require("../models/loadModel");

const {
  findByAccountIdOrCca,
} = require("../models/userModel");

const {
  createNotification,
} = require("../models/notificationModel");

const {
  notifySafely,
} = require("../utils/safeNotification");

const ALLOWED_STATUS = [
  "pending",
  "completed",
  "cancelled",
  "failed",
];

const PLAN_STATUSES = [
  "active",
  "inactive",
];

const POS_PAYMENT_METHODS = new Set([
  "Cash",
  "GCash",
  "Maya",
  "Bank Transfer",
]);

function makePosReference() {
  return `POS-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

let planColumnsReady = false;

function safeJsonParse(value, fallback = []) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed
      : fallback;
  } catch (_) {
    return fallback;
  }
}

function normalizeChannels(channels) {
  if (!Array.isArray(channels)) {
    return [];
  }

  return channels
    .map((channel) => {
      if (typeof channel === "string") {
        return {
          name: channel.trim(),
          category: "Others",
        };
      }

      return {
        name: String(
          channel?.name || ""
        ).trim(),
        category:
          String(
            channel?.category || "Others"
          ).trim() || "Others",
      };
    })
    .filter((channel) => channel.name);
}

function decoratePlan(plan) {
  const channels = normalizeChannels(
    safeJsonParse(plan.channels_json, [])
  );

  return {
    ...plan,
    channels,
    channel_count: channels.length,
  };
}

async function ensurePlanColumns() {
  if (planColumnsReady) return;

  await pool.query(`
    ALTER TABLE prepaid_plans
    ADD COLUMN IF NOT EXISTS channels_json TEXT
  `);

  planColumnsReady = true;
}

function cleanPlanPayload(body) {
  const planName = String(
    body.plan_name ||
      body.planName ||
      ""
  ).trim();

  const planCode = String(
    body.plan_code ||
      body.planCode ||
      planName
        .replace(/\s+/g, "")
        .toUpperCase()
  ).trim();

  const amount = Number(body.amount || 0);

  const validityDays = Number(
    body.validity_days ||
      body.validityDays ||
      30
  );

  const hdChannels = Number(
    body.hd_channels ??
      body.hdChannels ??
      0
  );

  const sdChannels = Number(
    body.sd_channels ??
      body.sdChannels ??
      0
  );

  const benefitsText = String(
    body.benefits_text ??
      body.benefitsText ??
      ""
  ).trim();

  const aiNote = String(
    body.ai_note ??
      body.aiNote ??
      ""
  ).trim();

  const status = PLAN_STATUSES.includes(
    body.status
  )
    ? body.status
    : "active";

  const channels = normalizeChannels(
    body.channels || []
  );

  return {
    planName,
    planCode,
    amount,
    validityDays,
    hdChannels,
    sdChannels,
    benefitsText,
    aiNote,
    status,
    channels,
  };
}

function validatePlanPayload(plan) {
  if (!plan.planName) {
    return "Plan name is required";
  }

  if (!plan.planCode) {
    return "Plan code is required";
  }

  if (
    !plan.amount ||
    Number(plan.amount) <= 0
  ) {
    return "Amount must be greater than zero";
  }

  if (
    !plan.validityDays ||
    Number(plan.validityDays) <= 0
  ) {
    return "Validity days must be greater than zero";
  }

  return "";
}

async function addLoad(req, res) {
  try {
    const {
      accountNumber,
      planId,
      loadAmount,
      paymentMethod = "Cash",
      description,
    } = req.body;

    if (
      !accountNumber ||
      (!planId && !loadAmount)
    ) {
      return res.status(400).json({
        error:
          "accountNumber and planId are required",
      });
    }

    const cleanPaymentMethod = String(
      paymentMethod || ""
    ).trim();

    if (
      !POS_PAYMENT_METHODS.has(
        cleanPaymentMethod
      )
    ) {
      return res.status(400).json({
        error: "Unsupported payment method",
      });
    }

    const customer =
      await findByAccountIdOrCca(
        String(accountNumber).trim()
      );

    if (!customer) {
      return res.status(404).json({
        error: "Customer account not found",
      });
    }

    const result = await processPosLoad({
      user_id: customer.id,
      accountNumber:
        customer.accountNumber,
      accountName:
        customer.accountName,
      plan_id: planId || null,
      loadAmount: Number(
        loadAmount || 0
      ),
      payment_method:
        cleanPaymentMethod,
      processed_by:
        req.user?.accountName ||
        "Admin",
      reference_no:
        makePosReference(),
      description:
        String(
          description || ""
        ).trim() || null,
    });

    await notifySafely(
      "POS LOAD",
      () =>
        createNotification({
          user_id: customer.id,
          account_number:
            customer.accountNumber,
          type: "load_completed",
          message:
            `Your ${result.plan.plan_name} load ` +
            `(₱${Number(
              result.plan.amount
            ).toLocaleString()}) was processed by ` +
            "Descallar Satellite Services.",
        })
    );

    return res.status(201).json({
      message:
        "Load transaction recorded",
      historyId: result.historyId,
      transactionId:
        result.transactionId,
      referenceNo:
        result.referenceNo,
      status: "completed",
    });
  } catch (err) {
    console.error(
      "ADD LOAD ERROR",
      err
    );

    if (
      err.code === "PLAN_NOT_FOUND"
    ) {
      return res.status(400).json({
        error: err.message,
      });
    }

    if (
      err.code === "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        error:
          "Transaction reference already exists",
      });
    }

    return res.status(500).json({
      error: "Server error",
    });
  }
}

async function getMyLoadHistory(
  req,
  res
) {
  try {
    const history =
      await getLoadHistoryByUser(
        req.user.id
      );

    return res.json({
      success: true,
      history,
    });
  } catch (err) {
    console.error(
      "GET MY LOAD HISTORY ERROR",
      err
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}

async function getAllLoadHistoryController(
  req,
  res
) {
  try {
    const history =
      await getAllLoadHistory();

    return res.json({
      success: true,
      history,
    });
  } catch (err) {
    console.error(
      "GET ALL LOAD HISTORY ERROR",
      err
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}

async function getPrepaidTransactionsController(
  req,
  res
) {
  try {
    const transactions =
      await getAllPrepaidTransactions();

    return res.json({
      success: true,
      transactions,
    });
  } catch (err) {
    console.error(
      "GET PREPAID TRANSACTIONS ERROR",
      err
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}

async function getPlansController(
  req,
  res
) {
  try {
    await ensurePlanColumns();

    const includeInactive =
      req.user?.role === "admin" &&
      String(
        req.query.includeInactive ||
          ""
      ) === "1";

    const sql = includeInactive
      ? `
        SELECT *
        FROM prepaid_plans
        ORDER BY amount ASC
      `
      : `
        SELECT *
        FROM prepaid_plans
        WHERE status = 'active'
        ORDER BY amount ASC
      `;

    const [plans] =
      await pool.query(sql);

    return res.json({
      success: true,
      plans:
        plans.map(decoratePlan),
    });
  } catch (err) {
    console.error(
      "GET PLANS ERROR",
      err
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}

async function createPlanController(
  req,
  res
) {
  try {
    await ensurePlanColumns();

    const plan =
      cleanPlanPayload(req.body);

    const validationError =
      validatePlanPayload(plan);

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const [result] =
      await pool.query(
        `
        INSERT INTO prepaid_plans (
          plan_code,
          plan_name,
          amount,
          validity_days,
          hd_channels,
          sd_channels,
          benefits_text,
          channels_json,
          ai_note,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          plan.planCode,
          plan.planName,
          plan.amount,
          plan.validityDays,
          plan.hdChannels,
          plan.sdChannels,
          plan.benefitsText ||
            null,
          JSON.stringify(
            plan.channels
          ),
          plan.aiNote || null,
          plan.status,
        ]
      );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      message: "Plan created",
    });
  } catch (err) {
    console.error(
      "CREATE PLAN ERROR",
      err
    );

    if (
      err.code === "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        error:
          "Plan code already exists",
      });
    }

    return res.status(500).json({
      error: "Server error",
    });
  }
}

async function updatePlanController(
  req,
  res
) {
  try {
    await ensurePlanColumns();

    const plan =
      cleanPlanPayload(req.body);

    const validationError =
      validatePlanPayload(plan);

    if (validationError) {
      return res.status(400).json({
        error: validationError,
      });
    }

    const [result] =
      await pool.query(
        `
        UPDATE prepaid_plans
        SET
          plan_code = ?,
          plan_name = ?,
          amount = ?,
          validity_days = ?,
          hd_channels = ?,
          sd_channels = ?,
          benefits_text = ?,
          channels_json = ?,
          ai_note = ?,
          status = ?
        WHERE id = ?
        `,
        [
          plan.planCode,
          plan.planName,
          plan.amount,
          plan.validityDays,
          plan.hdChannels,
          plan.sdChannels,
          plan.benefitsText ||
            null,
          JSON.stringify(
            plan.channels
          ),
          plan.aiNote || null,
          plan.status,
          req.params.id,
        ]
      );

    if (!result.affectedRows) {
      return res.status(404).json({
        error: "Plan not found",
      });
    }

    return res.json({
      success: true,
      message: "Plan updated",
    });
  } catch (err) {
    console.error(
      "UPDATE PLAN ERROR",
      err
    );

    if (
      err.code === "ER_DUP_ENTRY"
    ) {
      return res.status(409).json({
        error:
          "Plan code already exists",
      });
    }

    return res.status(500).json({
      error: "Server error",
    });
  }
}

async function deletePlanController(
  req,
  res
) {
  try {
    await ensurePlanColumns();

    const [result] =
      await pool.query(
        `
        DELETE FROM prepaid_plans
        WHERE id = ?
        `,
        [req.params.id]
      );

    if (!result.affectedRows) {
      return res.status(404).json({
        error: "Plan not found",
      });
    }

    return res.json({
      success: true,
      message: "Plan deleted",
    });
  } catch (err) {
    console.error(
      "DELETE PLAN ERROR",
      err
    );

    if (
      err.code ===
        "ER_ROW_IS_REFERENCED_2" ||
      err.code ===
        "ER_ROW_IS_REFERENCED"
    ) {
      return res.status(409).json({
        error:
          "This plan already has transaction records. Set it to inactive instead of deleting it.",
      });
    }

    return res.status(500).json({
      error: "Server error",
    });
  }
}

async function updateLoadStatusController(
  req,
  res
) {
  try {
    const { status } = req.body;

    if (
      !ALLOWED_STATUS.includes(status)
    ) {
      return res.status(400).json({
        error: "Invalid status",
      });
    }

    await updateLoadStatus(
      req.params.id,
      status
    );

    return res.json({
      success: true,
      message: "Load updated",
    });
  } catch (err) {
    console.error(
      "UPDATE LOAD STATUS ERROR",
      err
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}

module.exports = {
  addLoad,
  getMyLoadHistory,
  getAllLoadHistoryController,
  getPrepaidTransactionsController,
  getPlansController,
  createPlanController,
  updatePlanController,
  deletePlanController,
  updateLoadStatusController,
  ensurePlanColumns,
};
