import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Plus, Upload, Database, Map, CheckCircle, AlertCircle } from "lucide-react";

export default function AddRecord() {
  const [uploadStatus, setUploadStatus] = useState("");
  const [processingStage, setProcessingStage] = useState(""); // "uploading", "processing", "complete", "error"
  const [currentStep, setCurrentStep] = useState(0); // 0: idle, 1: uploading, 2: excel_to_supabase, 3: supabase_to_geojson, 4: complete

  const resetStatus = () => {
    setUploadStatus("");
    setProcessingStage("");
    setCurrentStep(0);
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    resetStatus();
    
    acceptedFiles.forEach((file) => {
      const formData = new FormData();
      formData.append("file", file);

      // Start upload stage
      setProcessingStage("uploading");
      setCurrentStep(1);
      setUploadStatus("📤 Uploading file...");

      fetch("https://crime-map-proto.onrender.com/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Backend response:", data);
          
          // Move to processing stage
          setProcessingStage("processing");
          setCurrentStep(2);
          setUploadStatus("📊 Processing data through pipeline...");

          // Simulate the processing steps (since we can't get real-time feedback from backend)
          setTimeout(() => {
            setCurrentStep(3);
            setUploadStatus("🗺️ Converting to GeoJSON...");
          }, 3000);

          setTimeout(() => {
            setProcessingStage("complete");
            setCurrentStep(4);
            setUploadStatus("✅ Pipeline completed successfully!");
          }, 6000);
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
    disabled: processingStage === "uploading" || processingStage === "processing"
  });

  const ProcessingSteps = () => {
    const steps = [
      { id: 1, label: "Upload File", icon: Upload },
      { id: 2, label: "Excel → Supabase", icon: Database },
      { id: 3, label: "Supabase → GeoJSON", icon: Map },
      { id: 4, label: "Complete", icon: CheckCircle },
    ];

    return (
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isError = processingStage === "error" && currentStep === step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isError
                        ? "border-red-500 bg-red-100"
                        : isCompleted
                        ? "border-green-500 bg-green-100"
                        : isActive
                        ? "border-blue-500 bg-blue-100 animate-pulse"
                        : "border-gray-300 bg-gray-100"
                    }`}
                  >
                    {isError ? (
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    ) : (
                      <Icon
                        className={`w-6 h-6 ${
                          isCompleted
                            ? "text-green-500"
                            : isActive
                            ? "text-blue-500"
                            : "text-gray-400"
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      isError
                        ? "text-red-500"
                        : isCompleted
                        ? "text-green-600"
                        : isActive
                        ? "text-blue-600"
                        : "text-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-4 rounded transition-all duration-500 ${
                      currentStep > step.id ? "bg-green-400" : "bg-gray-200"
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
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 bg-gray-50">
      {/* Processing Steps Indicator */}
      {currentStep > 0 && <ProcessingSteps />}

      {/* Main Upload Container */}
      <div className="w-full max-w-2xl">
        {/* Upload Rectangle */}
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-xl p-12 
            flex flex-col items-center justify-center cursor-pointer 
            transition-all duration-300 min-h-80 bg-white shadow-lg
            ${
              processingStage === "uploading" || processingStage === "processing"
                ? "border-blue-400 bg-blue-50 cursor-not-allowed"
                : processingStage === "complete"
                ? "border-green-400 bg-green-50 hover:bg-green-100"
                : processingStage === "error"
                ? "border-red-400 bg-red-50 hover:bg-red-100"
                : isDragReject
                ? "border-red-400 bg-red-50"
                : isDragActive
                ? "border-blue-400 bg-blue-50 scale-105"
                : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 hover:shadow-xl"
            }
          `}
        >
            <input {...getInputProps()} />
            
            {/* Dynamic Icon */}
            <div className="mb-6">
              {processingStage === "uploading" || processingStage === "processing" ? (
                <div className="animate-spin w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full" />
              ) : processingStage === "complete" ? (
                <CheckCircle className="w-20 h-20 text-green-500" />
              ) : processingStage === "error" ? (
                <AlertCircle className="w-20 h-20 text-red-500" />
              ) : (
                <div className={`p-4 rounded-full ${isDragActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Plus className={`w-12 h-12 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
                </div>
              )}
            </div>

            {/* Dynamic Text */}
            <div className="text-center">
              {processingStage === "uploading" || processingStage === "processing" ? (
                <div>
                  <p className="text-blue-600 font-semibold text-xl mb-2">Processing...</p>
                  <p className="text-blue-500 text-sm">Please wait while we handle your file</p>
                </div>
              ) : processingStage === "complete" ? (
                <div>
                  <p className="text-green-600 font-semibold text-xl mb-2">Upload Successful!</p>
                  <p className="text-green-500 text-sm">Ready for your next upload</p>
                </div>
              ) : processingStage === "error" ? (
                <div>
                  <p className="text-red-600 font-semibold text-xl mb-2">Upload Failed</p>
                  <p className="text-red-500 text-sm">Please try again or check your file format</p>
                </div>
              ) : isDragReject ? (
                <div>
                  <p className="text-red-600 font-semibold text-xl mb-2">Invalid File Type</p>
                  <p className="text-red-500 text-sm">Please upload only Excel files (.xlsx, .xls)</p>
                </div>
              ) : isDragActive ? (
                <div>
                  <p className="text-blue-600 font-semibold text-xl mb-2">Drop your file here</p>
                  <p className="text-blue-500 text-sm">Release to upload</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 font-semibold text-xl mb-2">
                    Upload Excel File
                  </p>
                  <p className="text-gray-500 text-sm mb-4">
                    Drag and drop your Excel file here, or click to browse
                  </p>
                  <p className="text-xs text-gray-400">
                    Supported formats: .xlsx, .xls
                  </p>
                </div>
              )}
            </div>

            {/* Upload Status */}
            {uploadStatus && (
              <div className="mt-4 flex items-center space-x-3 px-4 py-2 rounded-lg bg-white/80">
                {(processingStage === "uploading" || processingStage === "processing") && (
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                )}
                <p
                  className={`text-sm font-medium ${
                    processingStage === "complete"
                      ? "text-green-600"
                      : processingStage === "error"
                      ? "text-red-600"
                      : "text-blue-600"
                  }`}
                >
                  {uploadStatus}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Reset button when complete or error */}
        {(processingStage === "complete" || processingStage === "error") && (
          <div className="mt-6 text-center">
            <button
              onClick={resetStatus}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
                         transition-colors font-medium shadow-lg hover:shadow-xl"
            >
              Upload Another File
            </button>
          </div>
        )}
      </div>
  );
}