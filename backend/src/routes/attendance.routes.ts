import { Router } from "express";

import { attendanceController } from "../controllers/attendance.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const attendanceRouter = Router();

attendanceRouter.get("/", requireAuth, requireRole(["admin", "manager"]), asyncHandler(attendanceController.list));
attendanceRouter.patch("/:id", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(attendanceController.update));
