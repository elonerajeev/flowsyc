import { Router } from "express";

import { AppError } from "../middleware/error.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { teamsService } from "../services/teams.service";
import { createTeamSchema, updateTeamSchema } from "../validators/team.schema";

const teamsRouter = Router();

function readId(value: string | string[] | undefined, label: string) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) {
    throw new AppError(`Invalid ${label}`, 400, "BAD_REQUEST");
  }
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`Invalid ${label}`, 400, "BAD_REQUEST");
  }
  return parsed;
}

teamsRouter
  .route("/")
  .get(requireAuth, requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    const teams = await teamsService.list();
    res.json(teams);
  }))
  .post(requireAuth, requireRole(["admin", "manager"]), validateBody(createTeamSchema), asyncHandler(async (req, res) => {
    const team = await teamsService.create(req.body);
    res.status(201).json(team);
  }));

teamsRouter
  .route("/:id")
  .get(requireAuth, requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    const team = await teamsService.getById(readId(req.params.id, "team id"));
    res.json(team);
  }))
  .patch(requireAuth, requireRole(["admin", "manager"]), validateBody(updateTeamSchema), asyncHandler(async (req, res) => {
    const team = await teamsService.update(readId(req.params.id, "team id"), req.body);
    res.json(team);
  }))
  .delete(requireAuth, requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    await teamsService.delete(readId(req.params.id, "team id"));
    res.status(204).send();
  }));

teamsRouter
  .route("/:id/members/:memberId")
  .post(requireAuth, requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    await teamsService.assignMember(
      readId(req.params.id, "team id"),
      readId(req.params.memberId, "team member id"),
    );
    res.status(200).json({ message: "Member assigned to team" });
  }))
  .delete(requireAuth, requireRole(["admin", "manager"]), asyncHandler(async (req, res) => {
    await teamsService.removeMember(
      readId(req.params.id, "team id"),
      readId(req.params.memberId, "team member id"),
    );
    res.status(200).json({ message: "Member removed from team" });
  }));

export { teamsRouter };
