// routes/validationLogs.js

router.post("/validation-log", async (req, res) => {

  const { field, input_value, reason } = req.body;

  await db.query(
    "INSERT INTO validation_logs (field,input_value,reason) VALUES (?,?,?)",
    [field, input_value, reason]
  );

  res.json({ success: true });

});