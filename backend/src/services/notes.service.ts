import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { AccessActor } from "../utils/access-control";

type NoteRecord = {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  color: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
};

type NoteInput = {
  title: string;
  content?: string;
  isPinned?: boolean;
  color?: string;
};

function mapNote(note: {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  color: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}): NoteRecord {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    isPinned: note.isPinned,
    color: note.color,
    authorId: note.authorId,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

export const notesService = {
  async list(actor?: AccessActor) {
    const where: { deletedAt: null; authorId?: string } = { deletedAt: null };
    
    // Admin/Manager: see only their own notes; Employee: see their own
    if (actor?.role === "admin" || actor?.role === "manager") {
      where.authorId = actor.email;
    } else if (actor?.role === "employee" && actor.email) {
      where.authorId = actor.email;
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    });
    return { data: notes.map(mapNote) };
  },

  async getById(noteId: number, actor?: AccessActor) {
    const authorId = actor?.email ?? "";
    const note = await prisma.note.findUnique({ where: { id: noteId, authorId } });
    if (!note || note.deletedAt) {
      throw new AppError("Note not found", 404, "NOT_FOUND");
    }
    return mapNote(note);
  },

  async create(actor: AccessActor, input: NoteInput) {
    if (!actor?.email) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }
    const note = await prisma.note.create({
      data: {
        title: input.title,
        content: input.content ?? "",
        isPinned: input.isPinned ?? false,
        color: input.color ?? "default",
        authorId: actor.email,
        updatedAt: new Date(),
      },
    });
    return mapNote(note);
  },

  async update(noteId: number, actor: AccessActor, patch: Partial<NoteInput>) {
    const authorId = actor?.email ?? "";
    const existing = await prisma.note.findUnique({ where: { id: noteId, authorId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Note not found", 404, "NOT_FOUND");
    }

    const note = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.content !== undefined ? { content: patch.content } : {}),
        ...(patch.isPinned !== undefined ? { isPinned: patch.isPinned } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
      },
    });
    return mapNote(note);
  },

  async delete(noteId: number, actor: AccessActor) {
    const authorId = actor?.email ?? "";
    const existing = await prisma.note.findUnique({ where: { id: noteId, authorId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Note not found", 404, "NOT_FOUND");
    }

    await prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: new Date() },
    });
  },
};
