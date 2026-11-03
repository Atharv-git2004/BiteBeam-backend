import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 30);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${sanitizedBase}-${uniqueSuffix}${ext}`);
  },
});

// File filter: images only
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /^\.(jpe?g|png|webp|gif|svg)$/i;
  const allowedMimeTypes = /^image\/(jpeg|png|webp|gif|svg\+xml)$/i;

  const ext = path.extname(file.originalname).toLowerCase();
  const isExtValid = allowedExtensions.test(ext);
  const isMimeValid = allowedMimeTypes.test(file.mimetype);

  if (isExtValid && isMimeValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (JPG, PNG, WEBP, GIF, SVG) are allowed!"), false);
  }
};

// 10 MB limit
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});
