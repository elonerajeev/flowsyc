import type { Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import { candidatesService } from "../services/candidates.service";
import { logAudit } from "../utils/audit";

function readCandidateId(request: Request) {
  const candidateId = Number(request.params.id);
  if (!Number.isInteger(candidateId) || candidateId <= 0) {
    throw new AppError("Invalid candidate id", 400, "BAD_REQUEST");
  }
  return candidateId;
}

export const candidatesController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const candidates = await candidatesService.list(req.query as any, req.auth);
    res.status(200).json(candidates);
  },
  getOne: async (req: Request, res: Response): Promise<void> => {
    const candidate = await candidatesService.getById(readCandidateId(req), req.auth);
    res.status(200).json(candidate);
  },
  create: async (req: Request, res: Response): Promise<void> => {
    const candidate = await candidatesService.create(req.body, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "create",
        entity: "Candidate",
        entityId: candidate.id,
        detail: `Created: ${candidate.name}`,
      });
    }
    res.status(201).json(candidate);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    const candidateId = readCandidateId(req);
    const candidate = await candidatesService.update(candidateId, req.body, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "update",
        entity: "Candidate",
        entityId: candidateId,
        detail: `Updated: ${candidate.name}`,
      });
    }
    res.status(200).json(candidate);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    const candidateId = readCandidateId(req);
    await candidatesService.delete(candidateId, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "delete",
        entity: "Candidate",
        entityId: candidateId,
        detail: `Deleted candidate #${candidateId}`,
      });
    }
    res.status(200).json({ message: "Candidate deleted successfully" });
  },
  moveToNextStage: async (req: Request, res: Response): Promise<void> => {
    const candidateId = readCandidateId(req);
    const candidate = await candidatesService.moveToNextStage(candidateId, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "stage_change",
        entity: "Candidate",
        entityId: candidateId,
        detail: `Moved to ${candidate.stage}: ${candidate.name}`,
      });

      // Trigger Zapier webhook for candidate_hired event
      if (candidate.stage === "hired") {
        const { systemService } = await import("../services/system.service");
        const zapierConfig = await systemService.getZapierIntegration(req.auth.userId, "candidate_hired");
        if (zapierConfig) {
          systemService.sendZapierEvent(zapierConfig.webhookUrl, "candidate_hired", {
            candidate: {
              id: candidate.id,
              name: candidate.name,
              email: candidate.email,
              stage: candidate.stage,
              jobTitle: candidate.jobTitle,
              department: (candidate as any).JobPosting?.department || "Unknown",
            },
            user: {
              id: req.auth.userId,
              role: req.auth.role,
            },
          });
        }
      }
    }
    res.status(200).json(candidate);
  },
  reject: async (req: Request, res: Response): Promise<void> => {
    const candidateId = readCandidateId(req);
    const candidate = await candidatesService.reject(candidateId, req.body.reason, req.auth);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "update",
        entity: "Candidate",
        entityId: candidateId,
        detail: `Rejected: ${candidate.name}`,
      });
    }
    res.status(200).json(candidate);
  },
  generateOfferLetter: async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Missing session" } });
      return;
    }
    const candidateId = readCandidateId(req);
    const data = await candidatesService.generateOfferLetter(candidateId, req.auth.userId, req.body);
    await logAudit({
      userId: req.auth.userId,
      action: "email_sent",
      entity: "Candidate",
      entityId: candidateId,
      detail: `Offer letter sent to ${data.candidate.email}`,
    });
    res.status(200).json(data);
  },
  getTimeline: async (req: Request, res: Response): Promise<void> => {
    const activities = await candidatesService.getTimeline(readCandidateId(req));
    res.status(200).json(activities);
  },
  addNote: async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) { res.status(401).json({ error: { code: "UNAUTHORIZED" } }); return; }
    const candidateId = readCandidateId(req);
    const candidate = await candidatesService.addNote(candidateId, req.body.note, req.auth.email);
    await logAudit({
      userId: req.auth.userId,
      action: "update",
      entity: "Candidate",
      entityId: candidateId,
      detail: `Added note: ${candidate.name}`,
    });
    res.status(200).json(candidate);
  },
};
