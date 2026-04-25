import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type MockDeal = {
  id: number;
  title: string;
  value: number;
  currency: string;
  stage: "prospecting" | "qualification" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  probability: number;
  assignedTo: string | null;
  createdBy: string | null;
  expectedClose: Date | null;
  description: string | null;
  tags: string[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const mockState = {
  deals: [] as MockDeal[],
};

const mockPrisma = {
  deal: {
    findUnique: jest.fn(async ({ where }: { where: { id?: number } }) => {
      if (where.id) return mockState.deals.find((d) => d.id === where.id) ?? null;
      return null;
    }),
    findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      return mockState.deals.find((d) => !d.deletedAt) ?? null;
    }),
    count: jest.fn(async () => mockState.deals.filter((d) => !d.deletedAt).length),
    findMany: jest.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => {
      let deals = mockState.deals.filter((d) => !d.deletedAt);
      if (where?.stage) deals = deals.filter((d) => d.stage === where.stage);
      if (where?.OR) {
        const orClauses = where.OR as Array<Record<string, unknown>>;
        deals = deals.filter((d) =>
          orClauses.some((clause) => {
            const field = Object.keys(clause)[0] as keyof typeof d;
            const val = (clause[field] as Record<string, string>)?.contains;
            if (!val) return false;
            return String(d[field] ?? "").toLowerCase().includes(val.toLowerCase());
          })
        );
      }
      return deals;
    }),
    create: jest.fn(async ({ data }: { data: Omit<MockDeal, "id" | "deletedAt" | "createdAt" | "updatedAt"> }) => {
      const deal: MockDeal = {
        id: mockState.deals.length + 1,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      } as MockDeal;
      mockState.deals.push(deal);
      return deal;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: number }; data: Partial<MockDeal> }) => {
      const deal = mockState.deals.find((d) => d.id === where.id);
      if (!deal) throw new Error("Deal not found");
      Object.assign(deal, data, { updatedAt: new Date() });
      return deal;
    }),
  },
  automationRule: {
    findMany: jest.fn(async () => []),
  },
  lead: {
    findUnique: jest.fn(async () => null),
    findFirst: jest.fn(async () => null),
  },
  contact: {
    findUnique: jest.fn(async () => null),
    findFirst: jest.fn(async () => null),
    create: jest.fn(async () => ({})),
  },
  activity: {
    create: jest.fn(async () => ({})),
  },
  activityLog: {
    create: jest.fn(async () => ({})),
  },
  scheduledJob: {
    findFirst: jest.fn(async () => null),
    create: jest.fn(async () => ({})),
  },
  $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Array<Promise<unknown>>)),
};

jest.mock("../config/prisma", () => ({
  prisma: mockPrisma,
}));

describe("dealsService", () => {
  beforeEach(() => {
    mockState.deals.length = 0;
    mockPrisma.deal.findUnique.mockClear();
    mockPrisma.deal.findFirst.mockClear();
    mockPrisma.deal.count.mockClear();
    mockPrisma.deal.findMany.mockClear();
    mockPrisma.deal.create.mockClear();
    mockPrisma.deal.update.mockClear();
    mockPrisma.automationRule.findMany.mockClear();
    mockPrisma.$transaction.mockClear();
  });

  describe("list", () => {
    it("returns empty array when no deals exist", async () => {
      const { dealsService } = await import("../services/deals.service");
      const result = await dealsService.list();
      expect(result).toHaveLength(0);
    });

    it("returns all deals", async () => {
      mockState.deals.push(
        { id: 1, title: "Deal 1", value: 10000, currency: "USD", stage: "prospecting", probability: 50, assignedTo: null, createdBy: null, expectedClose: null, description: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, title: "Deal 2", value: 20000, currency: "USD", stage: "negotiation", probability: 75, assignedTo: null, createdBy: null, expectedClose: null, description: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      );

      const { dealsService } = await import("../services/deals.service");
      const result = await dealsService.list();

      expect(result).toHaveLength(2);
    });

    it.skip("filters deals by stage", async () => {
      mockState.deals.push(
        { id: 1, title: "Deal 1", value: 10000, currency: "USD", stage: "prospecting", probability: 50, assignedTo: null, createdBy: null, expectedClose: null, description: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, title: "Deal 2", value: 20000, currency: "USD", stage: "closed_won", probability: 100, assignedTo: null, createdBy: null, expectedClose: null, description: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      );

      const { dealsService } = await import("../services/deals.service");
      const result = await dealsService.list({ stage: "prospecting" });

      expect(result).toHaveLength(1);
      expect(result[0].stage).toBe("prospecting");
    });

    it.skip("filters deals by search", async () => {
      mockState.deals.push(
        { id: 1, title: "Acme Deal", value: 10000, currency: "USD", stage: "prospecting", probability: 50, assignedTo: null, createdBy: null, expectedClose: null, description: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, title: "TechCorp Deal", value: 20000, currency: "USD", stage: "negotiation", probability: 75, assignedTo: null, createdBy: null, expectedClose: null, description: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      );

      const { dealsService } = await import("../services/deals.service");
      const result = await dealsService.list({ search: "Acme" });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Acme Deal");
    });
  });

  describe("create", () => {
    it("creates a deal with required fields", async () => {
      const { dealsService } = await import("../services/deals.service");
      const deal = await dealsService.create({
        title: "Big Deal",
        value: 50000,
      }, null);

      expect(deal.title).toBe("Big Deal");
      expect(deal.value).toBe(50000);
      expect(deal.currency).toBe("USD");
      expect(deal.stage).toBe("prospecting");
    });

    it("creates deal with full input", async () => {
      const { dealsService } = await import("../services/deals.service");
      const deal = await dealsService.create({
        title: "Enterprise Deal",
        value: 100000,
        stage: "proposal",
        probability: 60,
      }, null);

      expect(deal.title).toBe("Enterprise Deal");
      expect(deal.value).toBe(100000);
      expect(deal.stage).toBe("proposal");
      expect(deal.probability).toBe(60);
    });
  });

  describe("update", () => {
    it("updates a deal successfully", async () => {
      mockState.deals.push({
        id: 1,
        title: "Deal 1",
        value: 10000,
        currency: "USD",
        stage: "prospecting",
        probability: 50,
        assignedTo: null,
        createdBy: null,
        expectedClose: null,
        description: null,
        tags: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { dealsService } = await import("../services/deals.service");
      const updated = await dealsService.update(1, { stage: "negotiation", probability: 75 }, null);

      expect(updated.stage).toBe("negotiation");
      expect(updated.probability).toBe(75);
    });

    it("throws 404 if deal not found", async () => {
      const { dealsService } = await import("../services/deals.service");

      await expect(
        dealsService.update(999, { stage: "negotiation" }, null)
      ).rejects.toThrow("Deal not found");
    });
  });

  describe("delete", () => {
    it("soft deletes a deal", async () => {
      mockState.deals.push({
        id: 1,
        title: "Deal 1",
        value: 10000,
        currency: "USD",
        stage: "prospecting",
        probability: 50,
        assignedTo: null,
        createdBy: null,
        expectedClose: null,
        description: null,
        tags: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { dealsService } = await import("../services/deals.service");
      await dealsService.delete(1, null);

      const deal = mockState.deals.find((d) => d.id === 1);
      expect(deal?.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe.skip("updateStage", () => {
    it("updates deal stage", async () => {
      mockState.deals.push({
        id: 1,
        title: "Deal 1",
        value: 10000,
        currency: "USD",
        stage: "prospecting",
        probability: 50,
        assignedTo: null,
        createdBy: null,
        expectedClose: null,
        description: null,
        tags: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { dealsService } = await import("../services/deals.service");
      await dealsService.updateStage(1, "closed_won", null);

      const deal = mockState.deals.find((d) => d.id === 1);
      expect(deal?.stage).toBe("closed_won");
    });
  });

  describe.skip("getPipeline", () => {
    it("returns pipeline breakdown by stage", async () => {
      mockState.deals.push(
        { id: 1, title: "Deal 1", value: 10000, currency: "USD", stage: "prospecting", probability: 50, assignedTo: null, createdBy: null, expectedClose: null, description: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, title: "Deal 2", value: 20000, currency: "USD", stage: "prospecting", probability: 50, assignedTo: null, createdBy: null, expectedClose: null, description: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, title: "Deal 3", value: 30000, currency: "USD", stage: "closed_won", probability: 100, assignedTo: null, createdBy: null, expectedClose: null, description: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      );

      const { dealsService } = await import("../services/deals.service");
      const pipeline = await dealsService.getPipeline();

      const prospecting = pipeline.find((s) => s.stage === "prospecting");
      const closedWon = pipeline.find((s) => s.stage === "closed_won");

      expect(prospecting?.value).toBe(2);
      expect(closedWon?.value).toBe(1);
    });
  });
});