import { Router } from "express";

import { staticCrmController } from "../controllers/static-crm.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const staticCrmRouter = Router();

staticCrmRouter.get("/companies", requireAuth, asyncHandler(staticCrmController.listCompanies));
staticCrmRouter.get("/sales-metrics", requireAuth, asyncHandler(staticCrmController.getSalesMetrics));
staticCrmRouter.get("/command-actions", requireAuth, asyncHandler(staticCrmController.listCommandActions));
