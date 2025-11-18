import React, { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import {
  Plus,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import "./DateTime.css";
import "./AddRecord.css";
import "./PageHeader.css";
import { DateTime } from "./DateTime";
import { uploadHistoryService } from "./utils/loggingUtils";
import { useUpload } from "./contexts/UploadContext";
import ProcessingSteps from "./components/add-record/ProcessingSteps";
import UploadSummary from "./components/add-record/UploadSummary";
import UploadHistoryModal from "./components/add-record/UploadHistoryModal";

export default function AddRecord() {
  const { startUpload, activeUploads, lastCompletedUpload, clearLastCompleted } = useUpload();
  const [uploadStatus, setUploadStatus] = useState("");
  const [processingStage, setProcessingStage] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [validationErrors, setValidationErrors] = useState([]);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [currentUploadSummary, setCurrentUploadSummary] = useState(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Load upload history from Supabase on component mount
  useEffect(() => {
    const loadUploadHistory = async () => {
      setIsLoadingHistory(true);
      const history = await uploadHistoryService.fetch(10);
      setUploadHistory(history);
      setIsLoadingHistory(false);
    };
    loadUploadHistory();
  }, []);

  // Sync local state with global upload context (restore state when returning to page)
  useEffect(() => {
    // Filter out clustering tasks - only show file uploads on this page
    const fileUploads = activeUploads.filter(u => u.type !== 'clustering');
    const latestUpload = fileUploads[fileUploads.length - 1];
    
    if (!latestUpload) {
      return;
    }

    // Restore UI state based on active upload
    if (latestUpload.status === 'processing') {
      setProcessingStage("processing");
      setCurrentStep(latestUpload.processingTime < 3 ? 2 : 3);
      setUploadStatus(
        latestUpload.processingTime < 3 
          ? "📊 Processing data through pipeline... (You can navigate away)"
          : `🔄 Still processing... (${latestUpload.processingTime}s elapsed)`
      );
      setCurrentUploadSummary({
        id: latestUpload.id,
        fileName: latestUpload.fileName,
        fileSize: latestUpload.fileSize,
        uploadedAt: latestUpload.uploadedAt,
        status: 'processing',
        processingTime: latestUpload.processingTime
      });
    } else if (latestUpload.status === 'success') {
      setProcessingStage("complete");
      setCurrentStep(4);
      setUploadStatus("✅ Pipeline completed successfully!");
      
      setCurrentUploadSummary({
        id: latestUpload.id,
        fileName: latestUpload.fileName,
        fileSize: latestUpload.fileSize,
        uploadedAt: latestUpload.uploadedAt,
        completedAt: latestUpload.completedAt,
        processingTime: latestUpload.processingTime,
        recordsProcessed: latestUpload.recordsProcessed,
        sheetsProcessed: latestUpload.sheetsProcessed,
        newRecords: latestUpload.newRecords,
        duplicateRecords: latestUpload.duplicateRecords,
        status: 'success'
      });
    } else if (latestUpload.status === 'failed') {
      setProcessingStage("error");
      setCurrentStep(2);
      setUploadStatus(`❌ Processing failed: ${latestUpload.errorMessage || "Unknown error"}`);
      setCurrentUploadSummary({
        id: latestUpload.id,
        fileName: latestUpload.fileName,
        fileSize: latestUpload.fileSize,
        uploadedAt: latestUpload.uploadedAt,
        completedAt: latestUpload.completedAt,
        status: 'failed',
        errorMessage: latestUpload.errorMessage
      });
    }
  }, [activeUploads]);

  // Reload history when upload completes (only for file uploads, not clustering)
  useEffect(() => {
    const hasCompleted = activeUploads.some(u => 
      u.type !== 'clustering' && (u.status === 'success' || u.status === 'failed')
    );
    if (hasCompleted) {
      // Delay to ensure Supabase has the data
      const timer = setTimeout(async () => {
        const history = await uploadHistoryService.fetch(10);
        setUploadHistory(history);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [activeUploads]);

  // Show lastCompletedUpload summary even if it's been removed from activeUploads
  // BUT only for file uploads, not clustering tasks
  useEffect(() => {
    if (lastCompletedUpload && !currentUploadSummary && lastCompletedUpload.type !== 'clustering') {
      // Show the completed upload summary
      if (lastCompletedUpload.status === 'success') {
        setProcessingStage("complete");
        setCurrentStep(4);
        setUploadStatus("✅ Pipeline completed successfully!");
        setCurrentUploadSummary({
          id: lastCompletedUpload.id,
          fileName: lastCompletedUpload.fileName,
          fileSize: lastCompletedUpload.fileSize,
          uploadedAt: lastCompletedUpload.uploadedAt,
          completedAt: lastCompletedUpload.completedAt,
          processingTime: lastCompletedUpload.processingTime,
          recordsProcessed: lastCompletedUpload.recordsProcessed,
          sheetsProcessed: lastCompletedUpload.sheetsProcessed,
          status: 'success'
        });
        // Reload history
        uploadHistoryService.fetch(10).then(history => {
          setUploadHistory(history);
        });
      } else if (lastCompletedUpload.status === 'failed') {
        setProcessingStage("error");
        setCurrentStep(2);
        setUploadStatus(`❌ Processing failed: ${lastCompletedUpload.errorMessage || "Unknown error"}`);
        setCurrentUploadSummary({
          id: lastCompletedUpload.id,
          fileName: lastCompletedUpload.fileName,
          fileSize: lastCompletedUpload.fileSize,
          uploadedAt: lastCompletedUpload.uploadedAt,
          completedAt: lastCompletedUpload.completedAt,
          status: 'failed',
          errorMessage: lastCompletedUpload.errorMessage
        });
      }
    }
  }, [lastCompletedUpload, currentUploadSummary]);

  // File validation constants
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const MIN_FILE_SIZE = 50; // 50 bytes (just to catch empty files)
  const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];
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
    setCurrentUploadSummary(null);
    clearLastCompleted(); // Clear the global last completed upload
  };

  const handleClearHistory = async () => {
    if (window.confirm('Are you sure you want to clear the upload history?')) {
      const success = await uploadHistoryService.clear();
      if (success) {
        setUploadHistory([]);
      } else {
        alert('Failed to clear history. Please try again.');
      }
    }
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
      errors.push(`❌ Invalid file type "${fileExtension}" - only .xlsx, .xls, and .csv files are allowed`);
    }

    // 4. Check for double extensions (potential security risk)
    const extensionCount = (fileName.match(/\./g) || []).length;
    if (extensionCount > 1) {
      errors.push('❌ File has multiple extensions - please use a single extension (.xlsx, .xls, or .csv)');
    }

    // 5. Check if file name is suspicious (e.g., starts with dot, hidden file)
    if (fileName.startsWith('.')) {
      errors.push('❌ Hidden files (starting with ".") are not allowed');
    }

    // 6. Validate MIME type
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv', // .csv (alternative)
    ];

    if (!validMimeTypes.includes(file.type) && file.type !== '') {
      errors.push(`❌ File type doesn't match Excel or CSV format - make sure it's a genuine .xlsx, .xls, or .csv file`);
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

  // Removed pollBackendStatus - now handled by UploadContext globally

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles && rejectedFiles.length > 0) {
      const errors = [];
      rejectedFiles.forEach(({ file, errors: fileErrors }) => {
        fileErrors.forEach((error) => {
          if (error.code === 'file-too-large') {
            errors.push(`❌ "${file.name}" exceeds the maximum file size of 50MB`);
          } else if (error.code === 'file-invalid-type') {
            errors.push(`❌ "${file.name}" is not a valid file - only .xlsx, .xls, and .csv formats are accepted`);
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
        
        // Show validation errors (no history save for client-side validation failures)
        return;
      }

      // Sanitize file name
      const sanitizedFileName = sanitizeFileName(file.name);
      
      // Create new file with sanitized name if needed
      let fileToUpload = file;
      if (sanitizedFileName !== file.name) {
        fileToUpload = new File([file], sanitizedFileName, { type: file.type });
      }

      const formData = new FormData();
      formData.append("file", fileToUpload);

      // Determine if this is a CSV file
      const isCSV = fileToUpload.name.toLowerCase().endsWith('.csv');

      // Add metadata for backend validation
      formData.append("metadata", JSON.stringify({
        originalName: file.name,
        sanitizedName: sanitizedFileName,
        size: file.size,
        type: file.type,
        requiredColumns: REQUIRED_COLUMNS,
        severityCalcColumns: SEVERITY_CALC_COLUMNS,
        allRequiredColumns: ALL_REQUIRED_COLUMNS,
        requireYearInSheetName: !isCSV, // Only require year in sheet name for Excel files
        isCSV: isCSV
      }));

      setProcessingStage("uploading");
      setCurrentStep(1);
      setUploadStatus("📤 Uploading file...");

      fetch("https://osimap-web-system.onrender.com/upload", {
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
            
            // Show backend validation errors
            return null;
          }
          
          return data;
        })
        .then(async (data) => {
          if (!data) return; // Already handled error above

          // Check if backend returned validation errors (shouldn't happen if res.ok, but safety check)
          if (data.error || data.validationErrors) {
            const backendErrors = data.validationErrors || [data.error];
            setValidationErrors(backendErrors);
            setProcessingStage("error");
            setUploadStatus("❌ Data validation failed");
            
            // Show backend validation errors
            return;
          }

          // Initialize upload summary for local display
          setCurrentUploadSummary({
            id: Date.now(),
            fileName: fileToUpload.name,
            fileSize: fileToUpload.size,
            uploadedAt: new Date().toISOString(),
            status: 'processing'
          });

          // Start background upload tracking with taskId from backend
          startUpload({
            fileName: fileToUpload.name,
            fileSize: fileToUpload.size,
            taskId: data.taskId // Pass backend task ID for tracking
          });

          setProcessingStage("processing");
          setCurrentStep(2);
          setUploadStatus("📊 Processing data through pipeline... (You can navigate away, upload will continue in background)");
        })
        .catch(async (err) => {
          console.error(err);
          setProcessingStage("error");
          setUploadStatus("❌ Upload failed");
          
          // Parse error message
          let errorMsg = err.message || "Unknown error";
          let errorDetails = [];
          if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
            errorDetails = ['❌ Cannot connect to server - please ensure the backend is running'];
          } else if (errorMsg.includes('timeout')) {
            errorDetails = ['❌ Upload timed out - the server took too long to respond'];
          } else {
            errorDetails = [`❌ ${errorMsg}`];
          }
          
          setValidationErrors(errorDetails);
        });
    });
  }, [startUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "text/csv": [".csv"],
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
              <strong>💡 Upload Tips</strong>
              <div>• Drag and drop one Excel/CSV file (max 50 MB) or click to browse.</div>
              <div>• Include barangay, lat, lng, datecommitted, timecommitted, offensetype, and victimcount, suspect count, victiminjured, victimkilled, victimunharmed, suspectkilled.</div>
              <div>• Excel sheets must include the year in the sheet name; CSV years are auto-detected.</div>
              <div>• Follow the progress steps below—records appear in the map and current records when finished.</div>
            </div>
          </div>

          <DateTime />
        </div>

      {/* Content Card Wrapper */}
      <div className="add-record-card">
        
        {/* Always show steppers */}
        <ProcessingSteps currentStep={currentStep} processingStage={processingStage} />

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
                <p className="subtitle error">Please upload only Excel or CSV files (.xlsx, .xls, .csv)</p>
              </>
            ) : isDragActive ? (
              <>
                <p className="title active">Drop your file here</p>
                <p className="subtitle active">Release to upload</p>
              </>
            ) : (
              <>
                <p className="title">Drag & Drop your Excel or CSV file</p>
                <p className="subtitle">
                  or <span className="highlight">choose a file</span> to upload
                </p>
                <p className="note">Supported formats: .xlsx, .xls, .csv</p>
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

        {/* Upload Summary */}
        {currentUploadSummary && processingStage === "complete" && (
          <UploadSummary summary={currentUploadSummary} />
        )}

        {/* Recent Uploads Button */}
        <div className="recent-uploads-btn-wrapper">
          <button 
            onClick={() => setShowHistoryModal(true)} 
            className="recent-uploads-btn"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            View Recent Uploads
            {!isLoadingHistory && uploadHistory.length > 0 && (
              <span className="upload-count-badge">{uploadHistory.length}</span>
            )}
          </button>
        </div>
      </div>
      </div>

      {/* Upload History Modal */}
      <UploadHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        onClearHistory={handleClearHistory}
        isLoadingHistory={isLoadingHistory}
        uploadHistory={uploadHistory}
      />
    </div>
  );
}