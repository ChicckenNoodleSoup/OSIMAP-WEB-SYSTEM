import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Plus } from "lucide-react"; // for the plus icon

export default function AddRecord() {
  const [uploadStatus, setUploadStatus] = useState("");

  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      const formData = new FormData();
      formData.append("file", file); // must match multer's .single("file")

      fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Backend response:", data);
          setUploadStatus("✅ Excel uploaded and saved to backend!");
        })
        .catch((err) => {
          console.error(err);
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

  return (
    <div className="flex flex-col h-full justify-center items-center space-y-4">
      {/* Drag-and-drop box */}
      <div
        {...getRootProps()}
        className={`border-4 border-dashed rounded-2xl p-10 w-2/3 h-64 flex flex-col items-center justify-center cursor-pointer transition-colors ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        {/* Plus Icon */}
        <Plus className="w-16 h-16 text-gray-400 mb-4" />
        {/* Text */}
        {isDragActive ? (
          <p className="text-blue-600 font-semibold text-lg">Drop the file here...</p>
        ) : (
          <p className="text-gray-600 font-medium text-lg">
            Drag & Drop Excel file or <span className="text-blue-600 underline">Click to Upload</span>
          </p>
        )}
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <p
          className={`text-center text-lg font-semibold ${
            uploadStatus.startsWith("✅") ? "text-green-600" : "text-red-600"
          }`}
        >
          {uploadStatus}
        </p>
      )}
    </div>
  );
}
