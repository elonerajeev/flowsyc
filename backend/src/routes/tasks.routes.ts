import { Router } from "express";

import { tasksController } from "../controllers/tasks.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateBody, validateQuery } from "../middleware/validate.middleware";
import { taskQuerySchema } from "../validators/query.schema";
import { createTaskSchema, updateTaskSchema } from "../validators/task.schema";

export const tasksRouter = Router();

tasksRouter.get("/", requireAuth, requireRole(["admin", "manager", "employee"]), validateQuery(taskQuerySchema), asyncHandler(tasksController.list));
tasksRouter.get("/:id", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(tasksController.getOne));
tasksRouter.post("/", requireAuth, requireRole(["admin", "manager", "employee"]), validateBody(createTaskSchema), asyncHandler(tasksController.create));
tasksRouter.patch("/:id", requireAuth, requireRole(["admin", "manager", "employee"]), validateBody(updateTaskSchema), asyncHandler(tasksController.update));
tasksRouter.delete("/:id", requireAuth, requireRole(["admin", "manager"]), asyncHandler(tasksController.remove));
