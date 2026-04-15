import { logger } from "../utils/logger";
import { Prisma, type ClientSegment, type ClientStatus, type ClientTier } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { UserRole } from "../config/types";
import { sendClientWelcomeEmail } from "../utils/email-templates";
import { triggerAutomation, onClientCreated } from "./automation-engine";
import {
  buildClientAvatar,
  fromDbClientSegment,
  fromDbClientStatus,
  fromDbClientTier,
  toDbClientSegment,
  toDbClientStatus,
  toDbClientTier,
} from "../utils/client-mapping";
import { getClientAccessEmail } from "../utils/access-control";

type ClientRecord = {
  id: number;
  name: string;
  industry: string;
  manager: string;
  status: "active" | "pending" | "completed";
  revenue: string;
  location: string;
  avatar: string;
  tier: "Enterprise" | "Growth" | "Strategic";
  healthScore: number;
  nextAction: string;
  segment: "Expansion" | "Renewal" | "New Business";
  email: string;
  phone: string;
  company: string;
  companyId?: string;
  jobTitle?: string;
  source?: string;
  assignedTo?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type ClientFilters = {
  page: number;
  limit: number;
  status?: "active" | "pending" | "completed";
  tier?: "Enterprise" | "Growth" | "Strategic";
  search?: string;
  sort: "name" | "revenue" | "createdAt" | "healthScore";
  order: "asc" | "desc";
};

type AccessScope = {
  role: UserRole;
  email: string;
  userId?: string;
} | null | undefined;

type ClientInput = {
  name: string;
  email: string;
  industry?: string;
  manager?: string;
  status?: "active" | "pending" | "completed";
  revenue?: string;
  location?: string;
  tier?: "Enterprise" | "Growth" | "Strategic";
  segment?: "Expansion" | "Renewal" | "New Business";
  phone?: string;
  company?: string;
  companyId?: string;
  jobTitle?: string;
  source?: string;
  assignedTo?: string;
  healthScore?: number;
  nextAction?: string;
  avatar?: string;
  tags?: string[];
};

function mapClient(
  client: {
  id: number;
  name: string;
  industry: string;
  manager: string;
  status: ClientStatus;
  revenue: string;
  location: string;
  avatar: string;
  tier: ClientTier;
  healthScore: number;
  nextAction: string;
  segment: ClientSegment;
  email: string;
  phone: string;
  company: string;
  companyId: string | null;
  jobTitle: string | null;
  source: string | null;
  assignedTo: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
},
  role?: UserRole,
): ClientRecord {
  const isClientView = role === "client";

  return {
    id: client.id,
    name: client.name,
    industry: client.industry,
    manager: isClientView ? "Account team" : client.manager,
    status: fromDbClientStatus(client.status),
    revenue: isClientView ? "Private" : client.revenue,
    location: client.location,
    avatar: client.avatar,
    tier: fromDbClientTier(client.tier),
    healthScore: isClientView ? 0 : client.healthScore,
    nextAction: isClientView ? "Contact your account team for the next update." : client.nextAction,
    segment: fromDbClientSegment(client.segment),
    email: client.email,
    phone: client.phone,
    company: client.company,
    companyId: client.companyId ?? undefined,
    jobTitle: client.jobTitle ?? undefined,
    source: client.source ?? undefined,
    assignedTo: isClientView ? undefined : client.assignedTo ?? undefined,
    tags: isClientView ? [] : client.tags,
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

async function buildWhere(filters: ClientFilters, access: AccessScope): Promise<Prisma.ClientWhereInput> {
  const and: Prisma.ClientWhereInput[] = [{ deletedAt: null }];

  const clientEmail = await getClientAccessEmail(access);
  if (clientEmail) {
    and.push({
      email: { equals: clientEmail, mode: "insensitive" },
    });
  }

  if (filters.status) {
    and.push({ status: toDbClientStatus(filters.status) });
  }

  if (filters.tier) {
    and.push({ tier: toDbClientTier(filters.tier) });
  }

  if (filters.search?.trim()) {
    const search = filters.search.trim();
    and.push({
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  return { AND: and };
}

function buildOrderBy(sort: ClientFilters["sort"], order: ClientFilters["order"]) {
  switch (sort) {
    case "name":
      return { name: order };
    case "revenue":
      return { revenue: order };
    case "healthScore":
      return { healthScore: order };
    case "createdAt":
    default:
      return { createdAt: order };
  }
}

function isEmailUniqueConstraintError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes("email");
  }
  if (typeof target === "string") {
    return target.includes("email");
  }
  return false;
}

export const clientsService = {
  async getById(clientId: number, access?: AccessScope) {
    const clientEmail = await getClientAccessEmail(access);
    const client = clientEmail
      ? await prisma.client.findFirst({
          where: {
            deletedAt: null,
            id: clientId,
            email: { equals: clientEmail, mode: "insensitive" },
          },
        })
      : await prisma.client.findUnique({ where: { id: clientId } });
    if (!client || client.deletedAt) {
      throw new AppError("Client not found", 404, "NOT_FOUND");
    }
    return mapClient(client, access?.role);
  },

  async list(filters: ClientFilters, access?: AccessScope) {
    const where = await buildWhere(filters, access);

    const [total, clients] = await prisma.$transaction([
      prisma.client.count({ where }),
      prisma.client.findMany({
        where,
        orderBy: buildOrderBy(filters.sort, filters.order),
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
    ]);

    return {
      data: clients.map((client) => mapClient(client, access?.role)),
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / filters.limit)),
      },
    };
  },

  async create(input: ClientInput) {
    const existing = await prisma.client.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError("Client email already exists", 409, "CONFLICT");
    }

    try {
      const client = await prisma.client.create({
        data: {
          name: input.name,
          email: input.email,
          industry: input.industry ?? "General",
          manager: input.manager ?? "Unassigned",
          status: toDbClientStatus(input.status ?? "pending"),
          revenue: input.revenue ?? "$0",
          location: input.location ?? "Unknown",
          avatar: input.avatar ?? buildClientAvatar(input.name),
          tier: toDbClientTier(input.tier ?? "Growth"),
          healthScore: input.healthScore ?? 75,
          nextAction: input.nextAction ?? "Initial contact",
          segment: toDbClientSegment(input.segment ?? "New Business"),
          companyId: input.companyId ?? null,
          jobTitle: input.jobTitle ?? null,
          source: input.source ?? null,
          assignedTo: input.assignedTo ?? null,
          phone: input.phone ?? "",
          company: input.company ?? "",
          tags: input.tags ?? [],
          updatedAt: new Date(),
        },
      });

      // Send welcome email to new client
      sendClientWelcomeEmail({
        name: client.name,
        email: client.email,
      }).catch(() => {});

      // Trigger automation: Client Created
      onClientCreated(client.id, {
        name: client.name,
        email: client.email,
        company: client.company,
        tier: client.tier,
        segment: client.segment,
        assignedTo: client.assignedTo,
      });

      return mapClient(client);
    } catch (error) {
      if (isEmailUniqueConstraintError(error)) {
        throw new AppError("Client email already exists", 409, "CONFLICT");
      }
      throw error;
    }
  },

  async update(clientId: number, patch: Partial<ClientInput>) {
    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Client not found", 404, "NOT_FOUND");
    }
    if (patch.email !== undefined && patch.email !== existing.email) {
      const emailOwner = await prisma.client.findUnique({ where: { email: patch.email } });
      if (emailOwner && emailOwner.id !== existing.id) {
        throw new AppError("Client email already exists", 409, "CONFLICT");
      }
    }

    try {
      const updated = await prisma.client.update({
        where: { id: clientId },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.industry !== undefined ? { industry: patch.industry } : {}),
          ...(patch.manager !== undefined ? { manager: patch.manager } : {}),
          ...(patch.status !== undefined ? { status: toDbClientStatus(patch.status) } : {}),
          ...(patch.revenue !== undefined ? { revenue: patch.revenue } : {}),
          ...(patch.location !== undefined ? { location: patch.location } : {}),
          ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
          ...(patch.tier !== undefined ? { tier: toDbClientTier(patch.tier) } : {}),
          ...(patch.healthScore !== undefined ? { healthScore: patch.healthScore } : {}),
          ...(patch.nextAction !== undefined ? { nextAction: patch.nextAction } : {}),
          ...(patch.segment !== undefined ? { segment: toDbClientSegment(patch.segment) } : {}),
          ...(patch.companyId !== undefined ? { companyId: patch.companyId } : {}),
          ...(patch.jobTitle !== undefined ? { jobTitle: patch.jobTitle } : {}),
          ...(patch.source !== undefined ? { source: patch.source } : {}),
          ...(patch.assignedTo !== undefined ? { assignedTo: patch.assignedTo } : {}),
          ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
          ...(patch.company !== undefined ? { company: patch.company } : {}),
          ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
        },
      });

      // Trigger automation: Client Updated / Health Changed
      if (patch.healthScore !== undefined) {
        triggerAutomation("client_health_changed", {
          trigger: "client_health_changed",
          entityType: "Client",
          entityId: updated.id,
          data: {
            healthScore: updated.healthScore,
            previousScore: existing.healthScore,
            name: updated.name
          }
        }).catch(err => logger.error("Health automation failed:", err));
      }

      return mapClient(updated);
    } catch (error) {
      if (isEmailUniqueConstraintError(error)) {
        throw new AppError("Client email already exists", 409, "CONFLICT");
      }
      throw error;
    }
  },

  async delete(clientId: number) {
    const existing = await prisma.client.findUnique({ where: { id: clientId } });
    if (!existing || existing.deletedAt) {
      throw new AppError("Client not found", 404, "NOT_FOUND");
    }

    await prisma.client.update({
      where: { id: clientId },
      data: { deletedAt: new Date() },
    });
  },

  async getPipeline(access?: AccessScope) {
    const where = await buildWhere(
      { page: 1, limit: 1, sort: "createdAt", order: "desc" },
      access,
    );
    const clients = await prisma.client.groupBy({
      by: ["segment"],
      where,
      _count: { _all: true },
    });

    const colors: Record<string, string> = {
      "New Business": "hsl(213 55% 52%)",
      "Renewal": "hsl(173 58% 42%)",
      "Expansion": "hsl(38 88% 52%)",
    };

    const segments = [
      { name: "New Business", segment: "new_business" },
      { name: "Renewal", segment: "Renewal" },
      { name: "Expansion", segment: "Expansion" },
    ];

    return segments.map((s) => {
      const dbEntry = s.segment ? clients.find((c) => String(c.segment) === s.segment) : null;
      return {
        name: s.name,
        value: dbEntry ? dbEntry._count._all : 0,
        color: colors[s.name] || "hsl(213 55% 52%)",
      };
    });
  },
};
