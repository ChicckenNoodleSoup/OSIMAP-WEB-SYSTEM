import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";

export default function AddRecord() {
  const [uploadStatus, setUploadStatus] = useState("");

  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      // Optional: Read Excel locally for logging
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        console.log("Parsed Excel Data:", jsonData);
      };
      reader.readAsArrayBuffer(file);

      // Send file to backend
      const formData = new FormData();
      formData.append("file", file);

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
      <div
        {...getRootProps()}
        className={`border-4 border-dashed rounded-2xl p-10 w-2/3 h-64 flex items-center justify-center cursor-pointer transition-colors ${
          isDragActive ? "border-blue-500 bg-blue-100" : "border-gray-400"
        }`}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p className="text-blue-700 text-lg font-semibold">Drop the file here...</p>
        ) : (
          <p className="text-gray-600 text-lg">
            Drag and drop your Excel file here, or click to select
          </p>
        )}
      </div>
      {uploadStatus && (
        <p className="text-center text-lg font-medium">{uploadStatus}</p>
      )}
    </div>
  );
}
