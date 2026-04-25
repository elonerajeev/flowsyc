import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";

export type CommentCreateInput = {
  content: string;
  taskId?: number;
  projectId?: number;
};

export type CommentUpdateInput = {
  content: string;
};

export type CommentFilters = {
  taskId?: number;
  projectId?: number;
  limit?: number;
  offset?: number;
};

export const commentsService = {
  async create(data: CommentCreateInput, authorId: string) {
    if (!data.taskId && !data.projectId) {
      throw new AppError("Comment must be associated with either a task or project", 400, "BAD_REQUEST");
    }

    return await prisma.comment.create({
      data: {
        content: data.content,
        authorId,
        taskId: data.taskId,
        projectId: data.projectId,
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async getById(id: number) {
    const comment = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!comment) {
      throw new AppError("Comment not found", 404, "NOT_FOUND");
    }

    return comment;
  },

  async list(filters: CommentFilters = {}) {
    const { taskId, projectId, limit = 20, offset = 0 } = filters;

    const where: any = { deletedAt: null };
    if (taskId) where.taskId = taskId;
    if (projectId) where.projectId = projectId;

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: limit,
        skip: offset,
      }),
      prisma.comment.count({ where }),
    ]);

    return { data: comments, total, limit, offset };
  },

  async update(id: number, data: CommentUpdateInput, authorId: string) {
    const comment = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!comment) {
      throw new AppError("Comment not found", 404, "NOT_FOUND");
    }

    if (comment.authorId !== authorId) {
      throw new AppError("Only the author can edit this comment", 403, "FORBIDDEN");
    }

    return await prisma.comment.update({
      where: { id },
      data: {
        content: data.content,
        updatedAt: new Date(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  },

  async delete(id: number, authorId: string) {
    const comment = await prisma.comment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!comment) {
      throw new AppError("Comment not found", 404, "NOT_FOUND");
    }

    if (comment.authorId !== authorId) {
      throw new AppError("Only the author can delete this comment", 403, "FORBIDDEN");
    }

    await prisma.comment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  },
};
