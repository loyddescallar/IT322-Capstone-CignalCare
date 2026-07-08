const express = require("express");
const router = express.Router();
const db = require("../config/db"); // adjust if your db file path is different

router.post("/validation-log", async (req, res) => {

  try {

    const { field, input_value, reason } = req.body;

    await db.query(
      "INSERT INTO validation_logs (field, input_value, reason, timestamp) VALUES (?, ?, ?, NOW())",
      [field, input_value, reason]
    );

    res.json({ success: true });

  } catch (err) {

    console.error("Validation log error:", err);
    res.status(500).json({ error: "Failed to log validation data" });

  }

});

module.exports = router;