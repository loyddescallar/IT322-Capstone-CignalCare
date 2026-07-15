const pool = require("../config/db");

const {
  getTicketById,
} = require("../models/ticketModel");

const {
  createNotification,
  createAdminNotification,
} = require("../models/notificationModel");

const {
  isAdmin,
  isSelf,
} = require("../utils/ownership");

const {
  uploadLocalFileMaybe,
  deleteCloudinaryAssetMaybe,
  removeLocalFileQuietly,
} = require("../utils/cloudinaryUpload");

let messageSchemaReady = false;

function canAccessTicket(req, ticket) {
  return (
    ticket &&
    (
      isAdmin(req) ||
      isSelf(req, ticket.user_id)
    )
  );
}

function normalizeRole(role) {
  return String(role || "")
    .trim()
    .toLowerCase() === "admin"
    ? "admin"
    : "user";
}

function isFinishedTicket(status) {
  return [
    "resolved",
    "archived",
  ].includes(
    String(status || "")
      .trim()
      .toLowerCase()
  );
}

async function ensureMessageSchema() {
  if (messageSchemaReady) return;

  await pool.query(`
    ALTER TABLE ticket_messages
    ADD COLUMN IF NOT EXISTS attachment TEXT
  `);

  await pool.query(`
    ALTER TABLE ticket_messages
    ALTER COLUMN attachment TYPE TEXT
  `);

  await pool.query(`
    ALTER TABLE ticket_messages
    ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(100)
  `);

  messageSchemaReady = true;
}

async function sendMessageController(
  req,
  res
) {
  let uploadedAsset = null;
  let messagePersisted = false;

  try {
    await ensureMessageSchema();

    const { id } = req.params;

    const messageText = String(
      req.body?.message || ""
    ).trim();

    const hasMessage =
      Boolean(messageText);

    const hasFile =
      Boolean(req.file);

    if (
      !hasMessage &&
      !hasFile
    ) {
      return res.status(400).json({
        error:
          "Message or attachment is required",
      });
    }

    const ticket =
      await getTicketById(id);

    if (!ticket) {
      if (req.file?.path) {
        await removeLocalFileQuietly(
          req.file.path
        );
      }

      return res.status(404).json({
        error: "Ticket not found",
      });
    }

    if (
      !canAccessTicket(
        req,
        ticket
      )
    ) {
      if (req.file?.path) {
        await removeLocalFileQuietly(
          req.file.path
        );
      }

      return res.status(403).json({
        error: "Forbidden",
      });
    }

    if (
      isFinishedTicket(
        ticket.status
      )
    ) {
      if (req.file?.path) {
        await removeLocalFileQuietly(
          req.file.path
        );
      }

      return res.status(400).json({
        error:
          "This ticket is already resolved or archived",
      });
    }

    if (req.file) {
      uploadedAsset =
        await uploadLocalFileMaybe(
          req.file,
          "cignalcare/chat"
        );

      if (
        process.env.NODE_ENV !==
        "production"
      ) {
        console.log(
          "CHAT ATTACHMENT STORED:",
          {
            storage:
              uploadedAsset?.storage ||
              "unknown",
            mimeType:
              req.file.mimetype,
            sizeBytes:
              req.file.size,
            hasUrl:
              Boolean(
                uploadedAsset?.url
              ),
          }
        );
      }
    }

    const attachment =
      uploadedAsset?.url || null;

    const attachmentType =
      req.file?.mimetype || null;

    const senderRole =
      normalizeRole(
        req.user?.role
      );

    const [result] =
      await pool.query(
        `
        INSERT INTO ticket_messages (
          ticket_id,
          sender_id,
          sender_role,
          message,
          attachment,
          attachment_type
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          id,
          req.user.id,
          senderRole,
          hasMessage
            ? messageText
            : null,
          attachment,
          attachmentType,
        ]
      );

    messagePersisted = true;

    try {
      if (
        senderRole === "admin"
      ) {
        await createNotification({
          user_id:
            ticket.user_id,
          account_number:
            ticket.accountNumber,
          type: "ticket_reply",
          message:
            `Admin replied to your ticket #${ticket.id}.`,
        });
      } else {
        await createAdminNotification({
          type: "admin_message",
          message:
            `New customer reply on ticket #${ticket.id} from ` +
            `${
              req.user.accountName ||
              ticket.accountName ||
              "Customer"
            }.`,
        });
      }
    } catch (notificationError) {
      console.error(
        "CHAT NOTIFICATION ERROR:",
        notificationError.message
      );
    }

    const [rows] =
      await pool.query(
        `
        SELECT
          tm.*,
          u.accountName,
          u.accountName AS sender_name
        FROM ticket_messages tm
        LEFT JOIN users u
          ON u.id = tm.sender_id
        WHERE tm.id = ?
        LIMIT 1
        `,
        [result.insertId]
      );

    const savedMessage =
      rows[0] || {
        id: result.insertId,
        ticket_id:
          Number(id),
        sender_id:
          req.user.id,
        sender_role:
          senderRole,
        message:
          hasMessage
            ? messageText
            : null,
        attachment,
        attachment_type:
          attachmentType,
        accountName:
          req.user.accountName ||
          null,
        sender_name:
          req.user.accountName ||
          null,
        created_at:
          new Date().toISOString(),
      };

    return res.status(201).json({
      message: {
        ...savedMessage,
        is_mine: 1,
      },
      attachment_storage:
        uploadedAsset?.storage ||
        null,
    });
  } catch (error) {
    console.error(
      "SEND MESSAGE ERROR",
      error
    );

    if (!messagePersisted) {
      if (
        uploadedAsset?.storage ===
          "cloudinary" &&
        uploadedAsset.publicId
      ) {
        await deleteCloudinaryAssetMaybe(
          uploadedAsset.publicId,
          uploadedAsset.resourceType
        );
      }

      if (req.file?.path) {
        await removeLocalFileQuietly(
          req.file.path
        );
      }
    }

    if (
      error.message?.includes(
        "Only JPG"
      ) ||
      error.message?.includes(
        "Upload must be"
      )
    ) {
      return res.status(400).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: "Server error",
    });
  }
}

async function getMessagesController(
  req,
  res
) {
  try {
    await ensureMessageSchema();

    const ticket =
      await getTicketById(
        req.params.id
      );

    if (!ticket) {
      return res.status(404).json({
        error: "Ticket not found",
      });
    }

    if (
      !canAccessTicket(
        req,
        ticket
      )
    ) {
      return res.status(403).json({
        error: "Forbidden",
      });
    }

    const [rows] =
      await pool.query(
        `
        SELECT
          tm.*,
          u.accountName,
          u.accountName AS sender_name,
          CASE
            WHEN tm.sender_id = ?
            THEN 1
            ELSE 0
          END AS is_mine
        FROM ticket_messages tm
        LEFT JOIN users u
          ON u.id = tm.sender_id
        WHERE tm.ticket_id = ?
        ORDER BY
          tm.created_at ASC,
          tm.id ASC
        `,
        [
          req.user.id,
          req.params.id,
        ]
      );

    return res.json({
      messages: rows,
    });
  } catch (error) {
    console.error(
      "GET MESSAGES ERROR",
      error
    );

    return res.status(500).json({
      error: "Server error",
    });
  }
}

module.exports = {
  sendMessageController,
  getMessagesController,
  ensureMessageSchema,
};
