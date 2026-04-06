import type { Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import { teamMembersService } from "../services/team-members.service";
import { logAudit } from "../utils/audit";
import { teamMemberQuerySchema } from "../validators/query.schema";

function readMemberId(request: Request) {
  const memberId = Number(request.params.id);
  if (!Number.isInteger(memberId) || memberId <= 0) {
    throw new AppError("Invalid team member id", 400, "BAD_REQUEST");
  }
  return memberId;
}

export const teamMembersController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const parsed = teamMemberQuerySchema.safeParse(req.query);
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

    const members = await teamMembersService.list(parsed.data);
    res.status(200).json(members);
  },
  getOne: async (req: Request, res: Response): Promise<void> => {
    const member = await teamMembersService.getById(readMemberId(req));
    res.status(200).json(member);
  },
  create: async (req: Request, res: Response): Promise<void> => {
    const member = await teamMembersService.create(req.body);
    res.status(201).json(member);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    const memberId = readMemberId(req);
    const member = await teamMembersService.update(memberId, req.body);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "update",
        entity: "TeamMember",
        entityId: memberId,
        detail: `Updated: ${member.name}`,
      });
    }
    res.status(200).json(member);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    const memberId = readMemberId(req);
    await teamMembersService.delete(memberId);
    if (req.auth) {
      await logAudit({
        userId: req.auth.userId,
        action: "delete",
        entity: "TeamMember",
        entityId: memberId,
        detail: `Deleted team member #${memberId}`,
      });
    }
    res.status(200).json({ message: "Team member deleted successfully" });
  },
};
