import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";

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
  async list(authorId: string) {
    const notes = await prisma.note.findMany({
      where: { deletedAt: null, authorId },
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
    });
    return { data: notes.map(mapNote) };
  },

  async getById(noteId: number, authorId: string) {
    const note = await prisma.note.findUnique({ where: { id: noteId, authorId } });
    if (!note || note.deletedAt) {
      throw new AppError("Note not found", 404, "NOT_FOUND");
    }
    return mapNote(note);
  },

  async create(authorId: string, input: NoteInput) {
    const note = await prisma.note.create({
      data: {
        title: input.title,
        content: input.content ?? "",
        isPinned: input.isPinned ?? false,
        color: input.color ?? "default",
        authorId,
        updatedAt: new Date(),
      },
    });
    return mapNote(note);
  },

  async update(noteId: number, authorId: string, patch: Partial<NoteInput>) {
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

  async delete(noteId: number, authorId: string) {
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
