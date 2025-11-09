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

// Upload summary data
let uploadSummary = {
  recordsProcessed: 0,
  sheetsProcessed: [],
  fileName: null
};

// Ensure "data" folder exists
const dataFolder = path.join(process.cwd(), "data");
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder);
}

// Serve static files from the data directory
app.use('/data', express.static(dataFolder));

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fullPath = path.join(process.cwd(), "data");
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
  let totalRecords = 0;
  const validSheets = [];
  
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    
    if (sheetNames.length === 0) {
      errors.push("❌ Excel file contains no sheets - please add at least one sheet with data");
      return { valid: false, errors, recordsProcessed: 0, sheetsProcessed: [] };
    }
    
    // Validate each sheet
    sheetNames.forEach((sheetName) => {
      // 1. Check if sheet name contains a year (1900-2099)
      const yearRegex = /\b(19|20)\d{2}\b/;
      const yearMatch = sheetName.match(yearRegex);
      
      if (!yearMatch) {
        errors.push(`❌ Sheet name "${sheetName}" must include a 4-digit year (e.g., "2023", "Accidents_2024", or "Data_2025")`);
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
        // Group missing columns for better readability
        const missingBasic = missingColumns.filter(col => REQUIRED_COLUMNS.includes(col));
        const missingSeverity = missingColumns.filter(col => SEVERITY_CALC_COLUMNS.includes(col));
        
        if (missingBasic.length > 0) {
          errors.push(`❌ Sheet "${sheetName}" is missing basic columns: ${missingBasic.join(', ')}`);
        }
        if (missingSeverity.length > 0) {
          errors.push(`❌ Sheet "${sheetName}" is missing severity columns: ${missingSeverity.join(', ')}`);
        }
      }
      
      // Check if sheet has data rows
      if (jsonData.length < 2) {
        errors.push(`❌ Sheet "${sheetName}" only has column headers but no data rows`);
      } else {
        const dataRows = jsonData.length - 1; // Exclude header row
        totalRecords += dataRows;
        validSheets.push(sheetName);
      }
    });
    
    if (errors.length === 0) {
      console.log(`✅ Validation passed: ${totalRecords} records in ${validSheets.length} sheet(s)`);
      return { 
        valid: true, 
        errors: [], 
        recordsProcessed: totalRecords, 
        sheetsProcessed: validSheets 
      };
    } else {
      return { 
        valid: false, 
        errors, 
        recordsProcessed: 0, 
        sheetsProcessed: [] 
      };
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
    return { 
      valid: false, 
      errors, 
      recordsProcessed: 0, 
      sheetsProcessed: [] 
    };
  }
}

// Function to run a Python script (using spawn instead of exec)
function runSingleScript(scriptPath, onSuccess) {
  const scriptName = path.basename(scriptPath);
  const process = spawn("python", [scriptPath]);

  // Only log errors from stderr
  process.stderr.on("data", (data) => {
    const output = data.toString();
    // Only show actual errors, not warnings
    if (output.includes('ERROR') || output.includes('Traceback')) {
      console.error(`[${scriptName}] ${output}`);
    }
  });

  process.on("close", (code) => {
    if (code === 0) {
      console.log(`✅ ${scriptName} completed`);
      if (onSuccess) onSuccess();
    } else {
      console.error(`❌ ${scriptName} failed with exit code ${code}`);
      isProcessing = false;
      processingError = `Script ${scriptName} failed with exit code ${code}`;
    }
  });

  process.on("error", (error) => {
    console.error(`❌ Failed to start ${scriptName}:`, error.message);
    isProcessing = false;
    processingError = `Failed to start ${scriptName}: ${error.message}`;
  });
}


// Function to run Python scripts sequentially (including cleanup after processing)
const runPythonScripts = (shouldRunClustering = true) => {
  isProcessing = true;
  processingStartTime = new Date();
  processingError = null;
  
  const script1 = path.join(process.cwd(), "cleaning2.py");
  const script2 = path.join(process.cwd(), "export_geojson.py");
  const script3 = path.join(process.cwd(), "cluster_hdbscan.py");
  const cleanupScript = path.join(process.cwd(), "cleanup_files.py");
  const uploadScript = path.join(process.cwd(), "mobile_cluster_fetch.py");

  console.log("📊 Starting data processing pipeline...");

  runSingleScript(script1, () => {
    runSingleScript(cleanupScript, () => {
      runSingleScript(script2, () => {
        if (shouldRunClustering) {
          console.log("🔄 Running clustering on full dataset...");
          runSingleScript(script3, () => {
            runSingleScript(uploadScript, () => {
              console.log("✅ Pipeline completed successfully!");
              isProcessing = false;
            });
          });
        } else {
          console.log("✅ Pipeline completed (clustering skipped - small upload)");
          isProcessing = false;
        }
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
  const processingTime = processingStartTime ? 
    Math.floor((new Date() - processingStartTime) / 1000) : 0;
  
  const statusResponse = {
    isProcessing,
    processingTime: processingTime,
    processingStartTime: processingStartTime,
    processingError: processingError,
    status: isProcessing ? "processing" : processingError ? "error" : "idle",
    recordsProcessed: uploadSummary.recordsProcessed,
    sheetsProcessed: uploadSummary.sheetsProcessed
  };
  
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
  if (!req.file) {
    return res.status(400).json({ 
      message: "No file uploaded",
      error: "No file received"
    });
  }

  const filePath = req.file.path;
  const fileName = req.file.originalname;
  
  // Validate the Excel file structure BEFORE processing
  const validation = validateExcelFile(filePath);
  
  if (!validation.valid) {
    // Validation failed - delete the uploaded file and return errors
    console.log(`❌ Validation failed for "${fileName}"`);
    
    // Reset upload summary
    uploadSummary = {
      recordsProcessed: 0,
      sheetsProcessed: [],
      fileName: null
    };
    
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Error deleting file:", err);
    }
    
    return res.status(400).json({ 
      message: "Excel file validation failed",
      error: "File does not meet requirements",
      validationErrors: validation.errors
    });
  }
  
  // Validation passed - store summary data
  uploadSummary = {
    recordsProcessed: validation.recordsProcessed,
    sheetsProcessed: validation.sheetsProcessed,
    fileName: fileName
  };

  // Determine if we should run clustering
  const shouldRunClustering = validation.recordsProcessed >= 100;
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📁 File: ${fileName}`);
  console.log(`📊 Records: ${validation.recordsProcessed} | Sheets: ${validation.sheetsProcessed.join(', ')}`);
  console.log(`⚡ Mode: ${shouldRunClustering ? 'Full processing (with clustering)' : 'Fast mode (no clustering)'}`);
  console.log(`${'='.repeat(60)}\n`);

  // Respond to frontend
  res.json({ 
    message: "File validated successfully. Processing started...", 
    filename: req.file.filename,
    recordsProcessed: validation.recordsProcessed,
    sheetsProcessed: validation.sheetsProcessed
  });

  // Run all Python scripts sequentially
  runPythonScripts(shouldRunClustering);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 OSIMAP Backend Server`);
  console.log(`📍 Running on http://localhost:${PORT}`);
  console.log(`📂 Data folder: ${dataFolder}\n`);
});