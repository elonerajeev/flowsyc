import { Router } from "express";

import { reportsController } from "../controllers/reports.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const reportsRouter = Router();

reportsRouter.get("/", requireAuth, requireRole(["admin", "manager"]), asyncHandler(reportsController.list));
reportsRouter.get("/analytics", requireAuth, requireRole(["admin", "manager"]), asyncHandler(reportsController.getAnalytics));
