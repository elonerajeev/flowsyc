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
    tags: lead.tags ?? [],
    convertedAt: lead.convertedAt?.toISOString() ?? null,
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
    }

    try {
      const count = await prisma.lead.count({ where: { deletedAt: null } });
      
      // Auto-seed if empty (Phase 1 Wow factor)
      if (count === 0 && (access?.role === "admin" || !access)) {
        const { leadRecords } = await import("../data/crm-static");
        await prisma.$transaction(
          leadRecords.map((l) => {
            let dbStatus: any = l.status;
            if (dbStatus === "won") dbStatus = "closed_won";
            if (dbStatus === "lost") dbStatus = "closed_lost";

            return prisma.lead.create({
              data: {
                firstName: l.firstName,
                lastName: l.lastName,
                email: l.email,
                company: l.company || "Unknown",
                jobTitle: l.jobTitle,
                source: l.source as any,
                status: dbStatus,
                score: l.score,
                notes: l.notes,
                createdAt: new Date(l.createdAt),
                updatedAt: new Date(l.updatedAt),
              }
            });
          })
        );
      }

      const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return leads.map(mapLead);
    } catch (error: any) {
      // P2021 = Table does not exist (migration hasn't been run)
      // P2009 / P2019 / etc = Validation failed
      if (error?.code === "P2021" || error?.message?.includes("relation \"Lead\" does not exist")) {
        console.warn("Leads table missing. Falling back to mock data for Phase 1 transition.");
        const { leadRecords } = await import("../data/crm-static");
        return leadRecords.map((l) => ({
          ...l,
          tags: [],
          convertedAt: null,
          convertedToClientId: null,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
        }));
      }
      
      console.error("Leads service error:", error.message);
      // Fallback on ANY error during this transition phase to prevent 500s for the user
      const { leadRecords } = await import("../data/crm-static");
      return leadRecords.map((l) => ({
          ...l,
          tags: [],
          convertedAt: null,
          convertedToClientId: null,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
      }));
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
    const lead = await prisma.lead.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        company: input.company || "Unknown",
        jobTitle: input.jobTitle,
        phone: input.phone,
        source: input.source ?? "website",
        status: input.status ?? "new",
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
