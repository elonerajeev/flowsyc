import { Router } from "express";

import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { devopsLogSourcesService } from "../services/devops-log-sources.service";
import {
  createLogSourceSchema,
  ingestLogsSchema,
  listLogSourceLogsQuerySchema,
  updateLogSourceSchema,
} from "../validators/devops-log-source.schema";

export const devopsLogSourcesRouter = Router();

// External ingest endpoint (no session auth; uses per-source ingest key)
devopsLogSourcesRouter.post(
  "/:id/ingest",
  validateBody(ingestLogsSchema),
  asyncHandler(async (req, res) => {
    const sourceId = devopsLogSourcesService.parsePositiveInt(req.params.id as string, "log source id");
    const result = await devopsLogSourcesService.ingest(sourceId, req.headers, req.body.entries);
    res.status(202).json({
      data: {
        sourceId: result.sourceId,
        accepted: result.entries.length,
      },
    });
  }),
);

devopsLogSourcesRouter.use(requireAuth);

devopsLogSourcesRouter.get(
  "/",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const data = await devopsLogSourcesService.list(req.auth);
    res.json({ data });
  }),
);

devopsLogSourcesRouter.post(
  "/",
  requireRole(["admin"]),
  validateBody(createLogSourceSchema),
  asyncHandler(async (req, res) => {
    const data = await devopsLogSourcesService.create(req.auth, req.body);
    res.status(201).json({ data });
  }),
);

devopsLogSourcesRouter.patch(
  "/:id",
  requireRole(["admin"]),
  validateBody(updateLogSourceSchema),
  asyncHandler(async (req, res) => {
    const sourceId = devopsLogSourcesService.parsePositiveInt(req.params.id as string, "log source id");
    const data = await devopsLogSourcesService.update(req.auth, sourceId, req.body);
    res.json({ data });
  }),
);

devopsLogSourcesRouter.post(
  "/:id/regenerate-key",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const sourceId = devopsLogSourcesService.parsePositiveInt(req.params.id as string, "log source id");
    const data = await devopsLogSourcesService.regenerateKey(req.auth, sourceId);
    res.json({ data });
  }),
);

devopsLogSourcesRouter.delete(
  "/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const sourceId = devopsLogSourcesService.parsePositiveInt(req.params.id as string, "log source id");
    await devopsLogSourcesService.remove(req.auth, sourceId);
    res.json({ message: "Log source removed" });
  }),
);

devopsLogSourcesRouter.get(
  "/:id/logs",
  requireRole(["admin", "manager"]),
  validateQuery(listLogSourceLogsQuerySchema),
  asyncHandler(async (req, res) => {
    const sourceId = devopsLogSourcesService.parsePositiveInt(req.params.id as string, "log source id");
    const { limit } = listLogSourceLogsQuerySchema.parse(req.query);
    const data = await devopsLogSourcesService.getRecentLogs(req.auth, sourceId, limit);
    res.json({ data });
  }),
);
