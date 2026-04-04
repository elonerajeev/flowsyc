import { Router } from "express";

import { teamMembersController } from "../controllers/team-members.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { teamMemberQuerySchema } from "../validators/query.schema";
import { createTeamMemberSchema, updateTeamMemberSchema } from "../validators/team-member.schema";

export const teamMembersRouter = Router();

teamMembersRouter.get("/", requireAuth, requireRole(["admin", "manager"]), validateQuery(teamMemberQuerySchema), asyncHandler(teamMembersController.list));
teamMembersRouter.get("/:id", requireAuth, requireRole(["admin", "manager"]), asyncHandler(teamMembersController.getOne));
teamMembersRouter.post("/", requireAuth, requireRole(["admin", "manager"]), validateBody(createTeamMemberSchema), asyncHandler(teamMembersController.create));
teamMembersRouter.patch("/:id", requireAuth, requireRole(["admin", "manager"]), validateBody(updateTeamMemberSchema), asyncHandler(teamMembersController.update));
teamMembersRouter.delete("/:id", requireAuth, requireRole(["admin"]), asyncHandler(teamMembersController.remove));
