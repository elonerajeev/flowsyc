import type { Request, Response } from "express";
import { Router } from "express";

import { requireAuth, requireRole } from "../middleware/auth.middleware";
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
attachmentsRouter.get("/", requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res: Response) => {
  const taskId = req.query.taskId ? Number(req.query.taskId) : undefined;
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20) || 20));
  const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);

  if (!taskId && !projectId) {
    res.status(400).json({ error: "taskId or projectId query param is required" });
    return;
  }

  if (taskId) {
    const { tasksService } = await import("../services/tasks.service");
    await tasksService.getById(taskId, req.auth);
  } else if (projectId) {
    const { projectsService } = await import("../services/projects.service");
    await projectsService.getById(projectId, req.auth);
  }

  const result = await attachmentsService.list({ taskId, projectId, limit, offset });
  res.status(200).json(result);
}));

// POST /api/attachments - Create attachment
attachmentsRouter.post("/", requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res: Response) => {
  const data = createAttachmentSchema.parse(req.body);
  if (data.taskId) {
    const { tasksService } = await import("../services/tasks.service");
    await tasksService.getById(data.taskId, req.auth);
  } else if (data.projectId) {
    const { projectsService } = await import("../services/projects.service");
    await projectsService.getById(data.projectId, req.auth);
  }
  const attachment = await attachmentsService.create(data, req.auth!.userId);
  res.status(201).json(attachment);
}));

// DELETE /api/attachments/:id - Delete attachment
attachmentsRouter.delete("/:id", requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const attachment = await attachmentsService.getById(id);
  if (attachment.taskId) {
    const { tasksService } = await import("../services/tasks.service");
    await tasksService.getById(attachment.taskId, req.auth);
  } else if (attachment.projectId) {
    const { projectsService } = await import("../services/projects.service");
    await projectsService.getById(attachment.projectId, req.auth);
  }
  const result = await attachmentsService.delete(id, req.auth!.userId);
  res.status(200).json(result);
}));

export { attachmentsRouter };
