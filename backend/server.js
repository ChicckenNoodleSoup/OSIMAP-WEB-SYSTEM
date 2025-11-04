import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import fs from "fs";
import { spawn } from "child_process";
import XLSX from "xlsx";  

const app = express();
const PORT = process.env.PORT || 5000; 

// Enable CORS
app.use(cors());
app.use(express.json());

// Global processing state
let isProcessing = false;
let processingStartTime = null;
let processingError = null;

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

// Validation constants (must match frontend and Python script)
const REQUIRED_COLUMNS = [
  'barangay',
  'lat',
  'lng',
  'datecommitted',
  'timecommitted',
  'offensetype'
];

const SEVERITY_CALC_COLUMNS = [
  'victimcount',
  'suspectcount',
  'victiminjured',
  'victimkilled',
  'victimunharmed',
  'suspectkilled'
];

const ALL_REQUIRED_COLUMNS = [...REQUIRED_COLUMNS, ...SEVERITY_CALC_COLUMNS];

// Function to validate Excel file structure
function validateExcelFile(filePath) {
  const errors = [];
  
  try {
    console.log("Validating Excel file:", filePath);
    
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    console.log("Found sheets:", sheetNames);
    
    if (sheetNames.length === 0) {
      errors.push("❌ Excel file contains no sheets - please add at least one sheet with data");
      return { valid: false, errors };
    }
    
    // Validate each sheet
    sheetNames.forEach((sheetName) => {
      // 1. Check if sheet name contains a year (1900-2099)
      const yearRegex = /\b(19|20)\d{2}\b/;
      const yearMatch = sheetName.match(yearRegex);
      
      if (!yearMatch) {
        errors.push(`❌ Sheet name "${sheetName}" must include a 4-digit year (e.g., "2023", "Accidents_2024", or "Data_2025")`);
      } else {
        console.log(`✅ Sheet "${sheetName}" contains year: ${yearMatch[0]}`);
      }
      
      // 2. Check if sheet has required columns
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (jsonData.length === 0) {
        errors.push(`❌ Sheet "${sheetName}" is completely empty - please add data to this sheet`);
        return;
      }
      
      // Get header row and normalize column names (lowercase, trim, remove spaces)
      const headers = jsonData[0] || [];
      const normalizedHeaders = headers.map(h => 
        String(h).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '')
      );
      
      console.log(`Sheet "${sheetName}" columns:`, normalizedHeaders);
      console.log(`Required columns:`, ALL_REQUIRED_COLUMNS);
      
      // Check for required columns - use exact matching
      const missingColumns = ALL_REQUIRED_COLUMNS.filter(col => {
        const normalizedCol = col.replace(/_/g, '').toLowerCase();
        
        // Check for exact match or very close match (allowing underscores/spaces)
        const found = normalizedHeaders.some(header => {
          const normalizedHeader = header.toLowerCase();
          
          // Exact match after normalization
          if (normalizedHeader === normalizedCol) return true;
          
          // Also check with underscores preserved
          const colWithUnderscore = col.toLowerCase();
          if (normalizedHeader === colWithUnderscore) return true;
          
          return false;
        });
        
        return !found;
      });
      
      if (missingColumns.length > 0) {
        console.log(`❌ Sheet "${sheetName}" missing columns:`, missingColumns);
        
        // Group missing columns for better readability
        const missingBasic = missingColumns.filter(col => REQUIRED_COLUMNS.includes(col));
        const missingSeverity = missingColumns.filter(col => SEVERITY_CALC_COLUMNS.includes(col));
        
        if (missingBasic.length > 0) {
          errors.push(`❌ Sheet "${sheetName}" is missing basic columns: ${missingBasic.join(', ')}`);
        }
        if (missingSeverity.length > 0) {
          errors.push(`❌ Sheet "${sheetName}" is missing severity columns: ${missingSeverity.join(', ')}`);
        }
      } else {
        console.log(`✅ Sheet "${sheetName}" has all required columns`);
      }
      
      // Check if sheet has data rows
      if (jsonData.length < 2) {
        errors.push(`❌ Sheet "${sheetName}" only has column headers but no data rows`);
      } else {
        console.log(`✅ Sheet "${sheetName}" has ${jsonData.length - 1} data rows`);
      }
    });
    
    if (errors.length === 0) {
      console.log("✅ Excel file validation passed");
      return { valid: true, errors: [] };
    } else {
      console.log("❌ Excel file validation failed:", errors);
      return { valid: false, errors };
    }
    
  } catch (error) {
    console.error("Error validating Excel file:", error);
    if (error.message.includes('Unsupported file')) {
      errors.push(`❌ This file appears to be corrupted or is not a valid Excel file (.xlsx or .xls)`);
    } else if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
      errors.push(`❌ File could not be found - please try uploading again`);
    } else {
      errors.push(`❌ Unable to read Excel file - it may be corrupted, password-protected, or have an invalid format`);
    }
    return { valid: false, errors };
  }
}

// Function to run a Python script (using spawn instead of exec)
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


// Function to run Python scripts sequentially (including cleanup after processing)
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


// Root route
app.get("/", (req, res) => {
  res.send("Backend is running. Use POST /upload to upload files.");
});

// Test endpoint for debugging
app.get("/test", (req, res) => {
  res.json({ 
    message: "Backend is accessible", 
    timestamp: new Date().toISOString(),
    isProcessing: isProcessing 
  });
});

// Route to check processing status
app.get("/status", (req, res) => {
  console.log("Status endpoint hit - isProcessing:", isProcessing);
  const processingTime = processingStartTime ? 
    Math.floor((new Date() - processingStartTime) / 1000) : 0;
  
  const statusResponse = {
    isProcessing,
    processingTime: processingTime,
    processingStartTime: processingStartTime,
    processingError: processingError,
    status: isProcessing ? "processing" : processingError ? "error" : "idle"
  };
  
  console.log("Status response:", statusResponse);
  res.json(statusResponse);
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

// Upload route with validation
app.post("/upload", upload.single("file"), (req, res) => {
  console.log("POST /upload route hit");
  console.log("File received:", req.file);

  if (!req.file) {
    return res.status(400).json({ 
      message: "No file uploaded",
      error: "No file received"
    });
  }

  const filePath = req.file.path;
  
  // Validate the Excel file structure BEFORE processing
  console.log("Validating Excel file structure...");
  const validation = validateExcelFile(filePath);
  
  if (!validation.valid) {
    // Validation failed - delete the uploaded file and return errors
    console.log("Validation failed, deleting uploaded file...");
    
    try {
      fs.unlinkSync(filePath);
      console.log("Uploaded file deleted");
    } catch (err) {
      console.error("Error deleting file:", err);
    }
    
    return res.status(400).json({ 
      message: "Excel file validation failed",
      error: "File does not meet requirements",
      validationErrors: validation.errors
    });
  }
  
  // Validation passed - proceed with processing
  console.log("✅ Validation passed, starting processing...");

  // Respond to frontend
  res.json({ 
    message: "File validated successfully. Processing started...", 
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