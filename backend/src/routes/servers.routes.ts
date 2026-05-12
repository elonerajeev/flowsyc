import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { serversService } from "../services/servers.service";
import { createServerSchema, updateServerSchema } from "../validators/server.schema";

export const serversRouter = Router();

serversRouter.use(requireAuth);

serversRouter.get(
  "/",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const servers = await serversService.list(req.auth);
    res.json({ data: servers });
  }),
);

serversRouter.post(
  "/",
  requireRole(["admin"]),
  validateBody(createServerSchema),
  asyncHandler(async (req, res) => {
    const server = await serversService.create(req.body, req.auth);
    res.status(201).json({ data: server });
  }),
);

serversRouter.patch(
  "/:id",
  requireRole(["admin"]),
  validateBody(updateServerSchema),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string);
    const server = await serversService.update(id, req.body, req.auth);
    res.json({ data: server });
  }),
);

serversRouter.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string);
    await serversService.remove(id, req.auth);
    res.json({ message: "Server removed" });
  }),
);

// POST /api/servers/:id/ping — manual reachability check
serversRouter.post(
  "/:id/ping",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const id = parseInt(req.params.id as string);
    const result = await serversService.ping(id, req.auth);
    res.json({ data: result });
  }),
);
