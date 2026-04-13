import { Prisma, type DealStage } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { UserRole } from "../config/types";

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
} | null | undefined;

function mapDeal(deal: any): DealRecord {
  return {
    ...deal,
    createdAt: deal.createdAt.toISOString(),
    updatedAt: deal.updatedAt.toISOString(),
  };
}

export const dealsService = {
  async list(access?: AccessScope) {
    const where: Prisma.DealWhereInput = { deletedAt: null };

    // RBAC: Admins/Managers see all; Employees see assigned deals
    if (access?.role === "employee") {
      where.assignedTo = { in: [access.email, access.userId ?? ""] };
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

    if (access?.role === "employee" && deal.assignedTo !== access.email && deal.assignedTo !== access.userId) {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    return mapDeal(deal);
  },

  async create(input: DealInput) {
    const deal = await prisma.deal.create({
      data: {
        title: input.title,
        value: input.value ?? 0,
        currency: input.currency ?? "USD",
        stage: input.stage ?? "prospecting",
        probability: input.probability ?? 50,
        expectedClose: input.expectedCloseDate ? new Date(input.expectedCloseDate) : null,
        actualClose: input.actualCloseDate ? new Date(input.actualCloseDate) : null,
        description: input.description,
        assignedTo: input.assignedTo,
        tags: input.tags ?? [],
      },
    });
    return mapDeal(deal);
  },

  async update(id: number, patch: Partial<DealInput>, access?: AccessScope) {
    const existing = await this.getById(id, access);
    const deal = await prisma.deal.update({
      where: { id },
      data: {
        ...patch,
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

    return mapDeal(deal);
  },

  async delete(id: number, access?: AccessScope) {
    await this.getById(id, access);
    await prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  },
};
