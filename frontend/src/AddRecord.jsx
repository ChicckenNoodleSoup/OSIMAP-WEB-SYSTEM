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
          setUploadStatus("🔄 Processing data through pipeline...");

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
  });

  const ProcessingSteps = () => {
    const steps = [
      { id: 1, label: "Upload File", icon: Upload },
      { id: 2, label: "Excel → Supabase", icon: Database },
      { id: 3, label: "Supabase → GeoJSON", icon: Map },
      { id: 4, label: "Complete", icon: CheckCircle },
    ];

    return (
      <div className="w-2/3 mb-6">
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
    <div className="flex flex-col h-full justify-center items-center space-y-4">
      {/* Processing Steps Indicator */}
      {currentStep > 0 && <ProcessingSteps />}

      {/* Drag-and-drop box */}
      <div
        {...getRootProps()}
        className={`border-4 border-dashed rounded-2xl p-10 w-2/3 h-64 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
          processingStage === "uploading" || processingStage === "processing"
            ? "border-blue-500 bg-blue-50 opacity-50 cursor-not-allowed"
            : processingStage === "complete"
            ? "border-green-500 bg-green-50"
            : processingStage === "error"
            ? "border-red-500 bg-red-50"
            : isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50"
        }`}
      >
        <input {...getInputProps()} disabled={processingStage === "uploading" || processingStage === "processing"} />
        
        {/* Dynamic Icon based on processing stage */}
        {processingStage === "uploading" || processingStage === "processing" ? (
          <div className="animate-spin w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mb-4" />
        ) : processingStage === "complete" ? (
          <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        ) : processingStage === "error" ? (
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        ) : (
          <Plus className="w-16 h-16 text-gray-400 mb-4" />
        )}

        {/* Dynamic Text */}
        {processingStage === "uploading" || processingStage === "processing" ? (
          <p className="text-blue-600 font-semibold text-lg">Processing...</p>
        ) : processingStage === "complete" ? (
          <p className="text-green-600 font-semibold text-lg">
            Ready for next upload
          </p>
        ) : processingStage === "error" ? (
          <p className="text-red-600 font-semibold text-lg">Upload failed - Try again</p>
        ) : isDragActive ? (
          <p className="text-blue-600 font-semibold text-lg">Drop the file here...</p>
        ) : (
          <p className="text-gray-600 font-medium text-lg">
            Drag & Drop Excel file or <span className="text-blue-600 underline">Click to Upload</span>
          </p>
        )}
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <div className="flex items-center space-x-2">
          {(processingStage === "uploading" || processingStage === "processing") && (
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
          <p
            className={`text-center text-lg font-semibold ${
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

      {/* Reset button when complete or error */}
      {(processingStage === "complete" || processingStage === "error") && (
        <button
          onClick={resetStatus}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Upload Another File
        </button>
      )}
    </div>
  );
}