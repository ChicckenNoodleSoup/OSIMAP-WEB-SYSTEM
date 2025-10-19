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
import { DateTime } from "./DateTime";

export default function AddRecord() {
  const [uploadStatus, setUploadStatus] = useState("");
  const [processingStage, setProcessingStage] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

  const resetStatus = () => {
    setUploadStatus("");
    setProcessingStage("");
    setCurrentStep(0);
  };

  // Function to poll backend status
  const pollBackendStatus = () => {
    let pollAttempts = 0;
    const maxPollAttempts = 10;
    
    const pollInterval = setInterval(() => {
      fetch("http://localhost:5000/status")
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          return res.json();
        })
        .then((statusData) => {
          console.log("Backend status:", statusData);
          pollAttempts = 0; // Reset attempts on successful request
          
          if (statusData.status === "error") {
            // Processing failed
            clearInterval(pollInterval);
            setProcessingStage("error");
            setUploadStatus(`❌ Processing failed: ${statusData.processingError || "Unknown error"}`);
          } else if (!statusData.isProcessing && statusData.status === "idle") {
            // Processing is complete
            clearInterval(pollInterval);
            setProcessingStage("complete");
            setCurrentStep(4);
            setUploadStatus("✅ Pipeline completed successfully!");
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
        })
        .catch((err) => {
          console.error("Error polling status:", err);
          pollAttempts++;
          
          if (pollAttempts >= maxPollAttempts) {
            clearInterval(pollInterval);
            setProcessingStage("error");
            setUploadStatus(`❌ Failed to connect to backend after ${maxPollAttempts} attempts. Please check if the backend server is running on port 5000.`);
          } else {
            console.log(`Polling attempt ${pollAttempts}/${maxPollAttempts} failed, retrying...`);
          }
        });
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

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return;

    resetStatus();

    acceptedFiles.forEach((file) => {
      const formData = new FormData();
      formData.append("file", file);

      setProcessingStage("uploading");
      setCurrentStep(1);
      setUploadStatus("📤 Uploading file...");

      fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Backend response:", data);

          setProcessingStage("processing");
          setCurrentStep(2);
          setUploadStatus("📊 Processing data through pipeline...");

          // Start polling backend status
          pollBackendStatus();
        })
        .catch((err) => {
          console.error(err);
          setProcessingStage("error");
          setUploadStatus("❌ Upload failed.");
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
    disabled: processingStage === "uploading" || processingStage === "processing",
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
    <div className="dashboard">

            <div className="page-header">
              <div className="page-title-container">
                <img src="stopLight.svg" alt="Logo" className="page-logo" />
                <h1 className="page-title">Add Record</h1>
                {/* Info button */}
                <button type="button" className="addrec-info-btn" aria-label="Dashboard Info">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" />
                    <text x="12" y="16" textAnchor="middle" fontSize="12" fill="currentColor" fontFamily="Poppins, sans-serif">i</text>
                  </svg>
                </button>

                <div className="addrec-edit-instructions" role="status">
                  <strong>💡 How to Add Records</strong>
                  <div>• Drag and drop your Excel file or click to browse.</div>
                  <div>• Supported formats: <code>.xlsx</code> and <code>.xls</code>.</div>
                  <div>• The system will upload, process, and convert data into GeoJSON.</div>
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
                <p className="title error">Upload Failed</p>
                <p className="subtitle error">Please try again or check your file format</p>
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

          {/* Upload Status */}
          {uploadStatus && (
            <div className="upload-status">
              {(processingStage === "uploading" || processingStage === "processing") && (
                <div className="spinner small" />
              )}
              <p className={`status-text ${processingStage}`}>{uploadStatus}</p>
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
  );
}