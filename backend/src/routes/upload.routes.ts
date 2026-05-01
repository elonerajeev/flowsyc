import type { Request, Response } from "express";
import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware";
import { uploadAvatar, uploadResume, uploadDocument, uploadToCloudinary, deleteFromCloudinary } from "../services/storage.service";

const uploadRouter = Router();

// POST /upload/avatar - Upload avatar image to Cloudinary
uploadRouter.post("/avatar", requireAuth, (req: Request, res: Response) => {
  uploadAvatar.single("file")(req, res, async (err) => {
    if (err) {
      const status = err.name === "MulterError" ? 400 : 500;
      return res.status(status).json({ error: err.message, code: "UPLOAD_FAILED" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file provided", code: "NO_FILE" });
    }

    try {
      const { url, publicId } = await uploadToCloudinary(req.file, "avatars");
      res.status(201).json({
        url,
        publicId,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (uploadErr) {
      res.status(500).json({ error: "Upload failed", code: "UPLOAD_FAILED" });
    }
  });
});

// POST /upload/resume - Upload candidate resume to Cloudinary
uploadRouter.post("/resume", requireAuth, (req: Request, res: Response) => {
  uploadResume.single("file")(req, res, async (err) => {
    if (err) {
      const status = err.name === "MulterError" ? 400 : 500;
      return res.status(status).json({ error: err.message, code: "UPLOAD_FAILED" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file provided", code: "NO_FILE" });
    }

    try {
      const { url, publicId } = await uploadToCloudinary(req.file, "resumes");
      res.status(201).json({
        url,
        publicId,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (uploadErr) {
      res.status(500).json({ error: "Upload failed", code: "UPLOAD_FAILED" });
    }
  });
});

// POST /upload/document - Upload general document to Cloudinary
uploadRouter.post("/document", requireAuth, (req: Request, res: Response) => {
  uploadDocument.single("file")(req, res, async (err) => {
    if (err) {
      const status = err.name === "MulterError" ? 400 : 500;
      return res.status(status).json({ error: err.message, code: "UPLOAD_FAILED" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file provided", code: "NO_FILE" });
    }

    try {
      const { url, publicId } = await uploadToCloudinary(req.file, "documents");
      res.status(201).json({
        url,
        publicId,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    } catch (uploadErr) {
      res.status(500).json({ error: "Upload failed", code: "UPLOAD_FAILED" });
    }
  });
});

// DELETE /upload/:publicId - Delete uploaded file from Cloudinary
uploadRouter.delete("/:publicId", requireAuth, async (req: Request, res: Response) => {
  try {
    const { publicId } = req.params;
    await deleteFromCloudinary(String(publicId));
    res.status(200).json({ message: "File deleted" });
  } catch (err) {
    res.status(500).json({ error: "Delete failed", code: "DELETE_FAILED" });
  }
});

export { uploadRouter };
