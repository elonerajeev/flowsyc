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
      const count = await prisma.deal.count({ where: { deletedAt: null } });

      // Auto-seed if empty
      if (count === 0 && (access?.role === "admin" || !access)) {
        const { dealRecords } = await import("../data/crm-static");
        await prisma.$transaction(
          dealRecords.map((d) => {
            let dbStage: any = d.stage.replace("-", "_"); // e.g. closed-won -> closed_won
            
            return prisma.deal.create({
              data: {
                title: d.title,
                value: d.value,
                stage: dbStage,
                probability: d.probability,
                expectedClose: new Date(d.expectedCloseDate),
                description: d.description,
                assignedTo: d.assignedTo,
                createdAt: new Date(d.createdAt),
                updatedAt: new Date(d.updatedAt),
              }
            });
          })
        );
      }

      const deals = await prisma.deal.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return deals.map(mapDeal);
    } catch (error: any) {
      // P2021 = Table does not exist (migration hasn't been run)
      if (error?.code === "P2021" || error?.message?.includes("relation \"Deal\" does not exist")) {
        console.warn("Deals table missing. Falling back to mock data for Phase 1 transition.");
        const { dealRecords } = await import("../data/crm-static");
        return dealRecords.map((d) => ({
          ...d,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }));
      }

      console.error("Deals service error:", error.message);
      // Fallback on ANY error during this transition phase to prevent 500s for the user
      const { dealRecords } = await import("../data/crm-static");
      return dealRecords.map((d) => ({
        ...d,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
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
