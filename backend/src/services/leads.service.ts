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
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    jobTitle: lead.jobTitle,
    source: lead.source,
    status: lead.status,
    score: lead.score,
    assignedTo: lead.assignedTo,
    notes: lead.notes,
    tags: lead.tags,
    convertedToClientId: lead.convertedToClientId,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    convertedAt: lead.convertedAt?.toISOString() ?? null,
  };
}

export const leadsService = {
  async list(access?: AccessScope) {
    const where: Prisma.LeadWhereInput = { deletedAt: null };

    // RBAC: Admins/Managers see all; Employees see assigned leads
    if (access?.role === "employee") {
      where.assignedTo = { in: [access.email, access.userId ?? ""] };
      // Potentially add more scope here if needed (e.g., team-based)
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return leads.map(mapLead);
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
    const lead = await prisma.lead.create({
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
    return mapLead(lead);
  },

  async update(id: number, patch: Partial<LeadInput>, access?: AccessScope) {
    const existing = await this.getById(id, access);
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        ...patch,
        updatedAt: new Date(),
      },
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
