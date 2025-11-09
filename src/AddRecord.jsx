import React, { useCallback, useState, useEffect } from "react";
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
import { uploadHistoryService } from "./utils/loggingUtils";
import { useUpload } from "./contexts/UploadContext";

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
    const latestUpload = activeUploads[activeUploads.length - 1];
    
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

  // Reload history when upload completes
  useEffect(() => {
    const hasCompleted = activeUploads.some(u => u.status === 'success' || u.status === 'failed');
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
  useEffect(() => {
    if (lastCompletedUpload && !currentUploadSummary) {
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
    setCurrentUploadSummary(null);
    clearLastCompleted(); // Clear the global last completed upload
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

          // Start background upload tracking (continues even if user navigates away)
          startUpload({
            fileName: fileToUpload.name,
            fileSize: fileToUpload.size
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

  const UploadSummary = ({ summary }) => {
    if (!summary) return null;

    const formatFileSize = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatDateTime = (isoString) => {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    };

    return (
      <div className="upload-summary-card">
        <h3 className="summary-title">📋 Current Upload Summary</h3>
        <div className="summary-content">
          <div className="summary-row">
            <span className="summary-label">File Name:</span>
            <span className="summary-value">{summary.fileName}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">File Size:</span>
            <span className="summary-value">{formatFileSize(summary.fileSize)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Upload Started:</span>
            <span className="summary-value">{formatDateTime(summary.uploadedAt)}</span>
          </div>
          {summary.completedAt && (
            <div className="summary-row">
              <span className="summary-label">Completed At:</span>
              <span className="summary-value">{formatDateTime(summary.completedAt)}</span>
            </div>
          )}
          {summary.processingTime !== undefined && (
            <div className="summary-row">
              <span className="summary-label">Processing Time:</span>
              <span className="summary-value">{summary.processingTime}s</span>
            </div>
          )}
          {summary.recordsProcessed && (
            <div className="summary-row">
              <span className="summary-label">Records Processed:</span>
              <span className="summary-value">{summary.recordsProcessed}</span>
            </div>
          )}
          {summary.sheetsProcessed && summary.sheetsProcessed.length > 0 && (
            <div className="summary-row">
              <span className="summary-label">Sheets Processed:</span>
              <span className="summary-value">{summary.sheetsProcessed.join(', ')}</span>
            </div>
          )}
          <div className="summary-row">
            <span className="summary-label">Status:</span>
            <span className={`summary-value status-badge ${summary.status}`}>
              {summary.status === 'success' ? '✅ Success' : 
               summary.status === 'processing' ? '⏳ Processing' : 
               '❌ Failed'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const UploadHistoryModal = () => {
    if (!showHistoryModal) return null;

    const formatFileSize = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    };

    const formatDateTime = (isoString) => {
      const date = new Date(isoString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const clearHistory = async () => {
      if (window.confirm('Are you sure you want to clear the upload history?')) {
        const success = await uploadHistoryService.clear();
        if (success) {
          setUploadHistory([]);
        } else {
          alert('Failed to clear history. Please try again.');
        }
      }
    };

    const handleBackdropClick = (e) => {
      // Check if clicked element has the backdrop class
      if (e.target.classList && e.target.classList.contains('history-modal-backdrop')) {
        setShowHistoryModal(false);
      }
    };

    return (
      <div className="history-modal-backdrop" onClick={handleBackdropClick}>
        <div className="history-modal">
          {/* Header */}
          <div className="history-modal-header">
            <div className="history-title-section">
              <h3 className="history-title">Recent Uploads</h3>
              <span className="history-subtitle">Last 10 uploads</span>
            </div>
            <div className="history-modal-actions">
              <button 
                onClick={clearHistory} 
                className="clear-history-btn-modal" 
                disabled={isLoadingHistory || uploadHistory.length === 0}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Clear All
              </button>
              <button 
                onClick={() => setShowHistoryModal(false)} 
                className="close-modal-btn"
                aria-label="Close"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="history-modal-content">
            {isLoadingHistory ? (
              <div className="history-loading">
                <div className="spinner small" />
                <p>Loading upload history...</p>
              </div>
            ) : uploadHistory.length === 0 ? (
              <div className="history-empty">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <p className="empty-title">No upload history yet</p>
                <p className="empty-subtitle">Your upload history will appear here after you upload files</p>
              </div>
            ) : (
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Size</th>
                      <th>Upload Time</th>
                      <th>Records</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {uploadHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="file-name-cell" title={item.file_name}>
                          <div className="file-name-wrapper">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                              <polyline points="13 2 13 9 20 9"></polyline>
                            </svg>
                            {item.file_name}
                          </div>
                        </td>
                        <td>{formatFileSize(item.file_size)}</td>
                        <td>{formatDateTime(item.upload_started_at)}</td>
                        <td className="records-cell">{item.records_processed || 'N/A'}</td>
                        <td>{item.processing_time ? `${item.processing_time}s` : 'N/A'}</td>
                        <td>
                          <span className={`status-badge ${item.status}`}>
                            {item.status === 'success' ? (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                Success
                              </>
                            ) : item.status === 'processing' ? (
                              <>⏳ Processing</>
                            ) : (
                              <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                                Failed
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
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
      <UploadHistoryModal />
    </div>
  );
}