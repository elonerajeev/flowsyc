import { Router } from "express";

import { notesController } from "../controllers/notes.controller";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { validateBody } from "../middleware/validate.middleware";
import { createNoteSchema, updateNoteSchema } from "../validators/note.schema";

export const notesRouter = Router();

notesRouter.get("/", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(notesController.list));
notesRouter.get("/:id", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(notesController.getOne));
notesRouter.post("/", requireAuth, requireRole(["admin", "manager", "employee"]), validateBody(createNoteSchema), asyncHandler(notesController.create));
notesRouter.patch("/:id", requireAuth, requireRole(["admin", "manager", "employee"]), validateBody(updateNoteSchema), asyncHandler(notesController.update));
notesRouter.delete("/:id", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(notesController.remove));
