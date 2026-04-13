import type { Request, Response } from "express";
import { Router } from "express";

import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { commentsService } from "../services/comments.service";
import { asyncHandler } from "../utils/async-handler";
import { z } from "zod";

const createCommentSchema = z.object({
  content: z.string().min(1).max(1000),
  taskId: z.number().optional(),
  projectId: z.number().optional(),
}).refine(data => data.taskId || data.projectId, {
  message: "Comment must be associated with either a task or project",
});

const updateCommentSchema = z.object({
  content: z.string().min(1).max(1000),
});

const commentsRouter = Router();

commentsRouter.use(requireAuth);

// GET /api/comments - List comments
commentsRouter.get("/", requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res: Response) => {
  const taskId = req.query.taskId ? Number(req.query.taskId) : undefined;
  const projectId = req.query.projectId ? Number(req.query.projectId) : undefined;
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50) || 50));
  const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);

  // Validate access to parent entity
  if (taskId) {
    const { tasksService } = await import("../services/tasks.service");
    await tasksService.getById(taskId, req.auth); // This will throw if no access
  } else if (projectId) {
    const { projectsService } = await import("../services/projects.service");
    await projectsService.getById(projectId, req.auth); // This will throw if no access
  }

  const result = await commentsService.list({ taskId, projectId, limit, offset });
  res.status(200).json(result);
}));

// POST /api/comments - Create comment
commentsRouter.post("/", requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res: Response) => {
  const data = createCommentSchema.parse(req.body);

  // Validate access to parent entity
  if (data.taskId) {
    const { tasksService } = await import("../services/tasks.service");
    await tasksService.getById(data.taskId, req.auth); // This will throw if no access
  } else if (data.projectId) {
    const { projectsService } = await import("../services/projects.service");
    await projectsService.getById(data.projectId, req.auth); // This will throw if no access
  }

  const comment = await commentsService.create(data, req.auth!.userId);
  res.status(201).json(comment);
}));

// PATCH /api/comments/:id - Update comment
commentsRouter.patch("/:id", requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const data = updateCommentSchema.parse(req.body);

  // Get comment to validate parent access
  const comment = await commentsService.getById(id);
  if (comment.taskId) {
    const { tasksService } = await import("../services/tasks.service");
    await tasksService.getById(comment.taskId, req.auth); // This will throw if no access
  } else if (comment.projectId) {
    const { projectsService } = await import("../services/projects.service");
    await projectsService.getById(comment.projectId, req.auth); // This will throw if no access
  }

  const updatedComment = await commentsService.update(id, data, req.auth!.userId);
  res.status(200).json(updatedComment);
}));

// DELETE /api/comments/:id - Delete comment
commentsRouter.delete("/:id", requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  // Get comment to validate parent access
  const comment = await commentsService.getById(id);
  if (comment.taskId) {
    const { tasksService } = await import("../services/tasks.service");
    await tasksService.getById(comment.taskId, req.auth); // This will throw if no access
  } else if (comment.projectId) {
    const { projectsService } = await import("../services/projects.service");
    await projectsService.getById(comment.projectId, req.auth); // This will throw if no access
  }

  const result = await commentsService.delete(id, req.auth!.userId);
  res.status(200).json(result);
}));

export { commentsRouter };