// === Imports ===
import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import fs from "fs";
import { spawn } from "child_process";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// === Setup ===
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Global processing state
let isProcessing = false;
let processingStartTime = null;
let processingError = null;

// === Ensure "data" folder exists ===
const dataFolder = path.join(process.cwd(), "data");
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder);
  console.log("Created data folder at:", dataFolder);
}

// Serve static files from the data directory
app.use("/data", express.static(dataFolder));
console.log("Static files served from:", dataFolder);

// === Multer storage configuration ===
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fullPath = path.join(process.cwd(), "data");
    console.log("Saving file to:", fullPath);
    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // keep original filename
  },
});

const upload = multer({ storage });

// === Function to run Python script ===
function runSingleScript(scriptPath, onSuccess) {
  const process = spawn("python", [scriptPath]);

  process.stdout.on("data", (data) => {
    console.log(`${scriptPath} stdout: ${data.toString()}`);
  });

  process.stderr.on("data", (data) => {
    console.error(`${scriptPath} stderr: ${data.toString()}`);
  });

  process.on("close", (code) => {
    if (code === 0) {
      console.log(`${scriptPath} finished successfully.`);
      if (onSuccess) onSuccess();
    } else {
      console.error(`${scriptPath} exited with code ${code}`);
      isProcessing = false;
      processingError = `Script ${path.basename(scriptPath)} failed with exit code ${code}`;
    }
  });

  process.on("error", (error) => {
    console.error(`Error starting ${scriptPath}:`, error);
    isProcessing = false;
    processingError = `Failed to start ${path.basename(scriptPath)}: ${error.message}`;
  });
}

// === Function to run Python scripts sequentially ===
const runPythonScripts = () => {
  isProcessing = true;
  processingStartTime = new Date();
  processingError = null;

  const script1 = path.join(process.cwd(), "cleaning2.py");
  const script2 = path.join(process.cwd(), "export_geojson.py");
  const script3 = path.join(process.cwd(), "cluster_hdbscan.py");
  const cleanupScript = path.join(process.cwd(), "cleanup_files.py");
  const uploadScript = path.join(process.cwd(), "mobile_cluster_fetch.py");

  console.log("Starting Python script execution...");
  console.log(`Step 1: Running ${script1}`);

  runSingleScript(script1, () => {
    console.log(`Step 2: Running cleanup script ${cleanupScript}`);
    runSingleScript(cleanupScript, () => {
      console.log(`Step 3: Running ${script2}`);
      runSingleScript(script2, () => {
        console.log(`Step 4: Running ${script3}`);
        runSingleScript(script3, () => {
          console.log(`Step 5: Uploading clusters with ${uploadScript}`);
          runSingleScript(uploadScript, () => {
            console.log("🎉 All Python scripts completed successfully!");
            isProcessing = false;
          });
        });
      });
    });
  });
};

// === ROUTES ===

// Root route
app.get("/", (req, res) => {
  res.send("Backend is running. Use POST /upload to upload files.");
});

// Test endpoint
app.get("/test", (req, res) => {
  res.json({
    message: "Backend is accessible",
    timestamp: new Date().toISOString(),
    isProcessing: isProcessing,
  });
});

// Processing status
app.get("/status", (req, res) => {
  console.log("Status endpoint hit - isProcessing:", isProcessing);
  const processingTime = processingStartTime
    ? Math.floor((new Date() - processingStartTime) / 1000)
    : 0;

  const statusResponse = {
    isProcessing,
    processingTime: processingTime,
    processingStartTime: processingStartTime,
    processingError: processingError,
    status: isProcessing
      ? "processing"
      : processingError
      ? "error"
      : "idle",
  };

  console.log("Status response:", statusResponse);
  res.json(statusResponse);
});

// Check available data files
app.get("/data-files", (req, res) => {
  try {
    const files = fs.readdirSync(dataFolder);
    const geojsonFiles = files.filter((file) => file.endsWith(".geojson"));
    res.json({
      message: "Available data files",
      files: geojsonFiles,
      total: geojsonFiles.length,
    });
  } catch (error) {
    console.error("Error reading data folder:", error);
    res.status(500).json({
      message: "Error reading data folder",
      error: error.message,
    });
  }
});

// File upload route
app.post("/upload", upload.single("file"), (req, res) => {
  console.log("POST /upload route hit");
  console.log("File received:", req.file);

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  res.json({
    message: "File uploaded successfully. Processing started...",
    filename: req.file.filename,
  });

  // Start processing
  runPythonScripts();
});

// === Support Email Route ===
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
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px;">
            <h2 style="color: #0085FF; border-bottom: 2px solid #0085FF; padding-bottom: 10px;">
              New Support Message
            </h2>
            <div style="margin: 20px 0;">
              <p><strong>From:</strong> ${name}</p>
              <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
            </div>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Message:</strong></p>
              <p style="white-space: pre-wrap;">${message}</p>
            </div>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="color: #666; font-size: 14px;">
              <em>You can reply directly to this email to respond to ${name}</em>
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending support email:", error);
    res.status(500).json({
      success: false,
      error: "Failed to send email",
      details: error.message,
    });
  }
});

// === Start Server ===
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data files available at: http://localhost:${PORT}/data/`);
  console.log(`Check available files at: http://localhost:${PORT}/data-files`);
});
