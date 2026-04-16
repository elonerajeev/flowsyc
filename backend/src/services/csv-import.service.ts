import { prisma } from "../config/prisma";
import { type LeadSource } from "@prisma/client";
import { GTMAutomationService } from "./gtm-automation.service";
import { logger } from "../utils/logger";

export type CSVImportRecord = {
  id: number;
  filename: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: "pending" | "processing" | "completed" | "failed";
  errors: string[];
  importedBy: string;
  createdAt: Date;
  completedAt: Date | null;
};

export const csvImportService = {
  async createImport(filename: string, importedBy: string): Promise<CSVImportRecord> {
    const importRecord = await prisma.csvImport.create({
      data: {
        filename,
        totalRows: 0,
        successCount: 0,
        errorCount: 0,
        status: "pending",
        errors: [],
        importedBy,
      },
    });

    return {
      id: importRecord.id,
      filename: importRecord.filename,
      totalRows: importRecord.totalRows,
      successCount: importRecord.successCount,
      errorCount: importRecord.errorCount,
      status: importRecord.status,
      errors: importRecord.errors,
      importedBy: importRecord.importedBy,
      createdAt: importRecord.createdAt,
      completedAt: importRecord.completedAt,
    };
  },

  async listImports(): Promise<CSVImportRecord[]> {
    const imports = await prisma.csvImport.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return imports.map((imp) => ({
      id: imp.id,
      filename: imp.filename,
      totalRows: imp.totalRows,
      successCount: imp.successCount,
      errorCount: imp.errorCount,
      status: imp.status,
      errors: imp.errors,
      importedBy: imp.importedBy,
      createdAt: imp.createdAt,
      completedAt: imp.completedAt,
    }));
  },

  async getImport(id: number): Promise<CSVImportRecord | null> {
    const importRecord = await prisma.csvImport.findUnique({ where: { id } });
    if (!importRecord) return null;

    return {
      id: importRecord.id,
      filename: importRecord.filename,
      totalRows: importRecord.totalRows,
      successCount: importRecord.successCount,
      errorCount: importRecord.errorCount,
      status: importRecord.status,
      errors: importRecord.errors,
      importedBy: importRecord.importedBy,
      createdAt: importRecord.createdAt,
      completedAt: importRecord.completedAt,
    };
  },

  async processCSV(importId: number, rows: any[], importedBy: string): Promise<{ success: number; failed: number; errors: string[] }> {
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    logger.info(`[CSV Import ${importId}] Starting to process ${rows.length} rows`);

    // Update status to processing
    await prisma.csvImport.update({
      where: { id: importId },
      data: { status: "processing" },
    });

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Normalize all keys to lowercase for case-insensitive lookup
        const r: Record<string, string> = {};
        for (const key of Object.keys(row)) {
          r[key.toLowerCase().replace(/[\s_\-\.]+/g, "_")] = String(row[key] ?? "").trim();
        }
        const get = (...keys: string[]) => keys.map(k => r[k] || "").find(Boolean) || "";

        const VALID_SOURCES = ["website","referral","social","email","phone","event","advertisement","other"];
        const rawSource = get("source","lead_source","channel","utm_source");
        const mappedSource = (VALID_SOURCES.includes(rawSource.toLowerCase()) ? rawSource.toLowerCase() : "other") as LeadSource;

        // Full name fallback — split "Full Name" or "Name" column
        const fullName = get("full_name","name","contact_name","lead_name");
        const [namePart0 = "", namePart1 = ""] = fullName.split(" ");

        const leadData = {
          firstName: get("firstname","first_name") || namePart0,
          lastName:  get("lastname","last_name","surname") || namePart1,
          email:     get("email","work_email","business_email","email_address","contact_email","e_mail","email_id"),
          phone:     get("phone","mobile","phone_number","contact_number","work_phone","cell","telephone"),
          company:   get("company","company_name","organization","organisation","employer","account_name","firm"),
          jobTitle:  get("jobtitle","job_title","title","designation","position","role","function"),
          source:    mappedSource,
          assignedTo: get("assignedto","assigned_to","owner","rep","sales_rep") || importedBy,
          notes:     get("notes","note","description","comments","message","remarks","about_company","about","summary"),
        };

        // Validate required fields
        if (!leadData.email) {
          throw new Error("Email is required");
        }

        if (!leadData.firstName && !leadData.lastName && !leadData.company) {
          throw new Error("Name or Company is required");
        }

        // Check if lead with same email exists
        const existingLead = await prisma.lead.findFirst({
          where: { email: leadData.email, deletedAt: null },
        });

        if (existingLead) {
          logger.debug(`[CSV Import ${importId}] Row ${i}: Lead exists, updating ${leadData.email}`);
          const existingTags: string[] = existingLead.tags || [];
          const importTag = `import:${importId}`;
          const updatedTags = existingTags.includes(importTag)
            ? existingTags
            : [...existingTags, "csv_import", importTag];
          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              firstName: leadData.firstName || existingLead.firstName,
              lastName: leadData.lastName || existingLead.lastName,
              phone: leadData.phone || existingLead.phone,
              company: leadData.company || existingLead.company,
              jobTitle: leadData.jobTitle || existingLead.jobTitle,
              source: leadData.source || existingLead.source,
              assignedTo: leadData.assignedTo || existingLead.assignedTo,
              tags: updatedTags,
            },
          });
        } else {
          logger.debug(`[CSV Import ${importId}] Row ${i}: Creating new lead ${leadData.email}`);
          // Create new lead
          const score = await GTMAutomationService.calculateLeadScoreFromCriteria({
            companySize: row.companySize || row.company_size || undefined,
            budget: row.budget || row.Budget || undefined,
            timeline: row.timeline || row.Timeline || undefined,
            source: leadData.source,
          });

          await prisma.lead.create({
            data: {
              firstName: leadData.firstName || leadData.company || "Unknown",
              lastName: leadData.lastName || "",
              email: leadData.email,
              phone: leadData.phone,
              company: leadData.company,
              jobTitle: leadData.jobTitle,
              source: leadData.source,
              assignedTo: leadData.assignedTo,
              status: "new",
              score,
              notes: leadData.notes,
              tags: ["csv_import", `import:${importId}`],
            },
          });
          logger.debug(`[CSV Import ${importId}] Row ${i}: Created lead with tags ["csv_import", "import:${importId}"]`);
        }

        success++;
      } catch (err: any) {
        failed++;
        errors.push(`Row ${i + 2}: ${err.message}`);
      }

      // Update progress every 10 rows
      if (i % 10 === 0) {
        await prisma.csvImport.update({
          where: { id: importId },
          data: {
            totalRows: rows.length,
            successCount: success,
            errorCount: failed,
          },
        });
      }
    }

    // Final update
    await prisma.csvImport.update({
      where: { id: importId },
      data: {
        totalRows: rows.length,
        successCount: success,
        errorCount: failed,
        errors: errors.slice(0, 100), // Keep only first 100 errors
        status: failed === rows.length ? "failed" : "completed",
        completedAt: new Date(),
      },
    });

    return { success, failed, errors };
  },

  async deleteImport(id: number): Promise<boolean> {
    // Delete the import record
    await prisma.csvImport.delete({ where: { id } });

    // Delete leads that were imported with this import ID
    await prisma.lead.updateMany({
      where: { tags: { has: `import:${id}` } },
      data: { deletedAt: new Date() },
    });

    return true;
  },

  async getImportLeads(importId: number): Promise<any[]> {
    const leads = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        tags: { has: `import:${importId}` },
      },
      orderBy: { createdAt: "desc" },
    });

    return leads.map((lead) => ({
      id: lead.id,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      jobTitle: lead.jobTitle,
      source: lead.source,
      status: lead.status,
      score: lead.score,
      createdAt: lead.createdAt,
    }));
  },
};
