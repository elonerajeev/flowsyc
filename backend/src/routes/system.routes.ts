import type { Request, Response } from "express";
import { Router } from "express";

import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { systemService } from "../services/system.service";
import { getAuditLogs } from "../utils/audit";
import { asyncHandler } from "../utils/async-handler";

const systemRouter = Router();

systemRouter.get("/theme-previews", (_req: Request, res: Response) => {
  res.status(200).json(systemService.getThemePreviews());
});

// GET /system/integrations - get user's integration states
systemRouter.get("/integrations", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const rows = await (prisma as any).integration.findMany({ where: { userId: req.auth!.userId } });
    res.status(200).json({ data: rows });
  } catch {
    // Table may not exist yet - return empty
    res.status(200).json({ data: [] });
  }
}));

// PATCH /system/integrations/:id - connect/disconnect/update integration
systemRouter.patch("/integrations/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, config, name } = req.body;
    const existing = await (prisma as any).integration.findFirst({ where: { id, userId: req.auth!.userId } });

    if (existing) {
      const updated = await (prisma as any).integration.update({
        where: { id },
        data: {
          ...(status !== undefined && { status }),
          ...(config !== undefined && { config }),
          ...(status === "connected" && { connectedAt: new Date() }),
          updatedAt: new Date(),
        },
      });
      res.status(200).json(updated);
    } else {
      const created = await (prisma as any).integration.create({
        data: {
          id,
          userId: req.auth!.userId,
          name: name ?? id,
          status: status ?? "disconnected",
          config: config ?? {},
          ...(status === "connected" && { connectedAt: new Date() }),
          updatedAt: new Date(),
        },
      });
      res.status(201).json(created);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to persist integration", details: error instanceof Error ? error.message : "Unknown error" });
  }
}));

systemRouter.get("/audit", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 100) || 100));
  const logs = await getAuditLogs(limit);
  res.status(200).json({ data: logs });
}));

export { systemRouter };
