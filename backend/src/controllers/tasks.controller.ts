import type { Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import { tasksService } from "../services/tasks.service";
import { logAudit } from "../utils/audit";
import { taskQuerySchema } from "../validators/query.schema";

function readTaskId(request: Request) {
  const taskId = Number(request.params.id);
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new AppError("Invalid task id", 400, "BAD_REQUEST");
  }
  return taskId;
}

export const tasksController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const parsed = taskQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const tasks = await tasksService.list(parsed.data, req.auth);
    res.status(200).json(tasks);
  },
  getOne: async (req: Request, res: Response): Promise<void> => {
    const task = await tasksService.getById(readTaskId(req), req.auth);
    res.status(200).json(task);
  },
  create: async (req: Request, res: Response): Promise<void> => {
    const task = await tasksService.create(req.body, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "create",
        entity: "Task",
        entityId: task.id,
        detail: `Created: ${task.title}`,
      });

      // Trigger Zapier webhook for task_assigned event
      const { systemService } = await import("../services/system.service");
      const zapierConfig = await systemService.getZapierIntegration(req.auth.userId, "task_assigned");
      if (zapierConfig) {
        systemService.sendZapierEvent(zapierConfig.webhookUrl, "task_assigned", {
          task: {
            id: task.id,
            title: task.title,
            priority: task.priority,
            dueDate: task.dueDate,
            assignee: task.assignee,
            tags: task.tags,
            valueStream: task.valueStream,
          },
          user: {
            id: req.auth.userId,
            role: req.auth.role,
          },
        });
      }
    }
    res.status(201).json(task);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    const taskId = readTaskId(req);
    const task = await tasksService.update(taskId, req.body, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "update",
        entity: "Task",
        entityId: taskId,
        detail: `Updated: ${task.title}`,
      });
    }
    res.status(200).json(task);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    const taskId = readTaskId(req);
    await tasksService.delete(taskId, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "delete",
        entity: "Task",
        entityId: taskId,
        detail: `Deleted task #${taskId}`,
      });
    }
    res.status(200).json({ message: "Task deleted successfully" });
  },
};
