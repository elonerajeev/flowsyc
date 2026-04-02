import type { Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import { projectsService } from "../services/projects.service";
import { logAudit } from "../utils/audit";
import { projectQuerySchema } from "../validators/query.schema";

function readProjectId(request: Request) {
  const projectId = Number(request.params.id);
  if (!Number.isInteger(projectId) || projectId <= 0) {
    throw new AppError("Invalid project id", 400, "BAD_REQUEST");
  }
  return projectId;
}

export const projectsController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const parsed = projectQuerySchema.safeParse(req.query);
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

    const projects = await projectsService.list(parsed.data);
    res.status(200).json(projects);
  },
  getOne: async (req: Request, res: Response): Promise<void> => {
    const project = await projectsService.getById(readProjectId(req));
    res.status(200).json(project);
  },
  create: async (req: Request, res: Response): Promise<void> => {
    const project = await projectsService.create(req.body);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "create",
        entity: "Project",
        entityId: project.id,
        detail: `Created: ${project.name}`,
      });
    }
    res.status(201).json(project);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    const projectId = readProjectId(req);
    const project = await projectsService.update(projectId, req.body);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "update",
        entity: "Project",
        entityId: projectId,
        detail: `Updated: ${project.name}`,
      });
    }
    res.status(200).json(project);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    const projectId = readProjectId(req);
    await projectsService.delete(projectId);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "delete",
        entity: "Project",
        entityId: projectId,
        detail: `Deleted project #${projectId}`,
      });
    }
    res.status(200).json({ message: "Project deleted successfully" });
  },
};
