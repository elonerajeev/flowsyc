import { Router } from "express";

import { candidatesController } from "../controllers/candidates.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateBody } from "../middleware/validate.middleware";
import { createCandidateSchema, updateCandidateSchema } from "../validators/hiring.schema";

export const candidatesRouter = Router();

candidatesRouter.get("/", requireAuth, requireRole(["admin", "manager"]), asyncHandler(candidatesController.list));
candidatesRouter.get("/:id", requireAuth, requireRole(["admin", "manager"]), asyncHandler(candidatesController.getOne));
candidatesRouter.post("/", requireAuth, requireRole(["admin", "manager"]), validateBody(createCandidateSchema), asyncHandler(candidatesController.create));
candidatesRouter.patch("/:id", requireAuth, requireRole(["admin", "manager"]), validateBody(updateCandidateSchema), asyncHandler(candidatesController.update));
candidatesRouter.post("/:id/next-stage", requireAuth, requireRole(["admin", "manager"]), asyncHandler(candidatesController.moveToNextStage));
candidatesRouter.post("/:id/reject", requireAuth, requireRole(["admin", "manager"]), asyncHandler(candidatesController.reject));
candidatesRouter.post("/:id/offer-letter", requireAuth, requireRole(["admin", "manager"]), asyncHandler(candidatesController.generateOfferLetter));
candidatesRouter.get("/:id/timeline", requireAuth, requireRole(["admin", "manager"]), asyncHandler(candidatesController.getTimeline));
candidatesRouter.post("/:id/note", requireAuth, requireRole(["admin", "manager"]), asyncHandler(candidatesController.addNote));
candidatesRouter.delete("/:id", requireAuth, requireRole(["admin", "manager"]), asyncHandler(candidatesController.remove));
