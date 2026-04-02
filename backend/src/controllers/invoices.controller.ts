import type { Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import { invoicesService } from "../services/invoices.service";
import { logAudit } from "../utils/audit";
import { invoiceQuerySchema } from "../validators/query.schema";

function readInvoiceId(request: Request) {
  const invoiceId = String(request.params.id ?? "").trim();
  if (!invoiceId) {
    throw new AppError("Invalid invoice id", 400, "BAD_REQUEST");
  }
  return invoiceId;
}

export const invoicesController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const parsed = invoiceQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const invoices = await invoicesService.list(parsed.data);
    res.status(200).json(invoices);
  },
  getOne: async (req: Request, res: Response): Promise<void> => {
    const invoice = await invoicesService.getById(readInvoiceId(req));
    res.status(200).json(invoice);
  },
  create: async (req: Request, res: Response): Promise<void> => {
    const invoice = await invoicesService.create(req.body);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "create",
        entity: "Invoice",
        entityId: invoice.id,
        detail: `Created invoice ${invoice.id} for ${invoice.client}`,
      });
    }
    res.status(201).json(invoice);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    const invoiceId = readInvoiceId(req);
    const invoice = await invoicesService.update(invoiceId, req.body);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "update",
        entity: "Invoice",
        entityId: invoiceId,
        detail: `Updated invoice ${invoice.id}`,
      });
    }
    res.status(200).json(invoice);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    const invoiceId = readInvoiceId(req);
    await invoicesService.delete(invoiceId);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "delete",
        entity: "Invoice",
        entityId: invoiceId,
        detail: `Deleted invoice ${invoiceId}`,
      });
    }
    res.status(200).json({ message: "Invoice deleted successfully" });
  },
};
