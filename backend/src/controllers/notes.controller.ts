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
    const notes = await notesService.list(req.auth);
    res.status(200).json(notes);
  },
  getOne: async (req: Request, res: Response): Promise<void> => {
    const note = await notesService.getById(readNoteId(req), req.auth);
    res.status(200).json(note);
  },
  create: async (req: Request, res: Response): Promise<void> => {
    const note = await notesService.create(req.auth, req.body);
    await logAudit({
      userId: req.auth?.userId ?? "",
      action: "create",
      entity: "Note",
      entityId: note.id,
      detail: `Created: ${note.title}`,
    });
    res.status(201).json(note);
  },
  update: async (req: Request, res: Response): Promise<void> => {
    const noteId = readNoteId(req);
    const updated = await notesService.update(noteId, req.auth, req.body);
    await logAudit({
      userId: req.auth?.userId ?? "",
      action: "update",
      entity: "Note",
      entityId: noteId,
      detail: `Updated: ${updated.title}`,
    });
    res.status(200).json(updated);
  },
  remove: async (req: Request, res: Response): Promise<void> => {
    const noteId = readNoteId(req);
    await notesService.delete(noteId, req.auth);
    await logAudit({
      userId: req.auth?.userId ?? "",
      action: "delete",
      entity: "Note",
      entityId: noteId,
      detail: `Deleted note #${noteId}`,
    });
    res.status(200).json({ message: "Note deleted successfully" });
  },
};
