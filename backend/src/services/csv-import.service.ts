import { prisma } from "../config/prisma";
import { GTMAutomationService } from "./gtm-automation.service";
import { onLeadCreated } from "./automation-engine";
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

  async deleteImport(id: number, importedBy?: string): Promise<boolean> {
    if (importedBy) {
      const record = await prisma.csvImport.findUnique({ where: { id } });
      if (!record || record.importedBy !== importedBy) {
        throw new Error("Access denied: you do not own this import");
      }
    }
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
