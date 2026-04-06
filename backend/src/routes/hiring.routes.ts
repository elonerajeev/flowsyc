import { Router } from "express";

import { hiringController } from "../controllers/hiring.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateBody } from "../middleware/validate.middleware";
import { createJobSchema, updateJobSchema } from "../validators/hiring.schema";

export const hiringRouter = Router();

hiringRouter.get("/", requireAuth, requireRole(["admin", "manager"]), asyncHandler(hiringController.list));
hiringRouter.get("/:id", requireAuth, requireRole(["admin", "manager"]), asyncHandler(hiringController.getOne));
hiringRouter.post("/", requireAuth, requireRole(["admin", "manager"]), validateBody(createJobSchema), asyncHandler(hiringController.create));
hiringRouter.patch("/:id", requireAuth, requireRole(["admin", "manager"]), validateBody(updateJobSchema), asyncHandler(hiringController.update));
hiringRouter.post("/:id/toggle-status", requireAuth, requireRole(["admin", "manager"]), asyncHandler(hiringController.toggleStatus));
hiringRouter.post("/:id/clone", requireAuth, requireRole(["admin", "manager"]), asyncHandler(hiringController.clone));
hiringRouter.delete("/:id", requireAuth, requireRole(["admin", "manager"]), asyncHandler(hiringController.remove));
