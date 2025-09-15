import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, Database, Map, CheckCircle, AlertCircle } from "lucide-react";

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
  });

  const steps = [
    { label: "Upload", icon: Upload },
    { label: "Validate", icon: Database },
    { label: "Process", icon: Map },
    { label: "GeoJSON", icon: CheckCircle },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition cursor-pointer 
        ${isDragActive ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-gray-50 hover:bg-gray-100"}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-500 mb-4" />
        {isDragActive ? (
          <p className="text-lg font-medium text-blue-500">Drop the file here…</p>
        ) : (
          <p className="text-lg text-gray-600">
            Drag & drop an Excel file here, or{" "}
            <span className="text-blue-600 font-semibold">click to browse</span>
          </p>
        )}
      </div>

      {/* Status */}
      {uploadStatus && (
        <div className="mt-6 p-4 rounded-lg bg-gray-100 text-gray-700 text-center font-medium">
          {processingStage === "error" ? (
            <span className="text-red-500 flex items-center justify-center gap-2">
              <AlertCircle size={18} /> {uploadStatus}
            </span>
          ) : (
            uploadStatus
          )}
        </div>
      )}

      {/* Pipeline Steps */}
      <div className="mt-8 flex justify-between items-center">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index < currentStep;
          return (
            <div
              key={index}
              className={`flex flex-col items-center w-full relative`}
            >
              <div
                className={`flex items-center justify-center w-12 h-12 rounded-full border-2 mb-2 
                ${isActive ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300 text-gray-400"}`}
              >
                <Icon size={20} />
              </div>
              <p className={`text-sm font-medium ${isActive ? "text-blue-600" : "text-gray-400"}`}>
                {step.label}
              </p>
              {index < steps.length - 1 && (
                <div
                  className={`absolute top-6 left-full h-0.5 w-full transition-all
                  ${isActive ? "bg-blue-500" : "bg-gray-300"}`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
