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

    const deals = await prisma.deal.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return deals.map(mapDeal);
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
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.stage !== undefined && { stage: input.stage }),
        ...(input.probability !== undefined && { probability: input.probability }),
        ...(input.expectedCloseDate !== undefined && { expectedClose: new Date(input.expectedCloseDate) }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.assignedTo !== undefined && { assignedTo: input.assignedTo }),
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
        updatedAt: new Date(),
      },
    });
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
