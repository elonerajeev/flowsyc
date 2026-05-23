import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { monitoringService } from "../services/monitoring.service";
import { createServiceSchema, updateServiceSchema } from "../validators/monitoring.schema";

export const monitoringRouter = Router();

// All routes require auth
monitoringRouter.use(requireAuth);

// GET /api/monitoring/services — list all (admin + manager)
monitoringRouter.get(
  "/services",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const services = await monitoringService.list(req.auth);
    res.json({ data: services });
  }),
);

// GET /api/monitoring/services/:id — single service with check history
monitoringRouter.get(
  "/services/:id",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string);
    const [svc, stats] = await Promise.all([
      monitoringService.getOne(id, req.auth),
      monitoringService.getUptimeStats(id),
    ]);
    res.json({ data: { ...svc, stats } });
  }),
);

// POST /api/monitoring/services — create (admin only)
monitoringRouter.post(
  "/services",
  requireRole(["admin"]),
  validateBody(createServiceSchema),
  asyncHandler(async (req, res) => {
    const svc = await monitoringService.create(req.body, req.auth);
    // Run first check immediately (non-blocking)
    monitoringService.runCheck(svc.id).catch(() => {});
    res.status(201).json({ data: svc });
  }),
);

// PATCH /api/monitoring/services/:id — update (admin only)
monitoringRouter.patch(
  "/services/:id",
  requireRole(["admin"]),
  validateBody(updateServiceSchema),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string);
    const svc = await monitoringService.update(id, req.body, req.auth);
    res.json({ data: svc });
  }),
);

// DELETE /api/monitoring/services/:id — soft delete (admin only)
monitoringRouter.delete(
  "/services/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string);
    await monitoringService.remove(id, req.auth);
    res.json({ message: "Service removed" });
  }),
);

// POST /api/monitoring/services/:id/check — trigger manual check (admin + manager)
monitoringRouter.post(
  "/services/:id/check",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string);
    await monitoringService.runCheck(id);
    const [svc, stats] = await Promise.all([
      monitoringService.getOne(id, req.auth),
      monitoringService.getUptimeStats(id),
    ]);
    res.json({ data: { ...svc, stats } });
  }),
);
