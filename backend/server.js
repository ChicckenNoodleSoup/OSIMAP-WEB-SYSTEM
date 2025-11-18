import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";
import fs from "fs";
import { spawn } from "child_process";
import XLSX from "xlsx";
import NodeCache from "node-cache";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Task Queue System
let taskQueue = []; // Queue of pending tasks
let currentTask = null; // Currently executing task
let processingStartTime = null;
let processingError = null;

// Global upload summary data (for backward compatibility during processing)
let uploadSummary = {
  recordsProcessed: 0,
  sheetsProcessed: [],
  fileName: null,
  newRecords: 0,
  duplicateRecords: 0
};

// Track actual new records inserted (not duplicates)
let actualNewRecords = 0;
let actualDuplicates = 0;

// Completed tasks storage (keep last 10 for status queries)
let completedTasks = [];

// Track running Python processes for cancellation
let currentProcesses = [];

// Ensure "data" folder exists
const dataFolder = path.join(process.cwd(), "data");
if (!fs.existsSync(dataFolder)) {
  fs.mkdirSync(dataFolder);
}

// OPTIMIZATION: Backend caching for frequently accessed data
// Cache with 5-minute TTL, check for expired entries every 60 seconds
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60 // Check for expired entries every minute
});

// OPTIMIZATION: Cached GeoJSON endpoint for MapView (must be BEFORE static middleware)
// Cache the entire GeoJSON file to reduce disk I/O for MapView
app.get('/data/accidents_clustered.geojson', (req, res) => {
  const cacheKey = 'geojson_clustered';
  const cached = cache.get(cacheKey);
  
  if (cached) {
    return res.json(cached);
  }
  
  try {
    const geojsonPath = path.join(dataFolder, 'accidents_clustered.geojson');
    
    if (!fs.existsSync(geojsonPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    
    // Cache for 5 minutes
    cache.set(cacheKey, data, 300);
    
    res.json(data);
  } catch (error) {
    console.error('Error reading GeoJSON:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
});

// Serve static files from the data directory (other files like accidents.geojson)
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

// Function to validate CSV file structure
function validateCSVFile(filePath) {
  const errors = [];
  let totalRecords = 0;
  const validSheets = [];
  
  try {
    // Read CSV file using XLSX library
    const workbook = XLSX.readFile(filePath, { type: 'file' });
    
    // CSV files are typically imported as a single sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length === 0) {
      errors.push("❌ CSV file is completely empty - please add data to this file");
      return { valid: false, errors, recordsProcessed: 0, sheetsProcessed: [] };
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
        errors.push(`❌ CSV file is missing basic columns: ${missingBasic.join(', ')}`);
      }
      if (missingSeverity.length > 0) {
        errors.push(`❌ CSV file is missing severity columns: ${missingSeverity.join(', ')}`);
      }
    }
    
    // Check if CSV has data rows
    if (jsonData.length < 2) {
      errors.push(`❌ CSV file only has column headers but no data rows`);
    } else {
      const dataRows = jsonData.length - 1; // Exclude header row
      totalRecords += dataRows;
      validSheets.push('CSV_Data'); // Use generic name for CSV
    }
    
    if (errors.length === 0) {
      console.log(`✅ CSV Validation passed: ${totalRecords} records`);
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
    console.error("Error validating CSV file:", error);
    if (error.message.includes('Unsupported file')) {
      errors.push(`❌ This file appears to be corrupted or is not a valid CSV file`);
    } else if (error.message.includes('ENOENT') || error.message.includes('no such file')) {
      errors.push(`❌ File could not be found - please try uploading again`);
    } else {
      errors.push(`❌ Unable to read CSV file - it may be corrupted or have an invalid format`);
    }
    return { 
      valid: false, 
      errors, 
      recordsProcessed: 0, 
      sheetsProcessed: [] 
    };
  }
}

// Function to validate Excel file structure
function validateExcelFile(filePath, requireYearInSheetName = true) {
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
      // 1. Check if sheet name contains a year (1900-2099) - only if required
      if (requireYearInSheetName) {
        const yearRegex = /\b(19|20)\d{2}\b/;
        const yearMatch = sheetName.match(yearRegex);
        
        if (!yearMatch) {
          errors.push(`❌ Sheet name "${sheetName}" must include a 4-digit year (e.g., "2023", "Accidents_2024", or "Data_2025")`);
        }
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
  
  // Track this process for potential cancellation
  currentProcesses.push(process);

  // Capture stdout to parse upsert summary
  process.stdout.on("data", (data) => {
    const output = data.toString();
    
    // Parse ALL summary markers in this output chunk (don't return early)
    let shouldSkipDisplay = false;
    
    if (output.includes('[SUMMARY]INSERTED:')) {
      const match = output.match(/\[SUMMARY\]INSERTED:(\d+)/);
      if (match) {
        actualNewRecords = parseInt(match[1]);
        uploadSummary.newRecords = actualNewRecords;
      }
      shouldSkipDisplay = true;
    }
    
    if (output.includes('[SUMMARY]DUPLICATES:')) {
      const match = output.match(/\[SUMMARY\]DUPLICATES:(\d+)/);
      if (match) {
        actualDuplicates = parseInt(match[1]);
        uploadSummary.duplicateRecords = actualDuplicates;
      }
      shouldSkipDisplay = true;
    }
    
    // Skip display if this was a summary marker line
    if (shouldSkipDisplay) {
      return;
    }
    
    // Show important output lines (checkmark or "Upsert complete" prefixed lines)
    const trimmed = output.trim();
    if (trimmed.startsWith('✅') || trimmed.includes('Upsert complete:')) {
      console.log(trimmed);
    }
  });

  // Only log errors from stderr
  process.stderr.on("data", (data) => {
    const output = data.toString();
    // Only show actual errors, not warnings or info
    if (output.includes('ERROR') || output.includes('Traceback') || output.includes('Error:')) {
      console.error(`[${scriptName}] ${output}`);
    }
  });

  process.on("close", (code, signal) => {
    // Remove from tracking array
    const index = currentProcesses.indexOf(process);
    if (index > -1) {
      currentProcesses.splice(index, 1);
    }
    
    if (signal === 'SIGTERM' || signal === 'SIGKILL') {
      console.log(`🛑 ${scriptName} was cancelled`);
      processingError = 'Task cancelled by user';
      completeCurrentTask(false, processingError);
    } else if (code === 0) {
      console.log(`✅ ${scriptName} completed`);
      if (onSuccess) onSuccess();
    } else {
      console.error(`❌ ${scriptName} failed with exit code ${code}`);
      processingError = `Script ${scriptName} failed with exit code ${code}`;
      completeCurrentTask(false, processingError);
    }
  });

  process.on("error", (error) => {
    console.error(`❌ Failed to start ${scriptName}:`, error.message);
    processingError = `Failed to start ${scriptName}: ${error.message}`;
    completeCurrentTask(false, processingError);
  });
}

// Task Queue Processor - processes one task at a time
const processQueue = () => {
  // If already processing or queue is empty, do nothing
  if (currentTask || taskQueue.length === 0) {
    return;
  }

  // Get next task from queue
  currentTask = taskQueue.shift();
  processingStartTime = new Date();
  processingError = null;
  currentTask.status = 'processing';

  console.log(`\n📋 Processing task from queue: ${currentTask.type} (${taskQueue.length} remaining in queue)`);

  // Execute the task
  currentTask.execute();
};

// Complete current task and process next
const completeCurrentTask = (success = true, errorMessage = null) => {
  if (!currentTask) return;
  
  console.log(`✅ Task completed: ${currentTask.type}`);
  
  // OPTIMIZATION: Clear cache when clustering completes (data is now stale)
  if (success && (currentTask.type === 'clustering' || currentTask.type === 'upload')) {
    // Clear GeoJSON cache (new data generated)
    cache.del('geojson_clustered');
    
    // Clear all cluster count caches (they're now stale)
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.startsWith('cluster_count_')) {
        cache.del(key);
      }
    });
    
    console.log('🔄 Cache invalidated after ' + currentTask.type);
  }
  
  // Calculate final processing time
  const finalProcessingTime = processingStartTime ? 
    Math.floor((new Date() - processingStartTime) / 1000) : 0;
  
  // Save task completion data
  const completedTask = {
    ...currentTask,
    status: success ? 'completed' : 'failed',
    completedAt: new Date().toISOString(),
    processingTime: finalProcessingTime,
    errorMessage: errorMessage
  };
  
  // For upload tasks, save the summary data
  if (currentTask.type === 'upload') {
    completedTask.recordsProcessed = uploadSummary.recordsProcessed;
    completedTask.sheetsProcessed = uploadSummary.sheetsProcessed;
    completedTask.newRecords = uploadSummary.newRecords;
    completedTask.duplicateRecords = uploadSummary.duplicateRecords;
  }
  
  // Add to completed tasks (keep last 10)
  completedTasks.unshift(completedTask);
  if (completedTasks.length > 10) {
    completedTasks = completedTasks.slice(0, 10);
  }
  
  // Reset current task and processing state
  currentTask = null;
  processingStartTime = null;
  processingError = null;
  
  // Process next task in queue
  setTimeout(processQueue, 500); // Small delay before next task
};

// Function to run file upload pipeline
const runUploadPipeline = () => {
  actualNewRecords = 0; // Reset counter
  
  const script1 = path.join(process.cwd(), "cleaning2.py");
  const script2 = path.join(process.cwd(), "export_geojson.py");
  const script3 = path.join(process.cwd(), "cluster_hdbscan.py");
  const cleanupScript = path.join(process.cwd(), "cleanup_files.py");
  const uploadScript = path.join(process.cwd(), "mobile_cluster_fetch.py");

  console.log("📊 Starting file upload pipeline...");

  // Step 1: Upload to Supabase and track NEW records
  runSingleScript(script1, () => {
    runSingleScript(cleanupScript, () => {
      runSingleScript(script2, () => {
        // SMART DECISION: Only run clustering if we have 100+ NEW records
        const shouldRunClustering = actualNewRecords >= 100;
        
        if (shouldRunClustering) {
          console.log(`🔄 Running clustering (${actualNewRecords} new records warrant re-clustering)...`);
          runSingleScript(script3, () => {
            runSingleScript(uploadScript, () => {
              console.log("✅ Upload pipeline completed!");
              completeCurrentTask();
            });
          });
        } else {
          console.log(`⚡ Clustering skipped (only ${actualNewRecords} new records, threshold: 100)`);
          console.log("✅ Upload pipeline completed!");
          completeCurrentTask();
        }
      });
    });
  });
};

// Function to run clustering pipeline
const runClusteringPipeline = () => {
  const script2 = path.join(process.cwd(), "export_geojson.py");
  const script3 = path.join(process.cwd(), "cluster_hdbscan.py");
  const uploadScript = path.join(process.cwd(), "mobile_cluster_fetch.py");
  
  console.log("📊 Starting clustering pipeline...");
  
  // Step 1: Export fresh data from Supabase
  runSingleScript(script2, () => {
    // Step 2: Run clustering
    runSingleScript(script3, () => {
      // Step 3: Upload cluster results
      runSingleScript(uploadScript, () => {
        console.log("✅ Clustering pipeline completed!");
        completeCurrentTask();
      });
    });
  });
};

// ============================================================================
// EMAIL SUPPORT ROUTES (from second server)
// ============================================================================

// Support email endpoint
app.post('/api/send-support-email', async (req, res) => {
  const { name, email, message, to } = req.body;

  try {
    // Create transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to, // osimapdatabase@gmail.com
      replyTo: email, // User's email for replies
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

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending support email:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// ============================================================================
// ORIGINAL ROUTES (from first server)
// ============================================================================

// Root route
app.get("/", (req, res) => {
  res.send("Backend is running. Use POST /upload to upload files.");
});

// Test endpoint for debugging
app.get("/test", (req, res) => {
  res.json({ 
    message: "Backend is accessible", 
    timestamp: new Date().toISOString(),
    isProcessing: currentTask !== null,
    queueLength: taskQueue.length
  });
});

// Route to check processing status with task-specific information
app.get("/status", (req, res) => {
  const { taskId } = req.query;
  
  // If taskId is provided, return status for that specific task
  if (taskId) {
    // Check if it's the current task
    if (currentTask?.id === taskId) {
      const processingTime = processingStartTime ? 
        Math.floor((new Date() - processingStartTime) / 1000) : 0;
      
      return res.json({
        isProcessing: true,
        processingTime: processingTime,
        status: 'processing',
        taskId: currentTask.id,
        taskType: currentTask.type,
        queuePosition: 0,
        recordsProcessed: currentTask.type === 'upload' ? uploadSummary.recordsProcessed : undefined,
        sheetsProcessed: currentTask.type === 'upload' ? uploadSummary.sheetsProcessed : undefined,
        newRecords: currentTask.type === 'upload' ? uploadSummary.newRecords : undefined,
        duplicateRecords: currentTask.type === 'upload' ? uploadSummary.duplicateRecords : undefined,
        processingError: processingError
      });
    }
    
    // Check if it's in the queue
    const queuedTask = taskQueue.find(t => t.id === taskId);
    if (queuedTask) {
      return res.json({
        isProcessing: false,
        processingTime: 0,
        status: 'queued',
        taskId: queuedTask.id,
        taskType: queuedTask.type,
        queuePosition: taskQueue.findIndex(t => t.id === taskId) + 1
      });
    }
    
    // Check if it's completed
    const completedTask = completedTasks.find(t => t.id === taskId);
    if (completedTask) {
      return res.json({
        isProcessing: false,
        processingTime: completedTask.processingTime,
        status: completedTask.status === 'completed' ? 'idle' : 'error',
        taskId: completedTask.id,
        taskType: completedTask.type,
        queuePosition: 0,
        recordsProcessed: completedTask.recordsProcessed,
        sheetsProcessed: completedTask.sheetsProcessed,
        newRecords: completedTask.newRecords,
        duplicateRecords: completedTask.duplicateRecords,
        processingError: completedTask.errorMessage
      });
    }
    
    // Task not found
    return res.json({
      isProcessing: false,
      status: "idle",
      taskId: taskId
    });
  }
  
  // General status - backward compatibility
  const processingTime = processingStartTime ? 
    Math.floor((new Date() - processingStartTime) / 1000) : 0;
  
  const statusResponse = {
    isProcessing: currentTask !== null,
    processingTime: processingTime,
    processingStartTime: processingStartTime,
    processingError: processingError,
    status: currentTask ? "processing" : processingError ? "error" : "idle",
    currentTask: currentTask ? { id: currentTask.id, type: currentTask.type } : null,
    queueLength: taskQueue.length,
    recordsProcessed: uploadSummary.recordsProcessed,
    sheetsProcessed: uploadSummary.sheetsProcessed,
    newRecords: uploadSummary.newRecords,
    duplicateRecords: uploadSummary.duplicateRecords
  };
  
  res.json(statusResponse);
});

// Route to cancel ongoing upload/processing
app.post("/cancel", (req, res) => {
  if (!currentTask) {
    return res.status(400).json({ 
      message: "No task is currently being processed",
      error: "NOTHING_TO_CANCEL"
    });
  }

  console.log('🛑 Cancellation requested - terminating all Python processes...');
  
  // Kill all running Python processes
  currentProcesses.forEach((proc) => {
    try {
      proc.kill('SIGTERM'); // Graceful termination
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL'); // Force kill if still running
        }
      }, 2000);
    } catch (error) {
      console.error('Error killing process:', error);
    }
  });
  
  // Clear process array
  currentProcesses = [];
  
  // Clear queue
  taskQueue = [];
  
  // Reset processing state
  currentTask = null;
  processingError = 'Task cancelled by user';
  processingStartTime = null;
  
  res.json({ 
    message: "Task cancelled successfully",
    success: true
  });
});

// Route to manually trigger clustering
app.post("/run-clustering", (req, res) => {
  console.log('🔄 Manual clustering requested...');
  
  // Create clustering task
  const taskId = Date.now().toString();
  const clusteringTask = {
    id: taskId,
    type: 'clustering',
    status: 'queued',
    execute: runClusteringPipeline
  };
  
  // Add to queue
  taskQueue.push(clusteringTask);
  
  const queuePosition = taskQueue.length;
  const message = queuePosition === 1 && !currentTask
    ? "Clustering started successfully."
    : `Clustering queued. Position in queue: ${queuePosition}`;
  
  // Respond to frontend immediately
  res.json({ 
    message: message,
    success: true,
    taskId: taskId,
    queuePosition: queuePosition
  });
  
  // Start processing queue
  processQueue();
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

// OPTIMIZATION: Lightweight endpoint for cluster count by year
// Returns only the count, not the entire GeoJSON file (much faster for Dashboard)
app.get('/api/clusters/count', (req, res) => {
  const year = req.query.year;
  
  if (!year) {
    return res.status(400).json({ error: 'Year parameter is required' });
  }

  // Cache key includes year for per-year caching
  const cacheKey = `cluster_count_${year}`;
  const cached = cache.get(cacheKey);
  
  if (cached !== undefined) {
    return res.json({ year: parseInt(year), clusterCount: cached });
  }

  try {
    const geojsonPath = path.join(dataFolder, 'accidents_clustered.geojson');
    
    if (!fs.existsSync(geojsonPath)) {
      return res.status(404).json({ error: 'GeoJSON file not found' });
    }

    // Read and parse GeoJSON file
    const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
    
    if (!geojsonData.features) {
      return res.json({ year: parseInt(year), clusterCount: 0 });
    }

    // Filter accidents by year (exclude cluster centers)
    const accidents = geojsonData.features.filter(f =>
      f.properties &&
      f.geometry &&
      f.geometry.coordinates &&
      f.properties.type !== "cluster_center" &&
      String(f.properties.year) === String(year)
    );

    // Get unique cluster IDs from accidents (excluding noise -1)
    const uniqueClusterIds = new Set(
      accidents
        .map(f => f.properties.cluster)
        .filter(cluster => cluster !== null && cluster !== undefined && cluster !== -1)
    );

    const clusterCount = uniqueClusterIds.size;

    // Cache the result for 5 minutes
    cache.set(cacheKey, clusterCount, 300);

    res.json({ year: parseInt(year), clusterCount });
  } catch (error) {
    console.error('Error calculating cluster count:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
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
  const fileExtension = path.extname(fileName).toLowerCase();
  
  // Parse metadata if provided
  let metadata = {};
  try {
    if (req.body.metadata) {
      metadata = JSON.parse(req.body.metadata);
    }
  } catch (err) {
    console.warn("Could not parse metadata:", err);
  }
  
  // Validate the file structure BEFORE processing (CSV or Excel)
  let validation;
  if (fileExtension === '.csv') {
    validation = validateCSVFile(filePath);
  } else {
    // Pass requireYearInSheetName from metadata (defaults to true for backward compatibility)
    const requireYear = metadata.requireYearInSheetName !== undefined ? metadata.requireYearInSheetName : true;
    validation = validateExcelFile(filePath, requireYear);
  }
  
  if (!validation.valid) {
    // Validation failed - delete the uploaded file and return errors
    console.log(`❌ Validation failed for "${fileName}"`);
    
    // Reset upload summary
    uploadSummary = {
      recordsProcessed: 0,
      sheetsProcessed: [],
      fileName: null,
      newRecords: 0,
      duplicateRecords: 0
    };
    
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Error deleting file:", err);
    }
    
    return res.status(400).json({ 
      message: "File validation failed",
      error: "File does not meet requirements",
      validationErrors: validation.errors
    });
  }
  
  // Validation passed - store summary data
  uploadSummary = {
    recordsProcessed: validation.recordsProcessed,
    sheetsProcessed: validation.sheetsProcessed,
    fileName: fileName,
    newRecords: 0,
    duplicateRecords: 0
  };
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📁 File: ${fileName}`);
  console.log(`📊 Total records: ${validation.recordsProcessed} | Sheets: ${validation.sheetsProcessed.join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);

  // Create upload task
  const taskId = Date.now().toString();
  const uploadTask = {
    id: taskId,
    type: 'upload',
    status: 'queued',
    fileName: fileName,
    execute: runUploadPipeline
  };
  
  // Add to queue
  taskQueue.push(uploadTask);
  
  const queuePosition = taskQueue.length;
  const queueMessage = queuePosition === 1 && !currentTask
    ? "Processing started..."
    : ` Queued at position ${queuePosition}`;

  // Respond to frontend
  res.json({ 
    message: "File validated successfully." + queueMessage, 
    filename: req.file.filename,
    recordsProcessed: validation.recordsProcessed,
    sheetsProcessed: validation.sheetsProcessed,
    taskId: taskId,
    queuePosition: queuePosition
  });

  // Start processing queue
  processQueue();
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 OSIMAP Backend Server`);
  console.log(`📍 Running on http://localhost:${PORT}`);
  console.log(`📂 Data folder: ${dataFolder}`);
  console.log(`📧 Email support: ${process.env.EMAIL_USER ? 'Enabled' : 'Disabled (configure .env)'}\n`);
});