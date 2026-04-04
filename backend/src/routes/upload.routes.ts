import type { Request, Response } from "express";
import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware";
import { uploadAvatar, uploadResume, uploadDocument, getFileUrl, deleteFile, resolveFilePath } from "../services/storage.service";

const uploadRouter = Router();

// POST /upload/avatar - Upload avatar image
uploadRouter.post("/avatar", requireAuth, (req: Request, res: Response) => {
  uploadAvatar.single("file")(req, res, (err) => {
    if (err) {
      const status = err.name === "MulterError" ? 400 : 500;
      return res.status(status).json({ error: err.message, code: "UPLOAD_FAILED" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file provided", code: "NO_FILE" });
    }
    const url = getFileUrl("avatars", req.file.filename);
    res.status(201).json({
      url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// POST /upload/resume - Upload candidate resume
uploadRouter.post("/resume", requireAuth, (req: Request, res: Response) => {
  uploadResume.single("file")(req, res, (err) => {
    if (err) {
      const status = err.name === "MulterError" ? 400 : 500;
      return res.status(status).json({ error: err.message, code: "UPLOAD_FAILED" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file provided", code: "NO_FILE" });
    }
    const url = getFileUrl("resumes", req.file.filename);
    res.status(201).json({
      url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// POST /upload/document - Upload general document
uploadRouter.post("/document", requireAuth, (req: Request, res: Response) => {
  uploadDocument.single("file")(req, res, (err) => {
    if (err) {
      const status = err.name === "MulterError" ? 400 : 500;
      return res.status(status).json({ error: err.message, code: "UPLOAD_FAILED" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file provided", code: "NO_FILE" });
    }
    const url = getFileUrl("documents", req.file.filename);
    res.status(201).json({
      url,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  });
});

// DELETE /upload/:category/:filename - Delete uploaded file
uploadRouter.delete("/:category/:filename", requireAuth, (req: Request, res: Response) => {
  const { category, filename } = req.params;
  const validCategories = ["avatars", "resumes", "documents"];
  const cat = String(category);

  if (!validCategories.includes(cat)) {
    res.status(400).json({ error: "Invalid category", code: "INVALID_CATEGORY" });
    return;
  }

  const deleted = deleteFile(cat, String(filename));
  if (!deleted) {
    res.status(404).json({ error: "File not found", code: "FILE_NOT_FOUND" });
    return;
  }

  res.status(200).json({ message: "File deleted" });
});

// GET /uploads/:category/:filename - Serve uploaded files
uploadRouter.get("/file/:category/:filename", (req: Request, res: Response) => {
  const { category, filename } = req.params;
  const relativePath = `uploads/${String(category)}/${String(filename)}`;
  const filePath = resolveFilePath(relativePath);

  if (!filePath) {
    return res.status(404).json({ error: "File not found", code: "FILE_NOT_FOUND" });
  }

  res.sendFile(filePath);
});

export { uploadRouter };
