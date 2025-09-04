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

// Serve static files from the data directory
app.use('/data', express.static(dataFolder));
console.log("Static files served from:", dataFolder);

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

// Function to run Python scripts sequentially (including HDBSCAN clustering)
const runPythonScripts = () => {
  const script1 = path.join(process.cwd(), "cleaning2.py");
  const script2 = path.join(process.cwd(), "export_geojson.py");
  const script3 = path.join(process.cwd(), "cluster_hdbscan.py"); // Add your HDBSCAN script

  console.log("🚀 Starting Python script execution...");
  console.log(`Step 1: Running ${script1}`);

  // Run cleaning2.py first
  exec(`python "${script1}"`, (error1, stdout1, stderr1) => {
    if (error1) {
      console.error(`❌ Error running cleaning2.py: ${error1.message}`);
      return;
    }
    if (stderr1) {
      console.error(`⚠️ cleaning2.py stderr: ${stderr1}`);
    }
    console.log(`✅ cleaning2.py completed:\n${stdout1}`);

    // Run export_geojson.py after the first script completes
    console.log(`Step 2: Running ${script2}`);
    exec(`python "${script2}"`, (error2, stdout2, stderr2) => {
      if (error2) {
        console.error(`❌ Error running export_geojson.py: ${error2.message}`);
        return;
      }
      if (stderr2) {
        console.error(`⚠️ export_geojson.py stderr: ${stderr2}`);
      }
      console.log(`✅ export_geojson.py completed:\n${stdout2}`);

      // Run HDBSCAN clustering script after GeoJSON export completes
      console.log(`Step 3: Running ${script3}`);
      exec(`python "${script3}"`, (error3, stdout3, stderr3) => {
        if (error3) {
          console.error(`❌ Error running hdbscan_clustering.py: ${error3.message}`);
          return;
        }
        if (stderr3) {
          console.error(`⚠️ hdbscan_clustering.py stderr: ${stderr3}`);
        }
        console.log(`✅ hdbscan_clustering.py completed:\n${stdout3}`);
        console.log("🎉 All Python scripts completed successfully!");
      });
    });
  });
};

// Root route
app.get("/", (req, res) => {
  res.send("Backend is running. Use POST /upload to upload files.");
});

// Route to check available data files
app.get("/data-files", (req, res) => {
  try {
    const files = fs.readdirSync(dataFolder);
    const geojsonFiles = files.filter(file => file.endsWith('.geojson'));
    res.json({ 
      message: "Available data files",
      files: geojsonFiles,
      total: geojsonFiles.length
    });
  } catch (error) {
    console.error("Error reading data folder:", error);
    res.status(500).json({ message: "Error reading data folder", error: error.message });
  }
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

  // Run all Python scripts sequentially (including clustering)
  runPythonScripts();
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Data files available at: http://localhost:${PORT}/data/`);
  console.log(`Check available files at: http://localhost:${PORT}/data-files`);
});