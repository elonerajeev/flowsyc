import type { Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import { hiringService } from "../services/hiring.service";
import { logAudit } from "../utils/audit";

function readJobId(request: Request) {
  const jobId = Number(request.params.id);
  if (!Number.isInteger(jobId) || jobId <= 0) {
    throw new AppError("Invalid job id", 400, "BAD_REQUEST");
  }
  return jobId;
}

export const hiringController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const jobs = await hiringService.list(req.auth);
    res.status(200).json(jobs);
  },
  getOne: async (req: Request, res: Response): Promise<void> => {
    const job = await hiringService.getById(readJobId(req), req.auth);
    res.status(200).json(job);
  },
  create: async (req: Request, res: Response): Promise<void> => {
    const job = await hiringService.create(req.body, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "create",
        entity: "JobPosting",
        entityId: job.id,
        detail: `Created: ${job.title}`,
      });
    }
    res.status(201).json(job);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    const jobId = readJobId(req);
    const job = await hiringService.update(jobId, req.body, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "update",
        entity: "JobPosting",
        entityId: jobId,
        detail: `Updated: ${job.title}`,
      });
    }
    res.status(200).json(job);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    const jobId = readJobId(req);
    await hiringService.delete(jobId, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "delete",
        entity: "JobPosting",
        entityId: jobId,
        detail: `Deleted job posting #${jobId}`,
      });
    }
    res.status(200).json({ message: "Job posting deleted successfully" });
  },
  toggleStatus: async (req: Request, res: Response): Promise<void> => {
    const jobId = readJobId(req);
    const job = await hiringService.toggleStatus(jobId, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "update",
        entity: "JobPosting",
        entityId: jobId,
        detail: `Toggled status: ${job.title}`,
      });
    }
    res.status(200).json(job);
  },
  clone: async (req: Request, res: Response): Promise<void> => {
    const job = await hiringService.clone(readJobId(req), req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "create",
        entity: "JobPosting",
        entityId: job.id,
        detail: `Cloned: ${job.title}`,
      });
    }
    res.status(201).json(job);
  },
};