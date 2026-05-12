import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { deploymentsService } from "../services/deployments.service";
import { createDeploymentSchema, updateDeploymentSchema } from "../validators/deployment.schema";

export const deploymentsRouter = Router();

deploymentsRouter.use(requireAuth);

deploymentsRouter.get(
  "/",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string || "50"), 200);
    const data = await deploymentsService.list(req.auth, limit);
    res.json({ data });
  }),
);

deploymentsRouter.post(
  "/",
  requireRole(["admin", "manager"]),
  validateBody(createDeploymentSchema),
  asyncHandler(async (req, res) => {
    const data = await deploymentsService.create(req.body, req.auth);
    res.status(201).json({ data });
  }),
);

deploymentsRouter.patch(
  "/:id/status",
  requireRole(["admin", "manager"]),
  validateBody(updateDeploymentSchema),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string);
    const data = await deploymentsService.updateStatus(id, req.body, req.auth);
    res.json({ data });
  }),
);

deploymentsRouter.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string);
    await deploymentsService.remove(id, req.auth);
    res.json({ message: "Deployment removed" });
  }),
);
