import sharp from "sharp";
import path from "path";
import fs from "fs";
import { logger } from "../utils/logger";

/**
 * Image Optimization Service
 * Uses 'sharp' for high-performance image processing:
 * 1. Resizing for thumbnails
 * 2. Format conversion to WebP for smaller payloads
 * 3. Quality compression
 */

export async function optimizeUploadedImage(inputPath: string): Promise<{
  optimizedPath: string;
  thumbnailPath: string;
}> {
  const dir = path.dirname(inputPath);
  const ext = path.extname(inputPath);
  const basename = path.basename(inputPath, ext);
  
  const optimizedPath = path.join(dir, `${basename}.webp`);
  const thumbnailPath = path.join(dir, `${basename}-thumb.webp`);

  try {
    const pipeline = sharp(inputPath);
    const metadata = await pipeline.metadata();

    // 1. Generate optimized WebP version
    // If original is already small/webp, we still convert to standard quality
    await pipeline
      .webp({ quality: 80, effort: 6 })
      .toFile(optimizedPath);

    // 2. Generate thumbnail (max 200px)
    await pipeline
      .resize(200, 200, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 75 })
      .toFile(thumbnailPath);

    // Clean up original if it's not webp (optional, but good for space)
    if (ext.toLowerCase() !== ".webp") {
      fs.unlinkSync(inputPath);
    }

    return {
      optimizedPath: `${basename}.webp`,
      thumbnailPath: `${basename}-thumb.webp`,
    };
  } catch (error) {
    logger.error("Image optimization failed:", error);
    // Return original paths if optimization fails to prevent data loss
    return {
      optimizedPath: path.basename(inputPath),
      thumbnailPath: path.basename(inputPath),
    };
  }
}
