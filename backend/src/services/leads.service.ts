import { Prisma, type LeadStatus, type LeadSource } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { UserRole } from "../config/types";

type LeadRecord = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  jobTitle?: string | null;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  assignedTo?: string | null;
  notes?: string | null;
  tags: string[];
  convertedAt?: string | null;
  convertedToClientId?: number | null;
  createdAt: string;
  updatedAt: string;
};

type LeadInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source?: LeadSource;
  status?: LeadStatus;
  score?: number;
  assignedTo?: string;
  notes?: string;
  tags?: string[];
  convertedAt?: Date;
  convertedToClientId?: number;
};

type AccessScope = {
  role: UserRole;
  email: string;
  userId?: string;
} | null | undefined;

function mapLead(lead: any): LeadRecord {
  // Map database status to frontend status
  let status: any = lead.status;
  if (status === "closed_won") status = "won";
  if (status === "closed_lost") status = "lost";

  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    jobTitle: lead.jobTitle,
    source: lead.source,
    status,
    score: lead.score,
    assignedTo: lead.assignedTo,
    notes: lead.notes,
    tags: lead.tags ?? [],
    convertedAt: lead.convertedAt?.toISOString() ?? null,
    convertedToClientId: lead.convertedToClientId,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}

export const leadsService = {
  async list(access?: AccessScope) {
    const where: Prisma.LeadWhereInput = { deletedAt: null };

    // RBAC: Admins/Managers see all; Employees see assigned leads or team permissions
    if (access?.role === "employee") {
      where.assignedTo = { in: [access.email, access.userId ?? ""] };
    }

    try {
      const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return leads.map(mapLead);
    } catch (error: any) {
      if (error?.code === "P2021" || error?.message?.includes("relation \"Lead\" does not exist")) {
        throw new AppError("Lead data is unavailable until the sales schema is migrated", 503, "SERVICE_UNAVAILABLE");
      }

      throw error;
    }
  },

  async getById(id: number, access?: AccessScope) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead || lead.deletedAt) {
      throw new AppError("Lead not found", 404, "NOT_FOUND");
    }

    if (access?.role === "employee" && lead.assignedTo !== access.email && lead.assignedTo !== access.userId) {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    return mapLead(lead);
  },

  async create(input: LeadInput) {
    // Map frontend status to database status
    let dbStatus: any = input.status ?? "new";
    if (dbStatus === "won") dbStatus = "closed_won";
    if (dbStatus === "lost") dbStatus = "closed_lost";

    const lead = await prisma.lead.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        company: input.company || "Unknown",
        jobTitle: input.jobTitle,
        phone: input.phone,
        source: input.source ?? "website",
        status: dbStatus,
        score: input.score ?? 50,
        assignedTo: input.assignedTo,
        notes: input.notes,
        tags: input.tags ?? [],
        convertedAt: input.convertedAt,
        convertedToClientId: input.convertedToClientId,
      },
    });
    return mapLead(lead);
  },

  async update(id: number, patch: Partial<LeadInput>, access?: AccessScope) {
    const existing = await this.getById(id, access);

    // Map frontend status to database status if provided
    const updateData: any = { ...patch, updatedAt: new Date() };
    if (patch.status) {
      const status = patch.status as string;
      if (status === "won") updateData.status = "closed_won";
      else if (status === "lost") updateData.status = "closed_lost";
      else updateData.status = status;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
    });
    return mapLead(lead);
  },

  async delete(id: number, access?: AccessScope) {
    await this.getById(id, access);
    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
