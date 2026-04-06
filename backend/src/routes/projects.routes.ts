import { Router } from "express";

import { projectsController } from "../controllers/projects.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { projectQuerySchema } from "../validators/query.schema";
import { createProjectSchema, updateProjectSchema } from "../validators/project.schema";

export const projectsRouter = Router();

projectsRouter.get("/", requireAuth, requireRole(["admin", "manager", "employee"]), validateQuery(projectQuerySchema), asyncHandler(projectsController.list));
projectsRouter.get("/:id", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(projectsController.getOne));
projectsRouter.post("/", requireAuth, requireRole(["admin", "manager"]), validateBody(createProjectSchema), asyncHandler(projectsController.create));
projectsRouter.patch("/:id", requireAuth, requireRole(["admin", "manager"]), validateBody(updateProjectSchema), asyncHandler(projectsController.update));
projectsRouter.delete("/:id", requireAuth, requireRole(["admin"]), asyncHandler(projectsController.remove));
