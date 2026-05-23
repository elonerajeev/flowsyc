import { Router } from "express";

import { staticCrmController } from "../controllers/static-crm.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const staticCrmRouter = Router();

staticCrmRouter.get("/companies", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(staticCrmController.listCompanies));
staticCrmRouter.get("/sales-metrics", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(staticCrmController.getSalesMetrics));
staticCrmRouter.get("/command-actions", requireAuth, asyncHandler(staticCrmController.listCommandActions));
