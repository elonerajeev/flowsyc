import { Router } from "express";

import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { pipelinesService } from "../services/pipelines.service";
import { listPipelinesQuerySchema, syncPipelinesBodySchema } from "../validators/pipeline.schema";

export const pipelinesRouter = Router();

pipelinesRouter.get(
  "/",
  requireAuth,
  requireRole(["admin", "manager", "employee"]),
  validateQuery(listPipelinesQuerySchema),
  asyncHandler(async (req, res) => {
    const query = listPipelinesQuerySchema.parse(req.query);

    const result = await pipelinesService.list(req.auth, {
      limit: query.limit,
      branch: query.branch,
      workflow: query.workflow,
      status: query.status,
    });

    res.json({
      data: result.data,
      meta: {
        source: result.source,
        count: result.data.length,
      },
    });
  }),
);

pipelinesRouter.post(
  "/github/sync",
  requireAuth,
  requireRole(["admin", "manager"]),
  validateBody(syncPipelinesBodySchema),
  asyncHandler(async (req, res) => {
    const { limit } = req.body as { limit?: number };
    const result = await pipelinesService.syncFromGitHub(req.auth, limit ?? 30);
    res.status(202).json({ data: result });
  }),
);

pipelinesRouter.post(
  "/github/webhook",
  asyncHandler(async (req, res) => {
    if (!pipelinesService.isWebhookConfigured()) {
      throw new AppError("GitHub webhook secret is not configured", 503, "WEBHOOK_NOT_CONFIGURED");
    }

    const signatureHeader = req.header("x-hub-signature-256") ?? undefined;
    const event = req.header("x-github-event") ?? undefined;
    const rawBody = req.rawBody ?? "";

    if (!pipelinesService.verifyWebhookSignature(rawBody, signatureHeader)) {
      throw new AppError("Invalid GitHub webhook signature", 401, "INVALID_SIGNATURE");
    }

    const result = await pipelinesService.handleGitHubWebhook(event, req.body);
    res.status(202).json({
      received: true,
      processed: result.processed,
      ignored: result.ignored,
    });
  }),
);
