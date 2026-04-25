import type { Request, Response } from "express";
import { Router } from "express";

import { requireAuth } from "../middleware/auth.middleware";
import { attachmentsService } from "../services/attachments.service";
import { asyncHandler } from "../utils/async-handler";
import { z } from "zod";

const createAttachmentSchema = z.object({
  filename: z.string(),
  originalName: z.string(),
  url: z.string().url(),
  size: z.number().int().positive(),
  mimetype: z.string(),
  taskId: z.number().optional(),
  projectId: z.number().optional(),
}).refine(data => data.taskId || data.projectId, {
  message: "Attachment must be associated with either a task or project",
});

const attachmentsRouter = Router();

attachmentsRouter.use(requireAuth);

// GET /api/attachments - List attachments
attachmentsRouter.get("/", asyncHandler(async (req: Request, res: Response) => {
  const taskId = req.query.taskId ? Number(req.query.taskId) : undefined;
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20) || 20));
  const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);

  const result = await attachmentsService.list({ taskId, projectId, limit, offset });
  res.status(200).json(result);
}));

// POST /api/attachments - Create attachment
attachmentsRouter.post("/", asyncHandler(async (req: Request, res: Response) => {
  const data = createAttachmentSchema.parse(req.body);
  const attachment = await attachmentsService.create(data, req.auth!.userId);
  res.status(201).json(attachment);
}));

// DELETE /api/attachments/:id - Delete attachment
attachmentsRouter.delete("/:id", asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const result = await attachmentsService.delete(id, req.auth!.userId);
  res.status(200).json(result);
}));

export { attachmentsRouter };
