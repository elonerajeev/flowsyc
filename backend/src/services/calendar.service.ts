import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { AccessActor } from "../utils/access-control";

async function buildCalendarWhere(actor: AccessActor) {
  const where: any = { deletedAt: null };

  if (actor?.role === "employee") {
    const member = await prisma.teamMember.findFirst({
      where: { email: { equals: actor.email, mode: "insensitive" }, deletedAt: null },
      select: { name: true, team: true },
    });

    where.OR = [
      { authorId: actor.userId },
      { AND: [{ assignmentKind: "member" }, { assigneeId: actor.email }] },
      ...(member?.name ? [{ AND: [{ assignmentKind: "member" }, { assigneeId: member.name }] }] : []),
      ...(member?.team ? [{ AND: [{ assignmentKind: "team" }, { assigneeId: member.team }] }] : []),
    ];
  } else if (actor?.role === "client") {
    where.OR = [
      { authorId: actor.userId },
      { assigneeId: actor.email },
    ];
  }

  return where;
}

export const calendarService = {
  async list(actor: AccessActor) {
    const where = await buildCalendarWhere(actor);

    const events = await (prisma as any).calendarEvent.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return events;
  },

  async getById(id: number, actor: AccessActor) {
    const where = await buildCalendarWhere(actor);
    const event = await (prisma as any).calendarEvent.findFirst({
      where: {
        ...where,
        id,
      },
    });

    if (!event) {
      throw new AppError("Event not found", 404, "NOT_FOUND");
    }

    return event;
  },

  async create(actor: AccessActor, data: any) {
    if (actor?.role !== "admin" && actor?.role !== "manager") {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const event = await (prisma as any).calendarEvent.create({
      data: {
        ...data,
        authorId: actor?.userId,
      },
    });
    return event;
  },

  async update(id: number, actor: AccessActor, data: any) {
    const existing = await this.getById(id, actor);
    if (!existing) {
      throw new AppError("Event not found", 404, "NOT_FOUND");
    }

    if (actor?.role !== "admin" && actor?.role !== "manager" && existing.authorId !== actor?.userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const event = await (prisma as any).calendarEvent.update({
      where: { id },
      data,
    });
    return event;
  },

  async remove(id: number, actor: AccessActor) {
    const existing = await this.getById(id, actor);
    if (!existing) {
      throw new AppError("Event not found", 404, "NOT_FOUND");
    }

    if (actor?.role !== "admin" && actor?.role !== "manager" && existing.authorId !== actor?.userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    await (prisma as any).calendarEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
