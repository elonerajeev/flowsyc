import { Router } from "express";

import { invoicesController } from "../controllers/invoices.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { invoiceQuerySchema } from "../validators/query.schema";
import { createInvoiceSchema, updateInvoiceSchema } from "../validators/invoice.schema";

export const invoicesRouter = Router();

invoicesRouter.get("/", requireAuth, requireRole(["admin", "manager", "client"]), validateQuery(invoiceQuerySchema), asyncHandler(invoicesController.list));
invoicesRouter.get("/:id", requireAuth, requireRole(["admin", "manager", "client"]), asyncHandler(invoicesController.getOne));
invoicesRouter.post("/", requireAuth, requireRole(["admin", "manager"]), validateBody(createInvoiceSchema), asyncHandler(invoicesController.create));
invoicesRouter.patch("/:id", requireAuth, requireRole(["admin", "manager"]), validateBody(updateInvoiceSchema), asyncHandler(invoicesController.update));
invoicesRouter.delete("/:id", requireAuth, requireRole(["admin"]), asyncHandler(invoicesController.remove));
invoicesRouter.post("/:id/remind", requireAuth, requireRole(["admin", "manager"]), asyncHandler(invoicesController.sendReminder));
