import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { AccessScope } from "../utils/access-control";

type TeamMemberInfo = {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Employee";
  attendance: "present" | "late" | "remote" | "absent";
  workload: number;
};

type TeamRecord = {
  id: number;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  members: TeamMemberInfo[];
  createdAt: string;
  updatedAt: string;
};

type TeamCreateInput = {
  name: string;
  description?: string;
  permissions?: Record<string, boolean>;
};

type TeamUpdateInput = Partial<TeamCreateInput>;

const memberSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  attendance: true,
  workload: true,
} as const;

const teamInclude = {
  members: {
    where: { deletedAt: null },
    select: memberSelect,
  },
} satisfies Prisma.TeamInclude;

type TeamWithMembers = Prisma.TeamGetPayload<{ include: typeof teamInclude }>;

function normalizeTeamName(name: string) {
  const value = name.trim();
  if (!value) throw new AppError("Team name is required", 400, "BAD_REQUEST");
  return value;
}

function mapTeam(team: TeamWithMembers): TeamRecord {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    permissions: (team.permissions as Record<string, boolean>) || {},
    members: team.members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role as TeamMemberInfo["role"],
      attendance: (m.attendance as TeamMemberInfo["attendance"]) || "present",
      workload: m.workload,
    })),
    createdAt: team.createdAt.toISOString(),
    updatedAt: team.updatedAt.toISOString(),
  };
}

export const teamsService = {
  async getById(teamId: number) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, deletedAt: null },
      include: teamInclude,
    });
    if (!team) throw new AppError("Team not found", 404, "NOT_FOUND");
    return mapTeam(team);
  },

  async list(access?: AccessScope) {
    if (!access) return [];

    const where: Prisma.TeamWhereInput = { deletedAt: null };

    if (access.role === "admin") {
      where.OR = [
        { ownerId: access.userId ?? "__none__" },
        { ownerEmail: access.email },
      ];
    } else if (access.organizationId) {
      where.organizationId = access.organizationId;
    } else {
      return [];
    }

    const teams = await prisma.team.findMany({
      where,
      include: teamInclude,
      orderBy: { createdAt: "desc" },
    });

    return teams.map(mapTeam);
  },

  async create(input: TeamCreateInput, access?: AccessScope) {
    if (!access) throw new AppError("Authentication required", 401, "UNAUTHORIZED");

    const name = normalizeTeamName(input.name);

    let ownerId = access.userId ?? "unknown";
    let ownerEmail = access.email ?? "unknown";
    const organizationId = access.organizationId ?? null;

    if (access.role !== "admin" && access.organizationId) {
      const orgAdmin = await prisma.user.findFirst({
        where: { role: "admin", organizationId: access.organizationId, deletedAt: null },
        select: { id: true, email: true },
      });
      if (orgAdmin) {
        ownerId = orgAdmin.id;
        ownerEmail = orgAdmin.email;
      }
    }

    const conflict = await prisma.team.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        organizationId,
        deletedAt: null,
      },
    });
    if (conflict) throw new AppError("Team name already exists", 409, "CONFLICT");

    const team = await prisma.team.create({
      data: {
        name,
        description: input.description?.trim() || null,
        permissions: (input.permissions || {}) as Prisma.InputJsonValue,
        organizationId,
        ownerId,
        ownerEmail,
      },
      include: teamInclude,
    });

    return mapTeam(team);
  },

  async update(teamId: number, patch: TeamUpdateInput, access?: AccessScope) {
    const existing = await prisma.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!existing) throw new AppError("Team not found", 404, "NOT_FOUND");

    if (access?.role === "admin") {
      const isOwner = existing.ownerId === access.userId || existing.ownerEmail === access.email;
      if (!isOwner) throw new AppError("You can only update your own teams", 403, "FORBIDDEN");
    }

    const nextName = patch.name !== undefined ? normalizeTeamName(patch.name) : existing.name;

    if (nextName.toLowerCase() !== existing.name.toLowerCase()) {
      const conflict = await prisma.team.findFirst({
        where: {
          name: { equals: nextName, mode: "insensitive" },
          organizationId: existing.organizationId,
          id: { not: teamId },
          deletedAt: null,
        },
      });
      if (conflict) throw new AppError("Team name already exists", 409, "CONFLICT");
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id: teamId },
        data: {
          name: nextName,
          description: patch.description !== undefined ? patch.description?.trim() || null : existing.description,
          ...(patch.permissions !== undefined ? { permissions: patch.permissions as Prisma.InputJsonValue } : {}),
        },
      });

      if (existing.name !== nextName) {
        await tx.teamMember.updateMany({
          where: { deletedAt: null, team: existing.name },
          data: { team: nextName },
        });
      }

      const refreshed = await tx.team.findFirst({
        where: { id: teamId, deletedAt: null },
        include: teamInclude,
      });
      if (!refreshed) throw new AppError("Team not found", 404, "NOT_FOUND");
      return refreshed;
    });

    return mapTeam(updated);
  },

  async delete(teamId: number, access?: AccessScope) {
    const existing = await prisma.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!existing) throw new AppError("Team not found", 404, "NOT_FOUND");

    if (access?.role === "admin") {
      const isOwner = existing.ownerId === access.userId || existing.ownerEmail === access.email;
      if (!isOwner) throw new AppError("You can only delete your own teams", 403, "FORBIDDEN");
    }

    await prisma.$transaction(async (tx) => {
      await tx.team.update({ where: { id: teamId }, data: { deletedAt: new Date() } });
      await tx.teamMember.updateMany({
        where: { deletedAt: null, team: existing.name },
        data: { team: "General", teamId: null },
      });
    });
  },

  async assignMember(teamId: number, memberId: number) {
    const team = await prisma.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!team) throw new AppError("Team not found", 404, "NOT_FOUND");

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { team: team.name, teamId: teamId },
    });
  },

  async removeMember(teamId: number, memberId: number) {
    const team = await prisma.team.findFirst({ where: { id: teamId, deletedAt: null } });
    if (!team) throw new AppError("Team not found", 404, "NOT_FOUND");

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { team: "General", teamId: null },
    });
  },
};
