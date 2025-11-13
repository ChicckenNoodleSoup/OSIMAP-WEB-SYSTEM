// ===============================
// IMPORTS & CONFIG
// ===============================
import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import fs from "fs";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { spawn } from "child_process";
import XLSX from "xlsx";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure data folder exists
const dataFolder = path.join(process.cwd(), "data");
if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder);

// Serve /data folder
app.use('/data', express.static(dataFolder));

// ===============================
// SUPPORT EMAIL ENDPOINT
// ===============================

app.post("/api/send-support-email", async (req, res) => {
  const { name, email, message, to } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      replyTo: email,
      subject: `Support Request from ${name}`,
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2 style="color:#0085FF;">New Support Message</h2>
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending support email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===============================
// MULTER CONFIG
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dataFolder),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// ===============================
// FILE VALIDATION CONSTANTS
// ===============================

const REQUIRED_COLUMNS = [
  'barangay','lat','lng','datecommitted','timecommitted','offensetype'
];

const SEVERITY_CALC_COLUMNS = [
  'victimcount','suspectcount','victiminjured','victimkilled',
  'victimunharmed','suspectkilled'
];

const ALL_REQUIRED_COLUMNS = [...REQUIRED_COLUMNS, ...SEVERITY_CALC_COLUMNS];

// ===============================
// VALIDATION (CSV + EXCEL)
// ===============================

// (VALIDATION FUNCTIONS REMAIN EXACTLY THE SAME)
// --- I DID NOT REMOVE ANY FUNCTION CONTENT ---
// Place your FULL validateCSVFile() and validateExcelFile() functions here unchanged.
// ===============================

// ===============================
// TASK QUEUE SYSTEM
// ===============================

// (ALL your queue logic, runSingleScript(), runUploadPipeline(), runClusteringPipeline()
// remain 100% UNCHANGED. Just paste them here.)

// ===============================
// API ROUTES
// ===============================

// HEALTH CHECK
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server running" });
});

// ROOT
app.get("/", (req, res) => {
  res.send("Backend Running");
});

// TEST
app.get("/test", (req, res) => {
  res.json({
    message: "Backend is accessible",
    timestamp: new Date().toISOString()
  });
});

// STATUS & CANCEL ROUTES
// (Paste your existing /status, /cancel, /run-clustering routes here unchanged)

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
