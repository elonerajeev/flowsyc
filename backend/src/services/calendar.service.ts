import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { AccessActor } from "../utils/access-control";
import type { CreateCalendarEventInput, UpdateCalendarEventInput } from "../validators/calendar.schema";

type CalendarEventWhere = Prisma.CalendarEventWhereInput;

async function buildCalendarWhere(actor: AccessActor): Promise<CalendarEventWhere> {
  const baseWhere: CalendarEventWhere = { deletedAt: null };

  // Admin and Manager: see only their own calendar events
  if (actor?.role === "admin" || actor?.role === "manager") {
    return {
      ...baseWhere,
      authorId: actor.userId,
    };
  }

  if (actor?.role === "employee") {
    const member = await prisma.teamMember.findFirst({
      where: { email: { equals: actor.email, mode: "insensitive" }, deletedAt: null },
      select: { name: true, team: true },
    });

    const orConditions: CalendarEventWhere[] = [
      { authorId: actor.userId },
      { AND: [{ assignmentKind: "member" as const }, { assigneeId: actor.email }] },
    ];

    if (member?.name) {
      orConditions.push({ AND: [{ assignmentKind: "member" as const }, { assigneeId: member.name }] });
    }
    if (member?.team) {
      orConditions.push({ AND: [{ assignmentKind: "team" as const }, { assigneeId: member.team }] });
    }

    return { ...baseWhere, OR: orConditions };
  }

  if (actor?.role === "client") {
    return {
      ...baseWhere,
      OR: [
        { authorId: actor.userId },
        { assigneeId: actor.email },
      ],
    };
  }

  return baseWhere;
}

export const calendarService = {
  async list(actor: AccessActor) {
    const where = await buildCalendarWhere(actor);

    const events = await prisma.calendarEvent.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return events;
  },

  async getById(id: number, actor: AccessActor) {
    const where = await buildCalendarWhere(actor);
    
    const event = await prisma.calendarEvent.findFirst({
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

  async create(actor: AccessActor, data: CreateCalendarEventInput) {
    if (actor?.role !== "admin" && actor?.role !== "manager") {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const event = await prisma.calendarEvent.create({
      data: {
        ...data,
        authorId: actor?.userId ?? "",
      },
    });

    return event;
  },

  async update(id: number, actor: AccessActor, data: UpdateCalendarEventInput) {
    const existing = await this.getById(id, actor);

    if (actor?.role !== "admin" && actor?.role !== "manager" && existing.authorId !== actor?.userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data,
    });

    return event;
  },

  async remove(id: number, actor: AccessActor) {
    const existing = await this.getById(id, actor);

    if (actor?.role !== "admin" && actor?.role !== "manager" && existing.authorId !== actor?.userId) {
      throw new AppError("Forbidden", 403, "FORBIDDEN");
    }

    await prisma.calendarEvent.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
