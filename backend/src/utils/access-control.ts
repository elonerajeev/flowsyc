import { prisma } from "../config/prisma";
import type { UserRole } from "../config/types";

export type AccessActor =
  | {
      userId?: string;
      email: string;
      role: UserRole;
    }
  | null
  | undefined;

function deriveInitials(value: string) {
  return value
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export async function getEmployeeAssigneeScope(actor: AccessActor) {
  if (!actor || actor.role !== "employee") {
    return null;
  }

  const [user, member] = await Promise.all([
    actor.userId
      ? prisma.user.findUnique({
          where: { id: actor.userId },
          select: { name: true },
        })
      : Promise.resolve(null),
    prisma.teamMember.findFirst({
      where: {
        deletedAt: null,
        email: { equals: actor.email, mode: "insensitive" },
      },
      select: { name: true, team: true },
    }),
  ]);

  const scopes = Array.from(
    new Set(
      [member?.name, user?.name, member?.team, actor.email]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
  return scopes.length > 0 ? scopes : null;
}

export async function getEmployeeProjectScope(actor: AccessActor) {
  if (!actor || actor.role !== "employee") {
    return null;
  }

  const [user, member] = await Promise.all([
    actor.userId
      ? prisma.user.findUnique({
          where: { id: actor.userId },
          select: { name: true },
        })
      : Promise.resolve(null),
    prisma.teamMember.findFirst({
      where: {
        deletedAt: null,
        email: { equals: actor.email, mode: "insensitive" },
      },
      select: { avatar: true },
    }),
  ]);

  const teamMarker = member?.avatar?.trim() || deriveInitials(user?.name?.trim() || actor.email);
  return teamMarker || null;
}

export async function getEmployeeMemberRecord(actor: AccessActor) {
  if (!actor || actor.role !== "employee") {
    return null;
  }

  return prisma.teamMember.findFirst({
    where: {
      deletedAt: null,
      email: { equals: actor.email, mode: "insensitive" },
    },
    select: { id: true, name: true, department: true },
  });
}

export async function getClientAccessEmail(actor: AccessActor) {
  if (!actor || actor.role !== "client") {
    return null;
  }

  return actor.email.trim().toLowerCase();
}

export async function getInvoiceClientLabels(actor: AccessActor) {
  if (!actor || actor.role !== "client") {
    return null;
  }

  const clientRecords = await prisma.client.findMany({
    where: {
      deletedAt: null,
      email: { equals: actor.email, mode: "insensitive" },
    },
    select: {
      name: true,
      company: true,
    },
  });

  return Array.from(
    new Set(
      clientRecords
        .flatMap((client) => [client.name, client.company])
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}
