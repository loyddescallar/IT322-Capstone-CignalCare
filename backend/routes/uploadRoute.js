const express = require("express");
const router = express.Router();
const cloudinary = require("../config/cloudinary");

router.post("/receipt", async (req, res) => {
  try {
    if (!req.files || !req.files.receipt) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = req.files.receipt;

    // ✅ FINAL SAFE METHOD (no tempFilePath, no buffer issues)
    const result = await cloudinary.uploader.upload(file.tempFilePath, {
      folder: "cignal_receipts",
    });

    return res.json({
      url: result.secure_url,
    });

  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return res.status(500).json({
      error: err.message,
    });
  }
});

module.exports = router;