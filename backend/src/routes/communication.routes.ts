import { Router } from "express";

import { communicationController } from "../controllers/communication.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const communicationRouter = Router();

communicationRouter.get("/conversations", requireAuth, requireRole(["admin", "manager"]), asyncHandler(communicationController.listConversations));
communicationRouter.get("/messages", requireAuth, requireRole(["admin", "manager"]), asyncHandler(communicationController.listMessages));
communicationRouter.post("/messages", requireAuth, requireRole(["admin", "manager"]), asyncHandler(communicationController.sendMessage));
