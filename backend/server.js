import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import fs from "fs";
import { exec } from "child_process";

const app = express();
const PORT = 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Ensure "data" folder exists
const dataFolder = path.join(process.cwd(), "data");
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder);
  console.log("Created data folder at:", dataFolder);
}

// Multer storage configuration
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

// Root route
app.get("/", (req, res) => {
  res.send("Backend is running. Use POST /upload to upload files.");
});

// Upload route
app.post("/upload", upload.single("file"), (req, res) => {
  console.log("POST /upload route hit");
  console.log("File received:", req.file);

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Respond to frontend immediately
  res.json({ message: "File uploaded successfully. Cleaning started...", filename: req.file.filename });

  // Run Python cleaning script asynchronously
  const pythonScript = path.join(process.cwd(), "backend", "cleaning2.py");
  console.log(`Running Python script: ${pythonScript}`);

  exec(`python "${pythonScript}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Error running cleaning2.py: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`⚠ Python stderr: ${stderr}`);
    }
    console.log(`✅ cleaning2.py Output:\n${stdout}`);
  });
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
