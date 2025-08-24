import express from "express";
import multer from "multer";
import path from "path";
import cors from "cors";

const app = express();
const PORT = 5000;

// Enable CORS for all origins
app.use(cors());

// Ensure JSON body parsing (optional if you also send JSON)
app.use(express.json());

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "data")); // Save to backend/data
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Keep original filename
  },
});

const upload = multer({ storage });

// Upload route
app.post("/upload", upload.single("file"), (req, res) => {
  console.log("File received:", req.file); // Log file info

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  res.json({ message: "File uploaded successfully", filename: req.file.filename });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
