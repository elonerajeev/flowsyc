import { Router } from "express";

import { clientsController } from "../controllers/clients.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { clientQuerySchema, createClientSchema, updateClientSchema } from "../validators/client.schema";

export const clientsRouter = Router();

clientsRouter.get("/", requireAuth, requireRole(["admin", "manager", "client"]), validateQuery(clientQuerySchema), asyncHandler(clientsController.list));
clientsRouter.get("/pipeline", requireAuth, requireRole(["admin", "manager", "client"]), asyncHandler(clientsController.getPipeline));
clientsRouter.get("/:id", requireAuth, requireRole(["admin", "manager", "client"]), asyncHandler(clientsController.getOne));
clientsRouter.post("/", requireAuth, requireRole(["admin", "manager"]), validateBody(createClientSchema), asyncHandler(clientsController.create));
clientsRouter.patch("/:id", requireAuth, requireRole(["admin", "manager"]), validateBody(updateClientSchema), asyncHandler(clientsController.update));
clientsRouter.delete("/:id", requireAuth, requireRole(["admin"]), asyncHandler(clientsController.remove));
