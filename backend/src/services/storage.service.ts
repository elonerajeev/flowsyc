import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../middleware/error.middleware";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

const ALLOWED_MIME: Record<string, string[]> = {
  avatar: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  resume: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain", "image/jpeg", "image/png"],
};

const MAX_SIZE: Record<string, number> = {
  avatar: 2 * 1024 * 1024,    // 2 MB
  resume: 10 * 1024 * 1024,   // 10 MB
  document: 15 * 1024 * 1024,  // 15 MB
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const hash = crypto.randomBytes(16).toString("hex");
  return `${hash}${ext}`;
}

function createStorage(category: string) {
  const dir = path.join(UPLOAD_ROOT, category);
  ensureDir(dir);

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => cb(null, generateFilename(file.originalname)),
    }),
    limits: { fileSize: MAX_SIZE[category] ?? 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ALLOWED_MIME[category] ?? ALLOWED_MIME.document;
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new AppError(`Invalid file type: ${file.mimetype}. Allowed: ${allowed.join(", ")}`, 400, "INVALID_FILE_TYPE"));
      }
    },
  });
}

export const uploadAvatar = createStorage("avatar");
export const uploadResume = createStorage("resume");
export const uploadDocument = createStorage("document");

export async function uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `flowsyc/${folder}`,
        resource_type: "auto",
      },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result!.secure_url, publicId: result!.public_id });
      }
    );
    stream.end(file.buffer);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export function getFileUrl(category: string, filename: string): string {
  return `/uploads/${category}/${filename}`;
}

export function deleteFile(category: string, filename: string): boolean {
  try {
    const filePath = path.join(UPLOAD_ROOT, category, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function resolveFilePath(relativePath: string): string | null {
  const cleaned = relativePath.replace(/^\/+/, "");
  const fullPath = path.resolve(UPLOAD_ROOT, "..", cleaned);
  if (!fullPath.startsWith(UPLOAD_ROOT)) {
    return null;
  }
  return fs.existsSync(fullPath) ? fullPath : null;
}
