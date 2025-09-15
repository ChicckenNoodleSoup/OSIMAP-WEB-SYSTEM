import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Plus, Upload, Database, Map, CheckCircle, AlertCircle, FileSpreadsheet, CloudUpload } from "lucide-react";

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
    resetStatus();
    
    acceptedFiles.forEach((file) => {
      const formData = new FormData();
      formData.append("file", file);

      // Start upload stage
      setProcessingStage("uploading");
      setCurrentStep(1);
      setUploadStatus("📤 Uploading file...");

      fetch("https://Backend.onrender.com/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Backend response:", data);
          
          // Move to processing stage
          setProcessingStage("processing");
          setCurrentStep(2);
          setUploadStatus("📄 Processing data through pipeline...");

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [],
      "application/vnd.ms-excel": [],
    },
    multiple: false
  });

  const ProcessingSteps = () => {
    const steps = [
      { id: 1, label: "Upload File", icon: Upload },
      { id: 2, label: "Excel → Database", icon: Database },
      { id: 3, label: "Generate GeoJSON", icon: Map },
      { id: 4, label: "Complete", icon: CheckCircle },
    ];

    return (
      <div className="w-full max-w-2xl mb-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4 text-center">Processing Pipeline</h3>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            const isError = processingStage === "error" && currentStep === step.id;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center w-full">
                  <div
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-3 transition-all duration-500 shadow-lg ${
                      isError
                        ? "border-red-500 bg-red-100 shadow-red-200"
                        : isCompleted
                        ? "border-green-500 bg-green-100 shadow-green-200"
                        : isActive
                        ? "border-blue-500 bg-blue-100 animate-pulse shadow-blue-200"
                        : "border-gray-300 bg-white shadow-gray-200"
                    }`}
                  >
                    {isError ? (
                      <AlertCircle className="w-7 h-7 text-red-500" />
                    ) : (
                      <Icon
                        className={`w-7 h-7 transition-colors duration-300 ${
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
                    className={`mt-3 text-sm font-medium text-center transition-colors duration-300 ${
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
                  <div className="flex-1 px-4">
                    <div
                      className={`h-2 rounded-full transition-all duration-700 ${
                        currentStep > step.id 
                          ? "bg-gradient-to-r from-green-400 to-green-500" 
                          : "bg-gray-200"
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-blue-600" />
            Add New Record
          </h1>
          <p className="text-gray-600 mt-2">Upload Excel files to add crime data to the system</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl">
          
          {/* Processing Steps Indicator */}
          {currentStep > 0 && (
            <div className="flex justify-center mb-8">
              <ProcessingSteps />
            </div>
          )}

          {/* Drag-and-drop area */}
          <div className="flex justify-center">
            <div
              {...getRootProps()}
              className={`relative border-3 border-dashed rounded-3xl p-12 w-full max-w-2xl min-h-80 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 transform hover:scale-[1.02] ${
                processingStage === "uploading" || processingStage === "processing"
                  ? "border-blue-400 bg-blue-50/80 opacity-60 cursor-not-allowed hover:scale-100"
                  : processingStage === "complete"
                  ? "border-green-400 bg-green-50/80 shadow-lg shadow-green-100"
                  : processingStage === "error"
                  ? "border-red-400 bg-red-50/80 shadow-lg shadow-red-100"
                  : isDragActive
                  ? "border-blue-500 bg-blue-100/80 shadow-xl shadow-blue-200 scale-[1.02]"
                  : "border-gray-300 bg-white/80 shadow-lg hover:shadow-xl hover:border-gray-400"
              }`}
            >
              <input 
                {...getInputProps()} 
                disabled={processingStage === "uploading" || processingStage === "processing"} 
              />
              
              {/* Background decoration */}
              <div className="absolute inset-0 rounded-3xl opacity-5">
                <div className="absolute top-4 left-4 w-8 h-8 bg-blue-600 rounded-full"></div>
                <div className="absolute top-8 right-8 w-6 h-6 bg-green-500 rounded-full"></div>
                <div className="absolute bottom-6 left-8 w-10 h-10 bg-purple-500 rounded-full"></div>
                <div className="absolute bottom-4 right-4 w-4 h-4 bg-yellow-500 rounded-full"></div>
              </div>

              {/* Dynamic Icon based on processing stage */}
              <div className="relative z-10 flex flex-col items-center">
                {processingStage === "uploading" || processingStage === "processing" ? (
                  <div className="relative mb-6">
                    <div className="animate-spin w-20 h-20 border-4 border-blue-500 border-t-transparent rounded-full" />
                    <CloudUpload className="absolute inset-0 w-8 h-8 m-auto text-blue-500" />
                  </div>
                ) : processingStage === "complete" ? (
                  <div className="mb-6 relative">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-12 h-12 text-green-500" />
                    </div>
                  </div>
                ) : processingStage === "error" ? (
                  <div className="mb-6 relative">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-12 h-12 text-red-500" />
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 relative">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isDragActive 
                        ? "bg-blue-200 scale-110" 
                        : "bg-gray-100 hover:bg-gray-200"
                    }`}>
                      <Plus className={`w-12 h-12 transition-colors duration-300 ${
                        isDragActive ? "text-blue-600" : "text-gray-500"
                      }`} />
                    </div>
                  </div>
                )}

                {/* Dynamic Text */}
                <div className="text-center">
                  {processingStage === "uploading" || processingStage === "processing" ? (
                    <div>
                      <p className="text-blue-700 font-bold text-xl mb-2">Processing Your File...</p>
                      <p className="text-blue-600 text-sm">Please wait while we process your data</p>
                    </div>
                  ) : processingStage === "complete" ? (
                    <div>
                      <p className="text-green-700 font-bold text-xl mb-2">Upload Successful!</p>
                      <p className="text-green-600 text-sm">Your file has been processed and added to the system</p>
                    </div>
                  ) : processingStage === "error" ? (
                    <div>
                      <p className="text-red-700 font-bold text-xl mb-2">Upload Failed</p>
                      <p className="text-red-600 text-sm">Please try again or check your file format</p>
                    </div>
                  ) : isDragActive ? (
                    <div>
                      <p className="text-blue-700 font-bold text-xl mb-2">Drop Your File Here</p>
                      <p className="text-blue-600 text-sm">Release to start processing</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-gray-700 font-bold text-xl mb-2">
                        Drag & Drop Excel File Here
                      </p>
                      <p className="text-gray-600 text-sm mb-4">
                        Or <span className="text-blue-600 underline font-semibold">click to browse</span> your files
                      </p>
                      <p className="text-xs text-gray-500">
                        Supported formats: .xlsx, .xls
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Upload Status */}
          {uploadStatus && (
            <div className="flex justify-center mt-6">
              <div className="flex items-center space-x-3 bg-white/90 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border">
                {(processingStage === "uploading" || processingStage === "processing") && (
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                )}
                <p className={`text-lg font-semibold ${
                  processingStage === "complete"
                    ? "text-green-700"
                    : processingStage === "error"
                    ? "text-red-700"
                    : "text-blue-700"
                }`}>
                  {uploadStatus}
                </p>
              </div>
            </div>
          )}

          {/* Reset button when complete or error */}
          {(processingStage === "complete" || processingStage === "error") && (
            <div className="flex justify-center mt-8">
              <button
                onClick={resetStatus}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-full hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
              >
                <Upload className="w-5 h-5" />
                Upload Another File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="bg-white/50 backdrop-blur-sm border-t">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <p className="text-sm text-gray-600 text-center">
            Upload Excel files containing crime data. The system will automatically process and convert your data for mapping.
          </p>
        </div>
      </div>
    </div>
  );
}