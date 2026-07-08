const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const fileUpload = require("express-fileupload");
require("dotenv").config();

// ROUTES
const authRoutes = require("./routes/authRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const technicianRoutes = require("./routes/technicianRoutes");
const troubleshootRoutes = require("./routes/troubleshootRoutes");
const loadRoutes = require("./routes/loadRoutes");
const loadRequestRoutes = require("./routes/loadRequestRoutes");
const customerRoutes = require("./routes/customerRoutes");
const validationRoutes = require("./routes/validationRoutes");
const uploadRoute = require("./routes/uploadRoute");

const app = express();
const PORT = process.env.PORT || 5000;

/* ======================
   MIDDLEWARE (IMPORTANT ORDER)
====================== */
app.use(cors());
app.use(morgan("dev"));

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

// ✅ MUST BE BEFORE ROUTES
app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
  })
);

/* ======================
   ROUTES
====================== */
app.use("/api/upload", uploadRoute);

app.use("/api/auth", authRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/technicians", technicianRoutes);
app.use("/api/troubleshoot", troubleshootRoutes);
app.use("/api/load", loadRoutes);
app.use("/api/load-requests", loadRequestRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api", validationRoutes);

/* ======================
   STATIC FILES
====================== */
app.use(
  "/uploads/messages",
  express.static(path.join(__dirname, "uploads", "messages"))
);

/* ======================
   404 HANDLER
====================== */
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

/* ======================
   START SERVER
====================== */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});