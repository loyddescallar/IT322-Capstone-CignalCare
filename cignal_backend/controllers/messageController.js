const pool = require("../config/db");
const fs = require('fs');
const path = require('path');
const { v2: cloudinary } = require('cloudinary');
const { MIMES, inspectAttachmentBytes, decodePrivateAttachment,
  validLegacyCloudinaryUrl, boundedFetch } = require('../utils/privateChatAttachment');
const { uploadDir } = require('../middleware/uploadMessage');

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
  isUploadStorageError,
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
  // C2: normal HTTP traffic may only VERIFY existing schema, never perform DDL or data repairs.
  if (!require('../utils/schemaSafety').inMigrationContext()) {
    return require('../utils/schemaSafety').assertSchema(pool, 'messages');
  }
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
        attachment: savedMessage.attachment ? 'protected' : null,
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
          uploadedAsset.resourceType,
          uploadedAsset.deliveryType || 'upload'
        );
      }

      if (req.file?.path) {
        await removeLocalFileQuietly(
          req.file.path
        );
      }
    }

    if (isUploadStorageError(error)) {
      return res.status(error.statusCode || 503).json({
        error: error.message,
      });
    }

    if (
      error.message?.includes(
        "Only JPG"
      ) ||
      error.message?.includes(
        "Upload must be"
      ) ||
      error.message?.includes("Invalid attachment contents")
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
      messages: rows.map((row) => ({
        ...row,
        attachment: row.attachment ? 'protected' : null,
      })),
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

// A single authenticated download path for local, legacy Cloudinary and new
// protected Cloudinary attachments. The DB record, never client input, selects
// the backing asset. No Cloudinary URL or public ID is returned to the client.
async function getTicketMessageAttachmentController(req, res) {
  try {
    const ticketId = Number(req.params.id);
    const messageId = Number(req.params.messageId);
    if (!Number.isSafeInteger(ticketId) || ticketId < 1 ||
        !Number.isSafeInteger(messageId) || messageId < 1) {
      return res.status(400).json({ error: 'Invalid ticket or attachment' });
    }
    const ticket = await getTicketById(ticketId);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!canAccessTicket(req, ticket)) return res.status(403).json({ error: 'Forbidden' });
    const [rows] = await pool.query(
      'SELECT attachment, attachment_type FROM ticket_messages WHERE id = ? AND ticket_id = ? LIMIT 1',
      [messageId, ticketId]
    );
    const record = rows[0];
    if (!record?.attachment) return res.status(404).json({ error: 'Attachment not found' });
    const mime = String(record.attachment_type || '').toLowerCase();
    if (!Object.hasOwn(MIMES, mime)) {
      return res.status(415).json({ error: 'Unsupported attachment type' });
    }
    const stored = String(record.attachment);
    let bytes;
    const protectedAsset = decodePrivateAttachment(stored);
    if (protectedAsset) {
      const credentials = {
        cloud_name: String(process.env.CLOUDINARY_CLOUD_NAME || ''),
        api_key: String(process.env.CLOUDINARY_API_KEY || ''),
        api_secret: String(process.env.CLOUDINARY_API_SECRET || ''),
      };
      if (!credentials.cloud_name || !credentials.api_key || !credentials.api_secret) {
        return res.status(503).json({ error: 'Attachment provider is not configured.' });
      }
      cloudinary.config({ ...credentials, secure: true });
      const url = cloudinary.utils.private_download_url(protectedAsset.p, protectedAsset.f, {
        resource_type: protectedAsset.r,
        type: 'authenticated',
        expires_at: Math.floor(Date.now() / 1000) + 90,
      });
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 12000);
      try { bytes = await boundedFetch(url, { signal: abort.signal }); }
      finally { clearTimeout(timer); }
    } else if (/^https?:\/\//i.test(stored)) {
      // Only previously stored URLs under this account's Cloudinary delivery host.
      // Legacy assets are still public at their old URLs; plan migration/revocation.
      const legacy = validLegacyCloudinaryUrl(stored, process.env.CLOUDINARY_CLOUD_NAME);
      if (!legacy) return res.status(404).json({ error: 'Attachment not available' });
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 12000);
      try { bytes = await boundedFetch(legacy, { signal: abort.signal }); }
      finally { clearTimeout(timer); }
    } else {
      if (!/^[a-zA-Z0-9._-]{1,180}$/.test(stored) || stored === '.' || stored === '..') {
        return res.status(404).json({ error: 'Attachment not available' });
      }
      const filePath = path.resolve(uploadDir, stored);
      if (path.dirname(filePath) !== path.resolve(uploadDir)) {
        return res.status(404).json({ error: 'Attachment not available' });
      }
      try { bytes = await fs.promises.readFile(filePath); }
      catch (e) { if (e.code === 'ENOENT') return res.status(404).json({ error: 'Attachment not found' }); throw e; }
      if (bytes.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Attachment exceeds maximum size' });
    }
    if (!inspectAttachmentBytes(bytes, mime)) {
      return res.status(502).json({ error: 'Attachment content does not match its declared format' });
    }
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Content-Disposition', `inline; filename="attachment.${MIMES[mime]}"`);
    return res.status(200).send(bytes);
  } catch (error) {
    console.error('PROTECTED ATTACHMENT ERROR:', error.message);
    if (!res.headersSent) {
      return res.status(error.statusCode || 502).json({
        error: error.statusCode === 424
          ? 'PDF or attachment delivery is blocked by Cloudinary. Contact support to enable permitted delivery.'
          : 'Attachment temporarily unavailable.',
      });
    }
  }
}

// Read local development attachments only after ticket ownership check.
// Cloudinary URLs are separate external assets and are not proxied here.
async function getTicketAttachmentController(req, res) {
  try {
    const filename = String(req.params.filename || '');
    if (!/^[a-zA-Z0-9._-]{1,180}$/.test(filename) || filename === '.' || filename === '..') {
      return res.status(400).json({ error: 'Invalid attachment name' });
    }
    const ticket = await getTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    if (!canAccessTicket(req, ticket)) return res.status(403).json({ error: 'Forbidden' });

    const [rows] = await pool.query(
      'SELECT attachment, attachment_type FROM ticket_messages WHERE ticket_id = ? AND attachment = ? LIMIT 1',
      [req.params.id, filename]
    );
    if (!rows.length) return res.status(404).json({ error: 'Attachment not found' });
    const filePath = path.resolve(uploadDir, filename);
    if (path.dirname(filePath) !== path.resolve(uploadDir)) {
      return res.status(400).json({ error: 'Invalid attachment path' });
    }
    let stat;
    try { stat = await fs.promises.stat(filePath); }
    catch (e) { if (e.code === 'ENOENT') return res.status(404).json({ error: 'Attachment not found' }); throw e; }
    if (!stat.isFile()) return res.status(404).json({ error: 'Attachment not found' });
    const mime = {
      '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png',
      '.gif':'image/gif', '.webp':'image/webp', '.pdf':'application/pdf',
    }[path.extname(filename).toLowerCase()];
    if (!mime) return res.status(415).json({ error: 'Unsupported attachment type' });
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) res.status(error.status || 500).json({ error: 'Unable to open attachment' });
    });
  } catch (error) {
    console.error('TICKET ATTACHMENT ERROR:', error.message);
    if (!res.headersSent) return res.status(500).json({ error: 'Unable to open attachment' });
  }
}

module.exports = {
  getTicketMessageAttachmentController,
  getTicketAttachmentController,
  sendMessageController,
  getMessagesController,
  ensureMessageSchema,
};
