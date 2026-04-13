import { Prisma, type LeadStatus, type LeadSource } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { UserRole } from "../config/types";
import { triggerAutomation, onLeadCreated, onLeadUpdated } from "./automation-engine";
import { GTMAutomationService } from "./gtm-automation.service";
import { gtmLifecycleService } from "./gtm-lifecycle.service";

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
  companySize?: string;
  budget?: string;
  timeline?: string;
};

type AccessScope = {
  role: UserRole;
  email: string;
  userId?: string;
} | null | undefined;

type QueryParams = {
  page?: number;
  limit?: number;
  status?: string;
  source?: string;
  assignedTo?: string;
  minScore?: number;
  maxScore?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

type ConvertLeadInput = {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  tier?: string;
  industry?: string;
  revenue?: string;
  location?: string;
  notes?: string;
};

function mapLead(lead: any): LeadRecord {
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
  async list(access?: AccessScope, params: QueryParams = {}) {
    const where: Prisma.LeadWhereInput = { deletedAt: null };

    // Filters
    if (params.status) {
      const dbStatus = params.status === "won" ? "closed_won" : params.status === "lost" ? "closed_lost" : params.status;
      where.status = dbStatus as any;
    }
    if (params.source) where.source = params.source as any;
    if (params.assignedTo) where.assignedTo = params.assignedTo;
    if (params.minScore) where.score = { ...where.score as object, gte: params.minScore };
    if (params.maxScore) where.score = { ...where.score as object, lte: params.maxScore };
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { company: { contains: params.search, mode: "insensitive" } },
      ];
    }

    // RBAC
    if (access?.role === "employee") {
      where.assignedTo = { in: [access.email, access.userId ?? ""] };
    }

    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      take: params.limit || 50,
      skip: params.page ? (params.page - 1) * (params.limit || 50) : 0,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        jobTitle: true,
        source: true,
        status: true,
        score: true,
        assignedTo: true,
        notes: true,
        tags: true,
        convertedAt: true,
        convertedToClientId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const total = await prisma.lead.count({ where });

    return { leads: leads.map(mapLead), total, page: params.page || 1, limit: params.limit || 50 };
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

  async create(input: LeadInput, access?: AccessScope) {
    // Check for duplicate email
    const existing = await prisma.lead.findFirst({
      where: { email: input.email.toLowerCase(), deletedAt: null },
    });
    if (existing) {
      throw new AppError("A lead with this email already exists", 400, "DUPLICATE_EMAIL");
    }

    let dbStatus: any = input.status ?? "new";
    if (dbStatus === "won") dbStatus = "closed_won";
    if (dbStatus === "lost") dbStatus = "closed_lost";

    const lead = await prisma.lead.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email.toLowerCase(),
        company: input.company || "Unknown",
        jobTitle: input.jobTitle,
        phone: input.phone,
        source: input.source ?? "website",
        status: dbStatus,
        score: input.score ?? 50,
        assignedTo: input.assignedTo,
        notes: input.notes,
        tags: input.tags ?? [],
        companySize: input.companySize as any,
        budget: input.budget as any,
        timeline: input.timeline as any,
      },
    });

    // Trigger automation: Lead Created
    onLeadCreated(lead.id, {
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      company: lead.company,
      phone: lead.phone,
      source: lead.source,
      score: lead.score,
      createdBy: access?.email,
    }).catch((err) => console.error("Automation trigger failed:", err));

    return mapLead(lead);
  },

  async update(id: number, patch: Partial<LeadInput>, access?: AccessScope) {
    const existing = await this.getById(id, access);

    // Check for duplicate email if updating email
    if (patch.email && patch.email.toLowerCase() !== existing.email) {
      const duplicate = await prisma.lead.findFirst({
        where: { email: patch.email.toLowerCase(), deletedAt: null, id: { not: id } },
      });
      if (duplicate) {
        throw new AppError("A lead with this email already exists", 400, "DUPLICATE_EMAIL");
      }
    }

    const updateData: any = { ...patch, updatedAt: new Date() };
    if (patch.email) updateData.email = patch.email.toLowerCase();
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

    onLeadUpdated(lead.id, patch, access?.email).catch((err) => console.error("Automation trigger failed:", err));

    if (patch.status || patch.assignedTo || patch.company || patch.jobTitle || patch.phone || patch.score) {
      gtmLifecycleService.syncLeadLifecycle(lead.id, access?.email).catch((err) => console.error("Lifecycle sync failed:", err));
    }

    return mapLead(lead);
  },

  async delete(id: number, access?: AccessScope) {
    await this.getById(id, access);
    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },

  // ============================================
  // LEAD CONVERSION
  // ============================================
  async convertToClient(id: number, input: ConvertLeadInput, access?: AccessScope) {
    const lead = await this.getById(id, access);

    if (lead.convertedAt) {
      throw new AppError("Lead is already converted", 400, "ALREADY_CONVERTED");
    }

    // Create client from lead
    const client = await prisma.client.create({
      data: {
        name: input.clientName,
        email: input.clientEmail || lead.email,
        phone: input.clientPhone || lead.phone || undefined,
        company: lead.company || input.clientName,
        industry: input.industry || undefined,
        revenue: input.revenue || undefined,
        location: input.location || undefined,
        tier: (input.tier as any) || "Growth",
        status: "active",
        nextAction: "Onboarding",
        segment: "new_business",
        tags: lead.tags,
        assignedTo: lead.assignedTo || access?.email,
        lastContactDate: new Date(),
        engagementScore: 50,
        healthScore: 75,
        healthGrade: "B",
        avatar: input.clientName.substring(0, 2).toUpperCase(),
        updatedAt: new Date(),
      },
    });

    // Update lead as converted
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        status: "closed_won",
        convertedAt: new Date(),
        convertedToClientId: client.id,
        updatedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: access?.userId || "system",
        userName: access?.email || "System",
        action: "CONVERT",
        entity: "Lead",
        entityId: String(id),
        detail: `Lead "${lead.firstName} ${lead.lastName}" converted to client "${input.clientName}"`,
      },
    });

    gtmLifecycleService.syncLeadLifecycle(id, access?.email).catch((err) => console.error("Lifecycle sync failed:", err));

    return {
      lead: mapLead(updatedLead),
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        tier: client.tier,
        status: client.status,
      },
    };
  },

  // ============================================
  // GTM FEATURES
  // ============================================
  async recalculateScore(id: number) {
    const result = await GTMAutomationService.calculateLeadScore(id);
    
    // Update the lead score
    await prisma.lead.update({
      where: { id },
      data: { score: result.score, updatedAt: new Date() },
    });

    // Auto-tag based on score
    const tags = await GTMAutomationService.autoTagLead(id);

    return { score: result.score, breakdown: result.breakdown, tags };
  },

  async createFollowUpSequence(id: number, userEmail: string) {
    await GTMAutomationService.createFollowUpReminders(id, userEmail);
    gtmLifecycleService.syncLeadLifecycle(id, userEmail).catch((err) => console.error("Lifecycle sync failed:", err));
    return { success: true, message: "Follow-up sequence created" };
  },

  async assignToBestRep(id: number) {
    const result = await GTMAutomationService.assignLeadToBestRep(id);

    if (!result.assigned) {
      throw new AppError("No available team members to assign", 400, "NO_REPS_AVAILABLE");
    }

    return result;
  },

  async bulkRecalculateScores() {
    const leads = await prisma.lead.findMany({ where: { deletedAt: null } });

    let hotLeads = 0;
    let warmLeads = 0;
    let mediumLeads = 0;
    let coldLeads = 0;

    for (const lead of leads) {
      const result = await GTMAutomationService.calculateLeadScore(lead.id);
      await GTMAutomationService.autoTagLead(lead.id);
      await gtmLifecycleService.syncLeadLifecycle(lead.id, "system");

      if (result.score >= 80) hotLeads++;
      else if (result.score >= 60) warmLeads++;
      else if (result.score >= 40) mediumLeads++;
      else coldLeads++;
    }

    return {
      total: leads.length,
      hotLeads,
      warmLeads,
      mediumLeads,
      coldLeads,
      message: "All lead scores recalculated",
    };
  },

  async getHotLeads(minScore: number = 80) {
    const leads = await prisma.lead.findMany({
      where: {
        score: { gte: minScore },
        status: { notIn: ["closed_won", "closed_lost"] },
        deletedAt: null,
      },
      orderBy: { score: "desc" },
    });
    return leads.map(mapLead);
  },

  async getColdLeads(days: number = 14) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const leads = await prisma.lead.findMany({
      where: {
        updatedAt: { lt: cutoffDate },
        status: { notIn: ["closed_won", "closed_lost"] },
        deletedAt: null,
      },
      orderBy: { updatedAt: "asc" },
    });
    return leads.map(mapLead);
  },
};
