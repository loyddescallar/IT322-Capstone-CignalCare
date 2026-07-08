const express = require("express");
const router = express.Router();

const db = require("../config/db");

// GET USER NOTIFICATIONS
router.get("/", (req, res) => {
  db.query(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    }
  );
});

// MARK AS READ
router.put("/:id", (req, res) => {
  db.query(
    "UPDATE notifications SET is_read = 1 WHERE id = ?",
    [req.params.id],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Marked as read" });
    }
  );
});

module.exports = router;