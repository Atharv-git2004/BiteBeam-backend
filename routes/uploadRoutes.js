import express from "express";
import { upload } from "../middleware/uploadMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// @desc    Upload single image
// @route   POST /api/upload
// @access  Private (any authenticated user) or Public
router.post("/", (req, res) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || "File upload error" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided in 'image' field" });
    }

    // Return the relative URL and full URL
    const relativeUrl = `/uploads/${req.file.filename}`;
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    const fullUrl = `${baseUrl}${relativeUrl}`;

    res.status(201).json({
      message: "Image uploaded successfully",
      url: fullUrl,
      relativeUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

export default router;
