import crypto from "crypto";
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

type StoredTeam = {
  id: number;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  ownerEmail: string;
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
    members: team.members.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: "Employee" as const,
      attendance: "present" as const,
      workload: 0
    })),
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

  return value.map((item): StoredTeam => {
    const obj = item as Record<string, unknown>;
    return {
      id: Number(obj.id) || 0,
      name: String(obj.name || ""),
      description: obj.description as string | null,
      permissions: (obj.permissions as Record<string, boolean>) || {},
      createdAt: String(obj.createdAt || new Date().toISOString()),
      updatedAt: String(obj.updatedAt || new Date().toISOString()),
      ownerId: String(obj.ownerId || "system"),
      ownerEmail: String(obj.ownerEmail || "system"),
    };
  });
}

async function readTeamStore() {
  const record = await prisma.userPreference.findUnique({
    where: { userId: SYSTEM_TEAMS_USER_ID },
  });

  return {
    data: record?.data as Record<string, unknown> | undefined,
  };
}

async function persistTeams(teams: StoredTeam[]) {
  await prisma.userPreference.upsert({
    where: { userId: SYSTEM_TEAMS_USER_ID },
    update: {
      data: {
        [SYSTEM_TEAMS_KEY]: teams as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    },
    create: {
      id: SYSTEM_TEAMS_USER_ID,
      userId: SYSTEM_TEAMS_USER_ID,
      data: { [SYSTEM_TEAMS_KEY]: teams } as any,
      updatedAt: new Date(),
    },
  });
}

async function loadTeamsWithMembers() {
  const store = await readTeamStore();
  const teams = readStoredTeams(store.data as any);

  const membersByTeam = await prisma.teamMember.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true, team: true, role: true, attendance: true, workload: true },
  });

  const memberMap = new Map<string, typeof membersByTeam>();
  for (const m of membersByTeam) {
    const list = memberMap.get(m.team) || [];
    list.push(m);
    memberMap.set(m.team, list);
  }

  return teams.map(t => ({
    ...t,
    members: memberMap.get(t.name) || [],
  }));
}

// Convert AccessScope to actor object for teams service
function toActor(access?: AccessScope) {
  return access ? { userId: access.userId ?? "", email: access.email ?? "", role: access.role ?? "employee" } : undefined;
}

export const teamsService = {
  async getById(teamId: number) {
    const team = (await loadTeamsWithMembers()).find(t => t.id === teamId);
    if (!team) {
      throw new AppError("Team not found", 404, "NOT_FOUND");
    }
    return mapTeam(team);
  },

  async list(access?: AccessScope) {
    const allTeams = await loadTeamsWithMembers();
    
    if (!access) {
      return [];
    }

    // Admin sees only their own teams
    if (access.role === "admin") {
      return allTeams.filter(t => 
        t.ownerId === access.userId || 
        t.ownerEmail === access.email
      ).map(mapTeam);
    }
    
    // Manager/Employee sees teams from their organization (same admin)
    // Get the adminId for this user
    const user = await prisma.user.findUnique({
      where: { id: access.userId },
      select: { adminId: true }
    });

    if (user?.adminId) {
      // Filter teams by the admin who owns this user
      const admin = await prisma.user.findUnique({
        where: { id: user.adminId },
        select: { email: true }
      });
      if (admin?.email) {
        return allTeams.filter(t => 
          t.ownerEmail === admin.email
        ).map(mapTeam);
      }
    }
    
    // Fallback: see teams where ownerId matches or empty (system/legacy teams)
    return allTeams.filter(t => 
      t.ownerId === access.userId || 
      t.ownerEmail === access.email ||
      t.ownerId === "system" ||
      t.ownerId === ""
    ).map(mapTeam);
  },

  async create(input: TeamCreateInput, access?: AccessScope) {
    const name = normalizeTeamName(input.name);
    const store = await readTeamStore();
    const teams = readStoredTeams(store.data as any);
    
    if (!access) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }
    
    // Determine the owner of this team
    let ownerId = access.userId ?? "unknown";
    let ownerEmail = access.email ?? "unknown";
    
    // If manager/employee creates team, attribute it to their admin
    if (access.role !== "admin") {
      const user = await prisma.user.findUnique({
        where: { id: access.userId },
        select: { adminId: true }
      });
      if (user?.adminId) {
        const admin = await prisma.user.findUnique({
          where: { id: user.adminId },
          select: { id: true, email: true }
        });
        if (admin) {
          ownerId = admin.id;
          ownerEmail = admin.email;
        }
      }
    }
    
    // Check conflict within all teams (to prevent name collisions)
    if (teams.some((team) => team.name.toLowerCase() === name.toLowerCase())) {
      throw new AppError("Team name already exists", 409, "CONFLICT");
    }

    const createdAt = new Date().toISOString();
    const team: StoredTeam = {
      id: Math.max(0, ...teams.map(t => t.id)) + 1,
      name,
      description: input.description?.trim() || null,
      permissions: input.permissions || {},
      createdAt,
      updatedAt: createdAt,
      ownerId,
      ownerEmail,
    };

    await persistTeams([...teams, team]);
    return mapTeam({
      ...team,
      members: [],
    });
  },

  async update(teamId: number, patch: TeamUpdateInput, access?: AccessScope) {
    const store = await readTeamStore();
    const teams = readStoredTeams(store.data as any);
    const index = teams.findIndex((team) => team.id === teamId);
    if (index === -1) {
      throw new AppError("Team not found", 404, "NOT_FOUND");
    }

    const existing = teams[index];
    
    // Admin can only update their own teams
    if (access?.role === "admin") {
      const isOwner = existing.ownerId === access.userId || existing.ownerEmail === access.email;
      if (!isOwner) {
        throw new AppError("You can only update your own teams", 403, "FORBIDDEN");
      }
    }
    
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
      const dataObj = (store.data && typeof store.data === "object" && !Array.isArray(store.data))
        ? (store.data as Record<string, unknown>)
        : {};
      
      await tx.userPreference.update({
        where: { userId: SYSTEM_TEAMS_USER_ID },
        data: {
          data: {
            ...((store.data && typeof store.data === "object" && !Array.isArray(store.data))
              ? (store.data as Record<string, unknown>)
              : {}),
            [SYSTEM_TEAMS_KEY]: nextTeams,
          } as any,
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

  async delete(teamId: number, access?: AccessScope) {
    const store = await readTeamStore();
    const teams = readStoredTeams(store.data as any);
    const existing = teams.find((team) => team.id === teamId);
    if (!existing) {
      throw new AppError("Team not found", 404, "NOT_FOUND");
    }
    
    // Admin can only delete their own teams
    if (access?.role === "admin") {
      const isOwner = existing.ownerId === access.userId || existing.ownerEmail === access.email;
      if (!isOwner) {
        throw new AppError("You can only delete your own teams", 403, "FORBIDDEN");
      }
    }

    const nextTeams = teams.filter((team) => team.id !== teamId);

    await prisma.$transaction(async (tx) => {
      await tx.userPreference.upsert({
        where: { userId: SYSTEM_TEAMS_USER_ID },
        update: {
          data: { [SYSTEM_TEAMS_KEY]: nextTeams as Prisma.InputJsonValue, updatedAt: new Date() },
        },
        create: {
          userId: SYSTEM_TEAMS_USER_ID,
          data: { [SYSTEM_TEAMS_KEY]: nextTeams } as any,
        } as any,
      });

      await tx.teamMember.updateMany({
        where: { deletedAt: null, team: existing.name },
        data: { team: "General" },
      });
    });
  },

  async assignMember(teamId: number, memberId: number) {
    const team = (await loadTeamsWithMembers()).find(entry => entry.id === teamId);
    if (!team) {
      throw new AppError("Team not found", 404, "NOT_FOUND");
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { team: team.name, teamId: teamId },
    });
  },

  async removeMember(teamId: number, memberId: number) {
    const team = (await loadTeamsWithMembers()).find(entry => entry.id === teamId);
    if (!team) {
      throw new AppError("Team not found", 404, "NOT_FOUND");
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { team: "General", teamId: null },
    });
  },
};