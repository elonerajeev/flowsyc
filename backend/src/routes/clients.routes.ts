import { Router } from "express";

import { clientsController } from "../controllers/clients.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { clientQuerySchema, createClientSchema, updateClientSchema } from "../validators/client.schema";
import { GTMAutomationService } from "../services/gtm-automation.service";

export const clientsRouter = Router();

clientsRouter.get("/", requireAuth, requireRole(["admin", "manager", "client"]), validateQuery(clientQuerySchema), asyncHandler(clientsController.list));
clientsRouter.get("/pipeline", requireAuth, requireRole(["admin", "manager", "client"]), asyncHandler(clientsController.getPipeline));
clientsRouter.get("/:id", requireAuth, requireRole(["admin", "manager", "client"]), asyncHandler(clientsController.getOne));
clientsRouter.post("/", requireAuth, requireRole(["admin", "manager"]), validateBody(createClientSchema), asyncHandler(clientsController.create));
clientsRouter.post("/:id/recalculate-health", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(async (req, res) => {
  const clientId = Number(req.params.id);
  const result = await GTMAutomationService.calculateClientHealthScore(clientId);
  res.json(result);
}));
clientsRouter.patch("/:id", requireAuth, requireRole(["admin", "manager"]), validateBody(updateClientSchema), asyncHandler(clientsController.update));
clientsRouter.delete("/:id", requireAuth, requireRole(["admin"]), asyncHandler(clientsController.remove));
