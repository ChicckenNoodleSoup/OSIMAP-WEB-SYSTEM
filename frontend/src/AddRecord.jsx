import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, CheckCircle, AlertCircle, Database, Map } from "lucide-react";

export default function AddRecord() {
  const [uploadStatus, setUploadStatus] = useState("");
  const [processingStage, setProcessingStage] = useState("");
  const [currentStep, setCurrentStep] = useState(0);

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

      setProcessingStage("uploading");
      setCurrentStep(1);
      setUploadStatus("📤 Uploading file...");

      fetch("https://crime-map-proto.onrender.com/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => {
          if (!res.ok) throw new Error("Upload failed");
          return res.json();
        })
        .then(() => {
          setProcessingStage("processing");
          setCurrentStep(2);
          setUploadStatus("📊 Processing data...");
          setTimeout(() => {
            setCurrentStep(3);
            setUploadStatus("🗺️ Generating GeoJSON...");
            setTimeout(() => {
              setProcessingStage("complete");
              setCurrentStep(4);
              setUploadStatus("✅ Done!");
            }, 1200);
          }, 1200);
        })
        .catch(() => {
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

  const steps = [
    { label: "Upload", icon: Upload },
    { label: "Validate", icon: Database },
    { label: "Process", icon: Map },
    { label: "GeoJSON", icon: CheckCircle },
  ];

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-b from-blue-900 to-teal-900 px-4 py-10 text-white">
      <div className="w-full max-w-4xl text-center">
        {/* Drag & Drop Area */}
        <div
          {...getRootProps()}
          className={`w-full h-64 flex flex-col justify-center items-center border-2 border-dashed rounded-2xl cursor-pointer transition 
            ${isDragReject ? "border-red-400 bg-red-900/30" : ""}
            ${isDragActive ? "border-blue-400 bg-blue-900/30 scale-[1.02]" : "border-gray-400 bg-white/10 hover:bg-white/20"}`}
        >
          <input {...getInputProps()} />

          {/* Icon */}
          {processingStage === "uploading" || processingStage === "processing" ? (
            <div className="animate-spin w-14 h-14 border-4 border-blue-400 border-t-transparent rounded-full mx-auto mb-6" />
          ) : processingStage === "complete" ? (
            <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-6" />
          ) : processingStage === "error" ? (
            <AlertCircle className="w-14 h-14 text-red-400 mx-auto mb-6" />
          ) : (
            <Upload className="w-14 h-14 text-gray-300 mx-auto mb-6" />
          )}

          {/* Text */}
          <h2 className="text-2xl font-bold mb-2">
            {isDragReject
              ? "Invalid file type"
              : isDragActive
              ? "Drop your file here"
              : "Choose a file or drag & drop"}
          </h2>
          <p className="text-sm text-gray-300 mb-4">
            Supported formats: <span className="font-medium">.xlsx, .xls</span>
          </p>

          {/* Browse Button */}
          <button
            type="button"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Browse File
          </button>
        </div>

        {/* Status */}
        {uploadStatus && (
          <div className="mt-6 px-6 py-3 rounded-lg bg-white/10 text-sm font-medium">
            {processingStage === "error" ? (
              <span className="text-red-400 flex items-center justify-center gap-2">
                <AlertCircle size={18} /> {uploadStatus}
              </span>
            ) : (
              uploadStatus
            )}
          </div>
        )}

        {/* Pipeline Steps */}
        <div className="mt-10 flex justify-between items-center">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index < currentStep;
            return (
              <div key={index} className="flex flex-col items-center w-full relative">
                <div
                  className={`flex items-center justify-center w-12 h-12 rounded-full border-2 mb-2 
                  ${isActive ? "bg-blue-500 border-blue-500 text-white" : "border-gray-400 text-gray-400"}`}
                >
                  <Icon size={20} />
                </div>
                <p
                  className={`text-sm font-medium ${
                    isActive ? "text-blue-400" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-6 left-full h-0.5 w-full transition-all
                    ${isActive ? "bg-blue-400" : "bg-gray-400"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Reset Button */}
        {(processingStage === "complete" || processingStage === "error") && (
          <div className="mt-8">
            <button
              onClick={resetStatus}
              className="px-6 py-3 bg-gray-800 text-white rounded-lg shadow hover:bg-gray-900 transition"
            >
              Upload Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
