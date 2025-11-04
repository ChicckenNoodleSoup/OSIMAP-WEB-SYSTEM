import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  Plus,
  Upload,
  Database,
  Map,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import "./DateTime.css";
import "./AddRecord.css";
import "./PageHeader.css";
import { DateTime } from "./DateTime";
import { logDataEvent } from "./utils/loggingUtils";

export default function AddRecord() {
  const [uploadStatus, setUploadStatus] = useState("");
  const [processingStage, setProcessingStage] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);

  // File validation constants
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const MIN_FILE_SIZE = 1024; // 1KB
  const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
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

  const resetStatus = () => {
    setUploadStatus("");
    setProcessingStage("");
    setCurrentStep(0);
    setValidationErrors([]);
  };

  // Validate file before upload
  const validateFile = (file) => {
    const errors = [];

    // 1. Check file size
    if (file.size > MAX_FILE_SIZE) {
      errors.push(`❌ File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB) - maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    if (file.size < MIN_FILE_SIZE) {
      errors.push(`❌ File is too small (${file.size} bytes) - it may be empty or corrupted`);
    }

    // 2. Validate file name
    const fileName = file.name;
    
    // Check for null bytes or special characters that could be malicious
    if (/[\x00-\x1F\x7F<>:"|?*]/.test(fileName)) {
      errors.push('❌ File name contains invalid characters - please use only letters, numbers, dashes, and underscores');
    }

    // Check file name length
    if (fileName.length > 255) {
      errors.push('❌ File name is too long - please shorten it to 255 characters or less');
    }

    // Check for script injection attempts in filename
    if (/<script|javascript:|onerror=|onload=/i.test(fileName)) {
      errors.push('❌ File name contains potentially malicious content');
    }

    // 3. Validate file extension
    const fileExtension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(fileExtension)) {
      errors.push(`❌ Invalid file type "${fileExtension}" - only .xlsx and .xls files are allowed`);
    }

    // 4. Check for double extensions (potential security risk)
    const extensionCount = (fileName.match(/\./g) || []).length;
    if (extensionCount > 1) {
      errors.push('❌ File has multiple extensions - please use a single extension (.xlsx or .xls)');
    }

    // 5. Check if file name is suspicious (e.g., starts with dot, hidden file)
    if (fileName.startsWith('.')) {
      errors.push('❌ Hidden files (starting with ".") are not allowed');
    }

    // 6. Validate MIME type
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];

    if (!validMimeTypes.includes(file.type) && file.type !== '') {
      errors.push(`❌ File type doesn't match Excel format - make sure it's a genuine .xlsx or .xls file`);
    }

    return errors;
  };

  // Sanitize file name before upload
  const sanitizeFileName = (fileName) => {
    // Remove any path traversal attempts
    fileName = fileName.replace(/\.\./g, '');
    
    // Remove special characters except alphanumeric, dash, underscore, and period
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Ensure it doesn't start with a dot
    if (fileName.startsWith('.')) {
      fileName = 'file_' + fileName;
    }
    
    // Limit length
    if (fileName.length > 200) {
      const ext = fileName.substring(fileName.lastIndexOf('.'));
      fileName = fileName.substring(0, 200 - ext.length) + ext;
    }
    
    return fileName;
  };

  // Function to poll backend status
  const pollBackendStatus = () => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch("http://localhost:5000/status");
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const statusData = await res.json();
        
        console.log("Backend status:", statusData);
        
        if (statusData.status === "error") {
          // Processing failed
          clearInterval(pollInterval);
          setProcessingStage("error");
          setUploadStatus(`❌ Processing failed: ${statusData.processingError || "Unknown error"}`);
          // Log processing failure
          await logDataEvent.processingFailed(statusData.processingError || "Unknown error");
        } else if (!statusData.isProcessing && statusData.status === "idle") {
          // Processing is complete
          clearInterval(pollInterval);
          setProcessingStage("complete");
          setCurrentStep(4);
          setUploadStatus("✅ Pipeline completed successfully!");
          // Log processing completion
          await logDataEvent.processingCompleted();
        } else if (statusData.isProcessing) {
          // Still processing, update progress based on time
          const processingTime = statusData.processingTime || 0;
          
          if (processingTime < 3) {
            setCurrentStep(2);
            setUploadStatus("📊 Processing data through pipeline...");
          } else if (processingTime < 6) {
            setCurrentStep(3);
            setUploadStatus("🗺️ Converting to GeoJSON...");
          } else {
            setCurrentStep(3);
            setUploadStatus(`🔄 Still processing... (${processingTime}s elapsed)`);
          }
        }
      } catch (err) {
        console.error("Error polling status:", err);
        clearInterval(pollInterval);
        setProcessingStage("error");
        setUploadStatus("❌ Failed to check processing status. Please check backend server.");
        // Log polling error
        await logDataEvent.processingFailed(`Status polling failed: ${err.message}`);
      }
    }, 1000); // Poll every second

    // Clear interval after 5 minutes as fallback
    setTimeout(() => {
      clearInterval(pollInterval);
      if (processingStage === "processing") {
        setProcessingStage("error");
        setUploadStatus("❌ Processing timeout. Please try again.");
      }
    }, 300000); // 5 minutes timeout
  };

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles && rejectedFiles.length > 0) {
      const errors = [];
      rejectedFiles.forEach(({ file, errors: fileErrors }) => {
        fileErrors.forEach((error) => {
          if (error.code === 'file-too-large') {
            errors.push(`❌ "${file.name}" exceeds the maximum file size of 50MB`);
          } else if (error.code === 'file-invalid-type') {
            errors.push(`❌ "${file.name}" is not a valid Excel file - only .xlsx and .xls formats are accepted`);
          } else if (error.code === 'too-many-files') {
            errors.push('❌ Please upload only one file at a time');
          } else if (error.code === 'validation-failed') {
            errors.push(error.message);
          } else {
            errors.push(`❌ ${file.name}: ${error.message}`);
          }
        });
      });
      
      setValidationErrors(errors);
      setProcessingStage("error");
      setUploadStatus("❌ File validation failed");
      return;
    }

    if (acceptedFiles.length === 0) return;

    resetStatus();

    acceptedFiles.forEach((file) => {
      // Perform validation
      const validationErrorsList = validateFile(file);
      
      if (validationErrorsList.length > 0) {
        setValidationErrors(validationErrorsList);
        setProcessingStage("error");
        setUploadStatus("❌ File validation failed");
        logDataEvent.processingFailed(`Validation failed: ${validationErrorsList.join(', ')}`);
        return;
      }

      // Sanitize file name
      const sanitizedFileName = sanitizeFileName(file.name);
      
      // Create new file with sanitized name if needed
      let fileToUpload = file;
      if (sanitizedFileName !== file.name) {
        fileToUpload = new File([file], sanitizedFileName, { type: file.type });
        console.log(`File name sanitized: "${file.name}" → "${sanitizedFileName}"`);
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      // Add metadata for backend validation
      formData.append("metadata", JSON.stringify({
        originalName: file.name,
        sanitizedName: sanitizedFileName,
        size: file.size,
        type: file.type,
        requiredColumns: REQUIRED_COLUMNS,
        severityCalcColumns: SEVERITY_CALC_COLUMNS,
        allRequiredColumns: ALL_REQUIRED_COLUMNS,
        requireYearInSheetName: true
      }));

      setProcessingStage("uploading");
      setCurrentStep(1);
      setUploadStatus("📤 Uploading file...");

      fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      })
        .then(async (res) => {
          const data = await res.json();
          
          // Check if response is not OK (400, 500, etc.)
          if (!res.ok) {
            // Extract validation errors from response
            const backendErrors = data.validationErrors || [data.error] || [`Server error: ${res.statusText}`];
            setValidationErrors(backendErrors);
            setProcessingStage("error");
            setUploadStatus("❌ File validation failed");
            await logDataEvent.processingFailed(`Validation failed: ${backendErrors.join(', ')}`);
            return null;
          }
          
          return data;
        })
        .then(async (data) => {
          if (!data) return; // Already handled error above
          
          console.log("Backend response:", data);

          // Check if backend returned validation errors (shouldn't happen if res.ok, but safety check)
          if (data.error || data.validationErrors) {
            const backendErrors = data.validationErrors || [data.error];
            setValidationErrors(backendErrors);
            setProcessingStage("error");
            setUploadStatus("❌ Data validation failed");
            await logDataEvent.processingFailed(`Backend validation failed: ${backendErrors.join(', ')}`);
            return;
          }

          // Log file upload
          await logDataEvent.fileUploaded(fileToUpload.name);

          setProcessingStage("processing");
          setCurrentStep(2);
          setUploadStatus("📊 Processing data through pipeline...");

          // Log processing start
          await logDataEvent.processingStarted();

          // Start polling backend status
          pollBackendStatus();
        })
        .catch(async (err) => {
          console.error(err);
          setProcessingStage("error");
          setUploadStatus("❌ Upload failed");
          
          // Parse error message
          let errorMsg = err.message || "Unknown error";
          if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
            setValidationErrors(['❌ Cannot connect to server - please ensure the backend is running']);
          } else if (errorMsg.includes('timeout')) {
            setValidationErrors(['❌ Upload timed out - the server took too long to respond']);
          } else {
            setValidationErrors([`❌ ${errorMsg}`]);
          }
          
          // Log upload failure
          await logDataEvent.processingFailed(`Upload failed: ${err.message}`);
        });
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    disabled: processingStage === "uploading" || processingStage === "processing",
    validator: (file) => {
      // Additional custom validation
      const errors = validateFile(file);
      if (errors.length > 0) {
        return {
          code: "validation-failed",
          message: errors.join('; ')
        };
      }
      return null;
    }
  });

  const ProcessingSteps = () => {
    const steps = [
      { id: 1, label: "Upload File", icon: Upload },
      { id: 2, label: "Excel → Supabase", icon: Database },
      { id: 3, label: "Supabase → GeoJSON", icon: Map },
      { id: 4, label: "Complete", icon: CheckCircle },
    ];

    return (
      <div className="processing-steps">
        <div className="processing-steps-row">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isError = processingStage === "error" && currentStep === step.id;

            return (
              <div key={step.id} className="processing-step">
                <div className="step-icon-wrapper">
                  <div
                    className={`step-circle 
                      ${isError ? "error" : ""} 
                      ${isCompleted ? "completed" : ""} 
                      ${isActive ? "active" : ""}`}
                  >
                    {isError ? (
                      <AlertCircle className="icon error" />
                    ) : (
                      <Icon
                        className={`icon 
                          ${isCompleted ? "completed" : ""} 
                          ${isActive ? "active" : ""}`}
                      />
                    )}
                  </div>
                  <span
                    className={`step-label 
                      ${isError ? "error" : ""} 
                      ${isCompleted ? "completed" : ""} 
                      ${isActive ? "active" : ""}`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`step-connector ${
                      currentStep > step.id ? "completed" : ""
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard addrecord-page-wrapper">
      <div className="addrecord-page-content">
        <div className="page-header">
          <div className="page-title-container">
            <img src="stopLight.svg" alt="Logo" className="page-logo" />
            <h1 className="page-title">Add Record</h1>

            <button type="button" className="addrec-info-btn" aria-label="Dashboard Info">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" />
                <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontFamily="Poppins, sans-serif">i</text>
              </svg>
            </button>

            <div className="addrec-edit-instructions" role="status">
              <strong>💡 How to Add Records</strong>
              <div>• Drag and drop your Excel file or click to browse.</div>
              <div>• Supported formats: <code>.xlsx</code> and <code>.xls</code> (max 50MB).</div>
              <div>• Required columns: barangay, lat, lng, datecommitted, timecommitted, offensetype, victimcount, suspectcount, victiminjured, victimkilled, victimunharmed, suspectkilled.</div>
              <div>• Sheet names must contain a year (e.g., "2023", "Accidents_2024").</div>
              <div>• The system will validate, upload, process, and convert data into GeoJSON.</div>
              <div>• Follow the progress steps below — each icon shows the current stage.</div>
              <div>• When complete, your new data will be reflected on the map and current records.</div>
            </div>
          </div>

          <DateTime />
        </div>

      {/* Content Card Wrapper */}
      <div className="add-record-card">
        
        {/* Always show steppers */}
        <ProcessingSteps />

        {/* Upload Card */}
        <div
          {...getRootProps()}
          className={`upload-card 
            ${processingStage === "uploading" || processingStage === "processing"
              ? "uploading"
              : processingStage === "complete"
              ? "complete"
              : processingStage === "error"
              ? "error"
              : isDragReject
              ? "reject"
              : isDragActive
              ? "active"
              : ""}`}
        >
          <input {...getInputProps()} />

          {/* Big Icon */}
          <div className="upload-icon">
            {processingStage === "uploading" || processingStage === "processing" ? (
              <div className="spinner" />
            ) : processingStage === "complete" ? (
              <CheckCircle className="icon complete" />
            ) : processingStage === "error" ? (
              <AlertCircle className="icon error" />
            ) : (
              <Plus className={`icon ${isDragActive ? "active" : ""}`} />
            )}
          </div>

          {/* Instructions / Dynamic Text */}
          <div className="upload-text">
            {processingStage === "uploading" || processingStage === "processing" ? (
              <>
                <p className="title processing">Processing...</p>
                <p className="subtitle processing">Please wait while we handle your file</p>
              </>
            ) : processingStage === "complete" ? (
              <>
                <p className="title complete">Upload Successful!</p>
                <p className="subtitle complete">Ready for your next upload</p>
              </>
            ) : processingStage === "error" ? (
              <>
                <p className="title error">{validationErrors.length > 0 ? 'Validation Failed' : 'Upload Failed'}</p>
                <p className="subtitle error">
                  {validationErrors.length > 0 
                    ? 'Please review the errors below and fix your file' 
                    : 'Please try again or check your file format'}
                </p>
              </>
            ) : isDragReject ? (
              <>
                <p className="title error">Invalid File Type</p>
                <p className="subtitle error">Please upload only Excel files (.xlsx, .xls)</p>
              </>
            ) : isDragActive ? (
              <>
                <p className="title active">Drop your file here</p>
                <p className="subtitle active">Release to upload</p>
              </>
            ) : (
              <>
                <p className="title">Drag & Drop your Excel file</p>
                <p className="subtitle">
                  or <span className="highlight">choose a file</span> to upload
                </p>
                <p className="note">Supported formats: .xlsx, .xls</p>
              </>
            )}
          </div>

          {/* Upload Status - only show if no validation errors */}
          {uploadStatus && validationErrors.length === 0 && (
            <div className="upload-status">
              {(processingStage === "uploading" || processingStage === "processing") && (
                <div className="spinner small" />
              )}
              <p className={`status-text ${processingStage}`}>{uploadStatus}</p>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="validation-errors">
              <ul className="error-list">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
              <div className="error-actions">
                <p>💡 <strong>What to do:</strong> Please fix the issues above and try uploading again.</p>
              </div>
            </div>
          )}
        </div>

        {/* Reset button */}
        {(processingStage === "complete" || processingStage === "error") && (
          <div className="reset-btn-wrapper">
            <button onClick={resetStatus} className="reset-btn">
              Upload Another File
            </button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}