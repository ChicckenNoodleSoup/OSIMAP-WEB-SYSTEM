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

// Function to run Python scripts sequentially
const runPythonScripts = () => {
  const script1 = path.join(process.cwd(), "cleaning2.py");
  const script2 = path.join(process.cwd(), "export_geojson.py");

  console.log("🚀 Starting Python script execution...");
  console.log(`Step 1: Running ${script1}`);

  // Run excel_to_supabase.py first
  exec(`python "${script1}"`, (error1, stdout1, stderr1) => {
    if (error1) {
      console.error(`❌ Error running excel_to_supabase.py: ${error1.message}`);
      return;
    }
    if (stderr1) {
      console.error(`⚠️  excel_to_supabase.py stderr: ${stderr1}`);
    }
    console.log(`✅ excel_to_supabase.py completed:\n${stdout1}`);

    // Run supabase_to_geojson.py after the first script completes
    console.log(`Step 2: Running ${script2}`);
    exec(`python "${script2}"`, (error2, stdout2, stderr2) => {
      if (error2) {
        console.error(`❌ Error running supabase_to_geojson.py: ${error2.message}`);
        return;
      }
      if (stderr2) {
        console.error(`⚠️  supabase_to_geojson.py stderr: ${stderr2}`);
      }
      console.log(`✅ supabase_to_geojson.py completed:\n${stdout2}`);
      console.log("🎉 All Python scripts completed successfully!");
    });
  });
};

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
  res.json({ 
    message: "File uploaded successfully. Processing started...", 
    filename: req.file.filename 
  });

  // Run both Python scripts sequentially
  runPythonScripts();
});

// Start server
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));