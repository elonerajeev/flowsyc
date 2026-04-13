import crypto from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";

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
  permissions: Record<string, boolean>; // e.g. { clients: true, tasks: false }
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

type StoredTeam = {
  id: number;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
};

const SYSTEM_TEAMS_USER_ID = "system:teams";
const SYSTEM_TEAMS_KEY = "managedTeams";

function normalizeTeamName(name: string) {
  const value = name.trim();
  if (!value) {
    throw new AppError("Team name is required", 400, "BAD_REQUEST");
  }
  return value;
}

function mapTeam(team: StoredTeam & { members: { id: number; name: string; email: string }[] }): TeamRecord {
  return {
    id: team.id,
    name: team.name,
    description: team.description,
    permissions: (team.permissions as Record<string, boolean>) || {},
    members: team.members,
    createdAt: new Date(team.createdAt).toISOString(),
    updatedAt: new Date(team.updatedAt).toISOString(),
  };
}

function readStoredTeams(data: Prisma.JsonValue | undefined): StoredTeam[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return [];
  }

  const value = (data as Record<string, unknown>)[SYSTEM_TEAMS_KEY];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is StoredTeam => Boolean(entry && typeof entry === "object"))
    .map((entry) => {
      const record = entry as Record<string, unknown>;
      return {
        id: Number(record.id),
        name: typeof record.name === "string" ? record.name : "",
        description: typeof record.description === "string" ? record.description : null,
        permissions:
          record.permissions && typeof record.permissions === "object" && !Array.isArray(record.permissions)
            ? (record.permissions as Record<string, boolean>)
            : {},
        createdAt: typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString(),
        updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
      };
    })
    .filter((team) => team.id > 0 && team.name.trim().length > 0);
}

async function readTeamStore() {
  const existing = await prisma.userPreference.findUnique({
    where: { userId: SYSTEM_TEAMS_USER_ID },
  });

  if (existing) {
    return existing;
  }

  return prisma.userPreference.create({
    data: {
      id: crypto.randomUUID(),
      userId: SYSTEM_TEAMS_USER_ID,
      data: {},
      updatedAt: new Date(),
    },
  });
}

async function persistTeams(teams: StoredTeam[]) {
  const store = await readTeamStore();
  const currentData =
    store.data && typeof store.data === "object" && !Array.isArray(store.data)
      ? (store.data as Record<string, unknown>)
      : {};

  await prisma.userPreference.update({
    where: { userId: SYSTEM_TEAMS_USER_ID },
    data: {
      data: {
        ...currentData,
        [SYSTEM_TEAMS_KEY]: teams,
      } as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });
}

async function loadTeamsWithMembers() {
  const [store, members] = await Promise.all([
    readTeamStore(),
    prisma.teamMember.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        attendance: true,
        workload: true,
        team: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const storedTeams = readStoredTeams(store.data);
  const memberMap = new Map<string, TeamMemberInfo[]>();

  for (const member of members) {
    const teamName = member.team.trim() || "General";
    const bucket = memberMap.get(teamName) ?? [];
    bucket.push({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role as "Admin" | "Manager" | "Employee",
      attendance: (member.attendance || "absent") as "present" | "late" | "remote" | "absent",
      workload: member.workload || 0,
    });
    memberMap.set(teamName, bucket);
  }

  const knownNames = new Set(storedTeams.map((team) => team.name));
  const now = new Date().toISOString();
  const derivedTeams = [...memberMap.keys()]
    .filter((name) => !knownNames.has(name) && name !== "General")
    .sort((a, b) => a.localeCompare(b))
    .map((name, index) => ({
      id: storedTeams.length + index + 1,
      name,
      description: null,
      permissions: {},
      createdAt: now,
      updatedAt: now,
    }));

  const allTeams = [...storedTeams, ...derivedTeams]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((team) => ({
      ...team,
      members: memberMap.get(team.name) ?? [],
    }));

  return allTeams;
}

export const teamsService = {
  async getById(teamId: number) {
    const team = (await loadTeamsWithMembers()).find((entry) => entry.id === teamId);
    if (!team) {
      throw new AppError("Team not found", 404, "NOT_FOUND");
    }
    return mapTeam(team);
  },

  async list() {
    const teams = await loadTeamsWithMembers();
    return teams.map(mapTeam);
  },

  async create(input: TeamCreateInput) {
    const name = normalizeTeamName(input.name);
    const store = await readTeamStore();
    const teams = readStoredTeams(store.data);
    if (teams.some((team) => team.name.toLowerCase() === name.toLowerCase())) {
      throw new AppError("Team name already exists", 409, "CONFLICT");
    }

    const createdAt = new Date().toISOString();
    const team: StoredTeam = {
      id: teams.reduce((max, entry) => Math.max(max, entry.id), 0) + 1,
      name,
      description: input.description?.trim() || null,
      permissions: input.permissions || {},
      createdAt,
      updatedAt: createdAt,
    };

    await persistTeams([...teams, team]);
    return mapTeam({
      ...team,
      members: [],
    });
  },

  async update(teamId: number, patch: TeamUpdateInput) {
    const store = await readTeamStore();
    const teams = readStoredTeams(store.data);
    const index = teams.findIndex((team) => team.id === teamId);
    if (index === -1) {
      throw new AppError("Team not found", 404, "NOT_FOUND");
    }

    const existing = teams[index];
    const nextName = patch.name !== undefined ? normalizeTeamName(patch.name) : existing.name;

    const conflict = teams.find((team) => team.id !== teamId && team.name.toLowerCase() === nextName.toLowerCase());
    if (conflict) {
      throw new AppError("Team name already exists", 409, "CONFLICT");
    }

    const updated: StoredTeam = {
      ...existing,
      name: nextName,
      description: patch.description !== undefined ? patch.description?.trim() || null : existing.description,
      permissions: patch.permissions !== undefined ? patch.permissions : existing.permissions,
      updatedAt: new Date().toISOString(),
    };

    const nextTeams = [...teams];
    nextTeams[index] = updated;

    await prisma.$transaction(async (tx) => {
      await tx.userPreference.update({
        where: { userId: SYSTEM_TEAMS_USER_ID },
        data: {
          data: {
            ...((store.data && typeof store.data === "object" && !Array.isArray(store.data)
              ? (store.data as Record<string, unknown>)
              : {}) as Record<string, unknown>),
            [SYSTEM_TEAMS_KEY]: nextTeams,
          } as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      if (existing.name !== updated.name) {
        await tx.teamMember.updateMany({
          where: { deletedAt: null, team: existing.name },
          data: { team: updated.name },
        });
      }
    });

    const members = await prisma.teamMember.findMany({
      where: { deletedAt: null, team: updated.name },
      select: { id: true, name: true, email: true, role: true, attendance: true, workload: true },
      orderBy: { name: "asc" },
    });

    return mapTeam({
      ...updated,
      members,
    });
  },

  async delete(teamId: number) {
    const store = await readTeamStore();
    const teams = readStoredTeams(store.data);
    const existing = teams.find((team) => team.id === teamId);
    if (!existing) {
      throw new AppError("Team not found", 404, "NOT_FOUND");
    }

    const nextTeams = teams.filter((team) => team.id !== teamId);

    await prisma.$transaction(async (tx) => {
      await tx.userPreference.update({
        where: { userId: SYSTEM_TEAMS_USER_ID },
        data: {
          data: {
            ...((store.data && typeof store.data === "object" && !Array.isArray(store.data)
              ? (store.data as Record<string, unknown>)
              : {}) as Record<string, unknown>),
            [SYSTEM_TEAMS_KEY]: nextTeams,
          } as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });

      await tx.teamMember.updateMany({
        where: { deletedAt: null, team: existing.name },
        data: { team: "General" },
      });
    });
  },

  async assignMember(teamId: number, memberId: number) {
    const team = (await loadTeamsWithMembers()).find((entry) => entry.id === teamId);
    if (!team) {
      throw new AppError("Team not found", 404, "NOT_FOUND");
    }

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        deletedAt: true,
      },
    });
    if (!member || member.deletedAt) {
      throw new AppError("Team member not found", 404, "NOT_FOUND");
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        team: team.name,
      },
    });
  },

  async removeMember(teamId: number, memberId: number) {
    const team = (await loadTeamsWithMembers()).find((entry) => entry.id === teamId);
    if (!team) {
      throw new AppError("Team not found", 404, "NOT_FOUND");
    }

    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        deletedAt: true,
        team: true,
      },
    });
    if (!member || member.deletedAt || member.team !== team.name) {
      throw new AppError("Member not in this team", 404, "NOT_FOUND");
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        team: "General",
      },
    });
  },
};
