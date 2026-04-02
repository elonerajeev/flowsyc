import type { Request, Response } from "express";

import { AppError } from "../middleware/error.middleware";
import { notesService } from "../services/notes.service";
import { logAudit } from "../utils/audit";

function readNoteId(request: Request) {
  const noteId = Number(request.params.id);
  if (!Number.isInteger(noteId) || noteId <= 0) {
    throw new AppError("Invalid note id", 400, "BAD_REQUEST");
  }
  return noteId;
}

export const notesController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const requestedAuthorId = typeof req.query.authorId === "string" && req.query.authorId.trim()
      ? req.query.authorId.trim()
      : undefined;
    const sessionUserId = req.auth?.userId;
    if (!sessionUserId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const hasPrivilegedRead = req.auth?.role === "admin" || req.auth?.role === "manager";
    if (requestedAuthorId && requestedAuthorId !== sessionUserId && !hasPrivilegedRead) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const authorId = requestedAuthorId ?? sessionUserId;
    const notes = await notesService.list(authorId);
    res.status(200).json(notes);
  },
  getOne: async (req: Request, res: Response): Promise<void> => {
    const note = await notesService.getById(readNoteId(req));
    if (req.auth?.userId !== note.authorId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    res.status(200).json(note);
  },
  create: async (req: Request, res: Response): Promise<void> => {
    if (!req.auth?.userId) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const note = await notesService.create(req.auth.userId, req.body);
    await logAudit({
      userId: req.auth.userId,
      action: "create",
      entity: "Note",
      entityId: note.id,
      detail: `Created: ${note.title}`,
    });
    res.status(201).json(note);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    const note = await notesService.getById(readNoteId(req));
    if (req.auth?.userId !== note.authorId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    const updated = await notesService.update(note.id, req.body);
    if (req.auth?.userId) {
      await logAudit({
        userId: req.auth.userId,
        action: "update",
        entity: "Note",
        entityId: note.id,
        detail: `Updated: ${updated.title}`,
      });
    }
    res.status(200).json(updated);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    const note = await notesService.getById(readNoteId(req));
    if (req.auth?.userId !== note.authorId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }
    await notesService.delete(note.id);
    if (req.auth?.userId) {
      await logAudit({
        userId: req.auth.userId,
        action: "delete",
        entity: "Note",
        entityId: note.id,
        detail: `Deleted note #${note.id}`,
      });
    }
    res.status(200).json({ message: "Note deleted successfully" });
  },
};
