import { Prisma, type LeadStatus, type LeadSource } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { UserRole } from "../config/types";
import { triggerAutomation, onLeadCreated, onLeadUpdated } from "./automation-engine";
import { GTMAutomationService } from "./gtm-automation.service";
import { gtmLifecycleService } from "./gtm-lifecycle.service";
import { logger } from "../utils/logger";
import { cache, TTL } from "../utils/cache";

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
  createdBy?: string | null; // User who created this lead
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
    createdBy: lead.createdBy ?? null,
  };
}

export const leadsService = {
  async list(access?: AccessScope, params: QueryParams = {}) {
    const where: Prisma.LeadWhereInput = { deletedAt: null };

    // Build filter conditions
    const filterConditions: Prisma.LeadWhereInput[] = [];
    
    // Search filter
    if (params.search) {
      filterConditions.push({
        OR: [
          { firstName: { contains: params.search, mode: "insensitive" } },
          { lastName: { contains: params.search, mode: "insensitive" } },
          { email: { contains: params.search, mode: "insensitive" } },
          { company: { contains: params.search, mode: "insensitive" } },
        ],
      });
    }

    // Filters
    if (params.status) {
      filterConditions.push({ status: params.status as any });
    }
    if (params.source) filterConditions.push({ source: params.source as any });
    if (params.assignedTo) filterConditions.push({ assignedTo: params.assignedTo });
    if (params.minScore) filterConditions.push({ score: { gte: params.minScore } });
    if (params.maxScore) filterConditions.push({ score: { lte: params.maxScore } });

    // Data isolation: Admin/Manager can only see leads they created or assigned to them
    if (access?.role === "admin" || access?.role === "manager") {
      filterConditions.push({
        OR: [
          { createdBy: access.email },
          { assignedTo: access.email },
          { assignedTo: access.userId ?? "" },
        ],
      });
    }

    // RBAC
    if (access?.role === "employee") {
      filterConditions.push({
        assignedTo: { in: [access.email, access.userId ?? ""] },
      });
    }

    // Apply all filters
    if (filterConditions.length > 0) {
      where.AND = filterConditions;
    }

    const sortBy = params.sortBy || "createdAt";
    const sortOrder = params.sortOrder === "asc" ? "asc" : "desc";

    // Cache full unfiltered admin/manager list (most common case)
    const isUnfiltered = !params.status && !params.source && !params.search &&
      !params.assignedTo && !params.minScore && !params.maxScore &&
      access?.role !== "employee" && (params.limit || 50) >= 500;

    const cacheKey = `leads:list:${params.limit || 50}`;
    if (isUnfiltered) {
      const cached = cache.get<{ leads: ReturnType<typeof mapLead>[]; total: number; page: number; limit: number }>(cacheKey);
      if (cached) return cached;
    }

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
        createdBy: true,
      } as any,
    });

    const total = await prisma.lead.count({ where });

    const result = { leads: leads.map(mapLead), total, page: params.page || 1, limit: params.limit || 50 };
    if (isUnfiltered) cache.set(cacheKey, result, TTL.LEADS_LIST);
    return result;
  },

  async getById(id: number, access?: AccessScope) {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead || lead.deletedAt) {
      throw new AppError("Lead not found", 404, "NOT_FOUND");
    }

    // Data isolation: Admin/Manager can only access leads they created or assigned to them
    if ((access?.role === "admin" || access?.role === "manager")) {
      if (lead.createdBy !== access.email && 
          lead.assignedTo !== access.email && 
          lead.assignedTo !== access.userId) {
        throw new AppError("Access denied", 403, "FORBIDDEN");
      }
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
        createdBy: access?.email, // Track who created this lead
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
    }).catch((err) => logger.error("Automation trigger failed:", err));

    cache.invalidatePrefix("leads:list");
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

    onLeadUpdated(lead.id, patch, access?.email).catch((err) => logger.error("Automation trigger failed:", err));

    if (patch.status || patch.assignedTo || patch.company || patch.jobTitle || patch.phone || patch.score) {
      gtmLifecycleService.syncLeadLifecycle(lead.id, access?.email).catch((err) => logger.error("Lifecycle sync failed:", err));
    }

    cache.invalidatePrefix("leads:list");
    cache.invalidatePattern("gtm:overview:");
    return mapLead(lead);
  },

  async delete(id: number, access?: AccessScope) {
    const lead = await this.getById(id, access);
    
    // Get related data before deletion for logging
    const relatedContact = await prisma.contact.findFirst({ where: { leadId: id } });
    const relatedMeetings = await prisma.meeting.findMany({ where: { leadId: id } });
    const relatedClientId = lead.convertedToClientId;
    
    // Soft delete the lead
    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    
    // Keep related data but disassociate from the deleted lead:
    // 1. Contact - keep it but remove leadId reference (it becomes a standalone contact)
    if (relatedContact) {
      await prisma.contact.update({
        where: { id: relatedContact.id },
        data: { leadId: null },
      });
    }
    
    // 2. Meetings - keep them but remove leadId reference
    if (relatedMeetings.length > 0) {
      await prisma.meeting.updateMany({
        where: { leadId: id },
        data: { leadId: null },
      });
    }
    
    // 3. Log the deletion activity
    await prisma.activityLog.create({
      data: {
        action: "deleted",
        entityType: "Lead",
        entityId: id,
        description: `Lead deleted: ${lead.firstName} ${lead.lastName} (${lead.email})`,
        performedBy: access?.email || "system",
        isVisible: true,
      },
    });
    
    // Invalidate caches
    cache.invalidatePrefix("leads:list");
    cache.invalidatePattern("gtm:overview:");
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

    gtmLifecycleService.syncLeadLifecycle(id, access?.email).catch((err) => logger.error("Lifecycle sync failed:", err));

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
    
    await prisma.lead.update({
      where: { id },
      data: { score: result.score, updatedAt: new Date() },
    });

    const tags = await GTMAutomationService.autoTagLead(id);

    // Fire lead_score_above trigger so auto-assignment rule can run
    triggerAutomation("lead_scored" as any, {
      trigger: "lead_scored" as any,
      entityType: "Lead",
      entityId: id,
      data: { score: result.score, ...result.breakdown },
    }).catch(() => {});

    return { score: result.score, breakdown: result.breakdown, tags };
  },

  async createFollowUpSequence(id: number, userEmail: string) {
    await GTMAutomationService.createFollowUpReminders(id, userEmail);
    gtmLifecycleService.syncLeadLifecycle(id, userEmail).catch((err) => logger.error("Lifecycle sync failed:", err));
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
    const leads = await prisma.lead.findMany({ where: { deletedAt: null }, select: { id: true } });

    const BATCH = 10;
    let hotLeads = 0, warmLeads = 0, mediumLeads = 0, coldLeads = 0;

    for (let i = 0; i < leads.length; i += BATCH) {
      const batch = leads.slice(i, i + BATCH);
      const results = await Promise.all(
        batch.map(async ({ id }) => {
          const result = await GTMAutomationService.calculateLeadScore(id);
          await GTMAutomationService.autoTagLead(id);
          gtmLifecycleService.syncLeadLifecycle(id, "system").catch(() => {});
          triggerAutomation("lead_scored" as any, {
            trigger: "lead_scored" as any,
            entityType: "Lead",
            entityId: id,
            data: { score: result.score },
          }).catch(() => {});
          return result.score;
        })
      );
      for (const score of results) {
        if (score >= 80) hotLeads++;
        else if (score >= 60) warmLeads++;
        else if (score >= 40) mediumLeads++;
        else coldLeads++;
      }
    }

    return { total: leads.length, hotLeads, warmLeads, mediumLeads, coldLeads, message: "All lead scores recalculated" };
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

  async updateStage(leadId: number, status: string, notes?: string, actor?: any) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new AppError("Lead not found", 404, "NOT_FOUND");
    }

    const oldStatus = lead.status;
    const updatedLead = await prisma.lead.update({
      where: { id: leadId },
      data: { status: status as LeadStatus },
    });

    await prisma.activity.create({
      data: {
        entityType: "lead",
        entityId: leadId,
        type: "stage_change",
        title: `Stage changed: ${oldStatus} → ${status}`,
        description: notes || `Lead moved from ${oldStatus} to ${status}`,
        metadata: JSON.stringify({ oldStatus, newStatus: status }),
        createdBy: String(actor?.userId || actor?.email || "system"),
      },
    });

    logger.debug(`[Lead Stage Update] Triggering automation for lead ${leadId}: ${oldStatus} → ${status}`);
    
    try {
      await onLeadUpdated(leadId, { status: status as any }, actor?.email);
      logger.debug(`[Lead Stage Update] Automation completed for lead ${leadId}`);
    } catch (err) {
      logger.error(`[Lead Stage Update] Automation failed for lead ${leadId}:`, err);
    }

    return {
      success: true,
      lead: mapLead(updatedLead),
      previousStatus: oldStatus,
      newStatus: status,
    };
  },

  async logActivity(leadId: number, type: string, title: string, description?: string, actor?: any) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      throw new AppError("Lead not found", 404, "NOT_FOUND");
    }

    const activity = await prisma.activity.create({
      data: {
        entityType: "lead",
        entityId: leadId,
        type: type as any,
        title,
        description: description || "",
        metadata: JSON.stringify({}),
        createdBy: String(actor?.userId || actor?.email || "system"),
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { lastContactDate: new Date() },
    }).catch(() => {});

    return activity;
  },

  async getActivities(leadId: number, limit = 50) {
    const activities = await prisma.activity.findMany({
      where: { entityType: "lead", entityId: leadId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return activities.map((a) => ({
      ...a,
      metadata: a.metadata ? JSON.parse(a.metadata) : {},
    }));
  },

  async getMeetings(leadId: number) {
    const meetings = await prisma.meeting.findMany({
      where: { leadId },
      orderBy: { scheduledAt: "desc" },
    });
    return meetings;
  },
};
