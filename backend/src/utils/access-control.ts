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

function normalizeScopes(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

export async function getEmployeeAssigneeScope(actor: AccessActor) {
  if (!actor || actor.role !== "employee") {
    return null;
  }

  const user = actor.userId
    ? await prisma.user.findUnique({ where: { id: actor.userId }, select: { name: true } })
    : null;

  // Try matching TeamMember by email first, then by name
  const member = await prisma.teamMember.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: { equals: actor.email, mode: "insensitive" } },
        ...(user?.name ? [{ name: { equals: user.name, mode: "insensitive" as const } }] : []),
      ],
    },
    select: { name: true, avatar: true },
  });

  const scopes = normalizeScopes([
    member?.name,
    member?.avatar,
    user?.name,
    actor.email,
    deriveInitials(member?.name?.trim() || user?.name?.trim() || actor.email),
    // also include first name to match partial assignee entries like "Rajeev"
    (member?.name || user?.name)?.split(" ")[0],
  ]);
  return scopes.length > 0 ? scopes : null;
}

export async function getEmployeeProjectScope(actor: AccessActor) {
  if (!actor || actor.role !== "employee") {
    return null;
  }

  const user = actor.userId
    ? await prisma.user.findUnique({ where: { id: actor.userId }, select: { name: true, team: true } })
    : null;

  // Try matching TeamMember by email first, then by name
  const member = await prisma.teamMember.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { email: { equals: actor.email, mode: "insensitive" } },
        ...(user?.name ? [{ name: { equals: user.name, mode: "insensitive" as const } }] : []),
      ],
    },
    select: { avatar: true, name: true, team: true },
  });

  const scopes = normalizeScopes([
    member?.avatar,
    member?.name,
    member?.team,
    user?.name,
    user?.team,
    actor.email,
    deriveInitials(member?.name?.trim() || user?.name?.trim() || actor.email),
  ]);
  return scopes.length > 0 ? scopes : null;
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
