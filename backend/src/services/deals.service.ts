import { Prisma, type DealStage } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { UserRole } from "../config/types";
import { onDealStageChanged, triggerAutomation } from "./automation-engine";
import { gtmLifecycleService } from "./gtm-lifecycle.service";
import { logger } from "../utils/logger";
import { cache } from "../utils/cache";
import { createNotification } from "./notifications.service";

type DealRecord = {
  id: number;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate?: string | null;
  actualCloseDate?: string | null;
  companyId?: string | null;
  contactId?: string | null;
  assignedTo: string;
  description?: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type DealInput = {
  title: string;
  value?: number;
  currency?: string;
  stage?: DealStage;
  probability?: number;
  expectedCloseDate?: string;
  actualCloseDate?: string;
  companyId?: string;
  contactId?: string;
  assignedTo: string;
  description?: string;
  tags?: string[];
};

type AccessScope = {
  role: UserRole;
  email: string;
  userId?: string;
  organizationId?: string;
} | null | undefined;

function mapDeal(deal: any): DealRecord {
  let stage: string = deal.stage;
  if (stage === "closed_won") stage = "closed-won";
  if (stage === "closed_lost") stage = "closed-lost";
  return {
    ...deal,
    stage: stage as DealStage,
    expectedCloseDate: deal.expectedClose?.toISOString() ?? null,
    actualCloseDate: deal.actualClose?.toISOString() ?? null,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}

function toDbStage(stage?: string) {
  if (!stage) return undefined;
  if (stage === "closed-won") return "closed_won";
  if (stage === "closed-lost") return "closed_lost";
  return stage;
}

export const dealsService = {
  async list(access?: AccessScope) {
    const where: Prisma.DealWhereInput = { deletedAt: null };

    // Org-level isolation (primary)
    if (access?.organizationId) {
      where.organizationId = access.organizationId;
      if (access.role === "manager") {
        const ids = [access.email, access.userId].filter(Boolean) as string[];
        where.OR = [
          ...ids.map((id) => ({ createdBy: id })),
          ...ids.map((id) => ({ assignedTo: id })),
        ];
      } else if (access.role === "employee") {
        where.assignedTo = { in: [access.email, access.userId ?? ""].filter(Boolean) };
      }
    } else {
      // Backward-compat user-level isolation
      if (access?.role === "admin" || access?.role === "manager") {
        where.OR = [
          { createdBy: access.email },
          { assignedTo: access.email },
          { assignedTo: access.userId ?? "" },
        ];
      }
      if (access?.role === "employee") {
        where.assignedTo = { in: [access.email, access.userId ?? ""] };
      }
    }

    try {
      const deals = await prisma.deal.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return deals.map(mapDeal);
    } catch (error: any) {
      if (error?.code === "P2021" || error?.message?.includes("relation \"Deal\" does not exist")) {
        throw new AppError("Deal data is unavailable until the sales schema is migrated", 503, "SERVICE_UNAVAILABLE");
      }

      throw error;
    }
  },

  async getById(id: number, access?: AccessScope) {
    const deal = await prisma.deal.findUnique({ where: { id } });
    if (!deal || deal.deletedAt) {
      throw new AppError("Deal not found", 404, "NOT_FOUND");
    }

    if (access?.role === "admin" || access?.role === "manager") {
      const isCreator = deal.createdBy === access.email;
      const isAssignee = deal.assignedTo === access.email || deal.assignedTo === access.userId;
      if (!isCreator && !isAssignee) {
        throw new AppError("Access denied", 403, "FORBIDDEN");
      }
    }

    if (access?.role === "employee" && deal.assignedTo !== access.email && deal.assignedTo !== access.userId) {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    return mapDeal(deal);
  },

  async create(input: DealInput, access?: AccessScope) {
    const deal = await prisma.deal.create({
      data: {
        title: input.title,
        value: input.value ?? 0,
        currency: input.currency ?? "USD",
        stage: (toDbStage(input.stage) as any) ?? "prospecting",
        probability: input.probability ?? 50,
        expectedClose: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
        actualClose: input.actualCloseDate ? new Date(input.actualCloseDate) : null,
        description: input.description,
        assignedTo: input.assignedTo,
        createdBy: access?.email ?? null,
        tags: input.tags ?? [],
        organizationId: access?.organizationId ?? null,
      },
    });

    // Trigger automation: Deal Created
    triggerAutomation("deal_created", {
      trigger: "deal_created",
      entityType: "Deal",
      entityId: deal.id,
      data: {
        title: deal.title,
        value: deal.value,
        stage: deal.stage,
        probability: deal.probability,
        assignedTo: deal.assignedTo,
      },
    }).catch((err) => logger.error("Automation trigger failed:", err));

    gtmLifecycleService.syncDealLifecycle(deal.id, input.assignedTo).catch((err) => logger.error("Deal lifecycle sync failed:", err));

    // Notify assigned user
    if (deal.assignedTo) {
      createNotification({
        userId: deal.assignedTo,
        type: "deal",
        title: "New deal assigned",
        message: `You have been assigned to deal: ${deal.title}`,
        priority: deal.probability > 70 ? "high" : "medium",
        linkUrl: `/deals?dealId=${deal.id}`,
        linkLabel: "View deal",
        entityType: "Deal",
        entityId: deal.id,
        batchKey: `deal-assigned-${deal.assignedTo}`,
        metadata: { dealId: deal.id, value: deal.value, stage: deal.stage },
      }).catch((err) => logger.error("Failed to create notification:", err));
    }

    cache.invalidatePattern("gtm:overview:");
    return mapDeal(deal);
  },

  async update(id: number, patch: Partial<DealInput>, access?: AccessScope) {
    const existing = await this.getById(id, access);
    const dbStage = toDbStage(patch.stage);
    const deal = await prisma.deal.update({
      where: { id },
      data: {
        ...patch,
        ...(dbStage ? { stage: dbStage as any } : {}),
        ...(patch.expectedCloseDate && { expectedClose: new Date(patch.expectedCloseDate) }),
        ...(patch.actualCloseDate && { actualClose: new Date(patch.actualCloseDate) }),
        updatedAt: new Date(),
      },
    });

    // Trigger Zapier webhook for deal_stage_change event
    if (patch.stage && patch.stage !== existing.stage && access?.userId) {
      const { systemService } = await import("./system.service");
      const zapierConfig = await systemService.getZapierIntegration(access.userId, "deal_stage_change");
      if (zapierConfig) {
        systemService.sendZapierEvent(zapierConfig.webhookUrl, "deal_stage_change", {
          deal: {
            id: deal.id,
            name: deal.title,
            stage: deal.stage,
            previousStage: existing.stage,
            value: deal.value,
            probability: deal.probability,
            assignedTo: deal.assignedTo,
          },
          user: {
            id: access.userId,
            role: access.role,
          },
        });
      }
    }

    // Trigger automation: Deal Stage Changed
    if (patch.stage && patch.stage !== existing.stage) {
      onDealStageChanged(deal.id, deal.stage, existing.stage).catch((err) => logger.error("Automation trigger failed:", err));
    }

    gtmLifecycleService.syncDealLifecycle(deal.id, access?.email).catch((err) => logger.error("Deal lifecycle sync failed:", err));
    cache.invalidatePattern("gtm:overview:");
    return mapDeal(deal);
  },

  async syncLifecycle(id: number, access?: AccessScope) {
    await this.getById(id, access);
    return gtmLifecycleService.syncDealLifecycle(id, access?.email);
  },

  async delete(id: number, access?: AccessScope) {
    await this.getById(id, access);
    await prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    cache.invalidatePattern("gtm:overview:");
  },
};
