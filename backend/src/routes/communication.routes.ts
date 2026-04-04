import { Router } from "express";

import { communicationController } from "../controllers/communication.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const communicationRouter = Router();

communicationRouter.get("/conversations", requireAuth, asyncHandler(communicationController.listConversations));
communicationRouter.get("/messages", requireAuth, asyncHandler(communicationController.listMessages));
communicationRouter.post("/messages", requireAuth, asyncHandler(communicationController.sendMessage));
