import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";

export type AttachmentCreateInput = {
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimetype: string;
  taskId?: number;
  projectId?: number;
};

export type AttachmentFilters = {
  taskId?: number;
  projectId?: number;
  limit?: number;
  offset?: number;
};

export const attachmentsService = {
  async create(data: AttachmentCreateInput, authorId: string) {
    if (!data.taskId && !data.projectId) {
      throw new AppError("Attachment must be associated with either a task or project", 400, "BAD_REQUEST");
    }

    return await prisma.attachment.create({
      data: {
        filename: data.filename,
        originalName: data.originalName,
        url: data.url,
        size: data.size,
        mimetype: data.mimetype,
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

  async list(filters: AttachmentFilters = {}) {
    const { taskId, projectId, limit = 20, offset = 0 } = filters;

    const where: any = { deletedAt: null };
    if (taskId) where.taskId = taskId;
    if (projectId) where.projectId = projectId;

    const [attachments, total] = await Promise.all([
      prisma.attachment.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.attachment.count({ where }),
    ]);

    return { data: attachments, total, limit, offset };
  },

  async delete(id: number, authorId: string) {
    const attachment = await prisma.attachment.findFirst({
      where: { id, deletedAt: null },
    });

    if (!attachment) {
      throw new AppError("Attachment not found", 404, "NOT_FOUND");
    }

    if (attachment.authorId !== authorId) {
      throw new AppError("Only the author can delete this attachment", 403, "FORBIDDEN");
    }

    await prisma.attachment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, filename: attachment.filename };
  },
};
