import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { deploymentsService } from "../services/deployments.service";
import { createDeploymentSchema, listDeploymentsQuerySchema, updateDeploymentSchema } from "../validators/deployment.schema";

export const deploymentsRouter = Router();

function parsePositiveInt(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`Invalid ${label}`, 400, "VALIDATION_ERROR");
  }
  return parsed;
}

deploymentsRouter.use(requireAuth);

deploymentsRouter.get(
  "/",
  requireRole(["admin", "manager", "employee"]),
  validateQuery(listDeploymentsQuerySchema),
  asyncHandler(async (req, res) => {
    const { limit } = listDeploymentsQuerySchema.parse(req.query);
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
    const id = parsePositiveInt(req.params.id as string, "deployment id");
    const data = await deploymentsService.updateStatus(id, req.body, req.auth);
    res.json({ data });
  }),
);

deploymentsRouter.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const id = parsePositiveInt(req.params.id as string, "deployment id");
    await deploymentsService.remove(id, req.auth);
    res.json({ message: "Deployment removed" });
  }),
);
