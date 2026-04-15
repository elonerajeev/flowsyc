import { Router } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import { csvImportService } from "../services/csv-import.service";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth } from "../middleware/auth.middleware";
import { uploadRateLimiter } from "../middleware/rate-limit.middleware";
import { logger } from "../utils/logger";

const csvImportRouter = Router();

const EXCEL_MIMES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const ALLOWED_EXTS = [".csv", ".xlsx", ".xls"];

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = "." + file.originalname.split(".").pop()?.toLowerCase();
    if (file.mimetype === "text/csv" || EXCEL_MIMES.includes(file.mimetype) || ALLOWED_EXTS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV or Excel files are allowed"));
    }
  },
});

// List all imports
csvImportRouter.get("/", requireAuth, asyncHandler(async (req, res) => {
  const imports = await csvImportService.listImports();
  res.json({ data: imports });
}));

// Get single import with details
csvImportRouter.get("/:id", requireAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string);
  const importRecord = await csvImportService.getImport(id);
  
  if (!importRecord) {
    res.status(404).json({ error: "Import not found" });
    return;
  }
  
  const leads = await csvImportService.getImportLeads(id);
  res.json({ data: { ...importRecord, leads } });
}));

// Upload and process CSV
csvImportRouter.post("/", requireAuth, uploadRateLimiter, upload.single("file"), asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  const userEmail = (req as any).auth?.email || "system";

  // Create import record
  const importRecord = await csvImportService.createImport(req.file.originalname, userEmail);

  // Parse file — CSV or Excel
  const ext = req.file.originalname.split(".").pop()?.toLowerCase();
  let rows: any[];
  if (ext === "xlsx" || ext === "xls") {
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    // Pick the first sheet that has an email column and at least 2 rows
    let sheet = workbook.Sheets[workbook.SheetNames[0]];
    for (const name of workbook.SheetNames) {
      const s = workbook.Sheets[name];
      const preview = XLSX.utils.sheet_to_json<Record<string, unknown>>(s, { defval: "" });
      if (preview.length >= 1) {
        const headers = Object.keys(preview[0]).map(k => k.toLowerCase());
        if (headers.some(h => h.includes("email") || h.includes("name") || h.includes("company"))) {
          sheet = s;
          break;
        }
      }
    }
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } else {
    const csvContent = req.file.buffer.toString("utf-8");
    rows = parseCSV(csvContent);
  }
  
  logger.info(`[CSV Import] Starting processing for ${rows.length} rows`);
  
  // Process synchronously (faster for small files, ensures completion)
  try {
    const result = await csvImportService.processCSV(importRecord.id, rows, userEmail);
    logger.info(`[CSV Import] Completed: ${result.success} success, ${result.failed} failed`);
    res.status(201).json({ 
      data: importRecord,
      success: result.success,
      failed: result.failed,
      message: `Imported ${result.success} leads successfully.`,
    });
  } catch (err) {
    logger.error("[CSV Import] Processing error:", err);
    res.status(500).json({ 
      error: "Failed to process CSV",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
}));

// Delete import and its leads
csvImportRouter.delete("/:id", requireAuth, asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id as string);
  await csvImportService.deleteImport(id);
  res.json({ success: true, message: "Import deleted successfully" });
}));

// Parse CSV string to array of objects
function parseCSV(csvString: string): any[] {
  const lines = csvString.split(/\r?\n/).filter(line => line.trim());
  if (lines.length === 0) return [];
  
  // Parse header row
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: any = {};
      headers.forEach((header, idx) => {
        row[header.trim()] = values[idx]?.trim() || "";
      });
      rows.push(row);
    }
  }
  
  return rows;
}

// Parse a single CSV line handling quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

export { csvImportRouter };
