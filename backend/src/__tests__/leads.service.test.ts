import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type MockLead = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string | null;
  phone: string | null;
  status: "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "closed_won" | "closed_lost";
  source: "website" | "referral" | "social" | "email" | "other";
  score: number;
  assignedTo: string | null;
  createdBy: string | null;
  tags: string[];
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const mockState = {
  leads: [] as MockLead[],
};

const mockPrisma = {
  lead: {
    findUnique: jest.fn(async ({ where }: { where: { id?: number; email?: string } }) => {
      if (where.email) return mockState.leads.find((l) => l.email === where.email) ?? null;
      if (where.id) return mockState.leads.find((l) => l.id === where.id) ?? null;
      return null;
    }),
    findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      if (where.email) return mockState.leads.find((l) => l.email === where.email && !l.deletedAt) ?? null;
      return mockState.leads.find((l) => !l.deletedAt) ?? null;
    }),
    count: jest.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => {
      let leads = mockState.leads.filter((l) => !l.deletedAt);
      const andClauses = (where?.AND as Array<Record<string, unknown>>) ?? [];
      for (const clause of andClauses) {
        if (clause.status) leads = leads.filter((l) => l.status === clause.status);
      }
      return leads.length;
    }),
    findMany: jest.fn(async ({ where, take, skip }: { where?: Record<string, unknown>; take?: number; skip?: number } = {}) => {
      let leads = mockState.leads.filter((l) => !l.deletedAt);
      // Handle AND conditions (how the service builds filters)
      const andClauses = (where?.AND as Array<Record<string, unknown>>) ?? [];
      for (const clause of andClauses) {
        if (clause.status) leads = leads.filter((l) => l.status === clause.status);
        if (clause.OR) {
          // search OR clause
          const orClauses = clause.OR as Array<Record<string, unknown>>;
          leads = leads.filter((l) =>
            orClauses.some((oc) => {
              const field = Object.keys(oc)[0] as keyof typeof l;
              const val = (oc[field] as Record<string, string>)?.contains;
              if (!val) return false;
              return String(l[field] ?? "").toLowerCase().includes(val.toLowerCase());
            })
          );
        }
      }
      if (skip) leads = leads.slice(skip);
      if (take) leads = leads.slice(0, take);
      return leads;
    }),
    create: jest.fn(async ({ data }: { data: Omit<MockLead, "id" | "deletedAt" | "createdAt" | "updatedAt"> }) => {
      const lead: MockLead = {
        id: mockState.leads.length + 1,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      } as MockLead;
      mockState.leads.push(lead);
      return lead;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: number }; data: Partial<MockLead> }) => {
      const lead = mockState.leads.find((l) => l.id === where.id);
      if (!lead) throw new Error("Lead not found");
      Object.assign(lead, data, { updatedAt: new Date() });
      return lead;
    }),
    delete: jest.fn(async () => {}),
  },
  contact: {
    findFirst: jest.fn(async () => null),
    findUnique: jest.fn(async () => null),
    create: jest.fn(async () => ({})),
    update: jest.fn(async () => ({})),
  },
  deal: {
    findFirst: jest.fn(async () => null),
    create: jest.fn(async () => ({})),
    update: jest.fn(async () => ({})),
  },
  meeting: {
    findMany: jest.fn(async () => []),
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
  automationRule: {
    findMany: jest.fn(async () => []),
  },
  $transaction: jest.fn(async (ops: unknown[]) => Promise.all(ops as Array<Promise<unknown>>)),
};

jest.mock("../config/prisma", () => ({
  prisma: mockPrisma,
}));

describe("leadsService", () => {
  beforeEach(() => {
    mockState.leads.length = 0;
    mockPrisma.lead.findUnique.mockClear();
    mockPrisma.lead.findFirst.mockClear();
    mockPrisma.lead.count.mockClear();
    mockPrisma.lead.findMany.mockClear();
    mockPrisma.lead.create.mockClear();
    mockPrisma.lead.update.mockClear();
    mockPrisma.contact.findFirst.mockClear();
    mockPrisma.meeting.findMany.mockClear();
    mockPrisma.activity.create.mockClear();
    mockPrisma.automationRule.findMany.mockClear();
    mockPrisma.$transaction.mockClear();
  });

  describe("list", () => {
    it("returns empty array when no leads exist", async () => {
      const { leadsService } = await import("../services/leads.service");
      const result = await leadsService.list(null, { page: 1, limit: 20 });
      expect(result.leads).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns paginated leads", async () => {
      mockState.leads.push(
        { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com", company: "Acme", status: "new", source: "website", score: 50, jobTitle: null, phone: null, assignedTo: null, createdBy: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com", company: "Acme", status: "qualified", source: "referral", score: 70, jobTitle: null, phone: null, assignedTo: null, createdBy: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      );

      const { leadsService } = await import("../services/leads.service");
      const result = await leadsService.list(null, { page: 1, limit: 1 });

      expect(result.leads).toHaveLength(1);
      expect(result.total).toBe(2);
    });

    it("filters leads by status", async () => {
      mockState.leads.push(
        { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com", company: "Acme", status: "new", source: "website", score: 50, jobTitle: null, phone: null, assignedTo: null, createdBy: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com", company: "Acme", status: "qualified", source: "referral", score: 70, jobTitle: null, phone: null, assignedTo: null, createdBy: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      );

      const { leadsService } = await import("../services/leads.service");
      const result = await leadsService.list(null, { page: 1, limit: 20, status: "new" });

      expect(result.leads).toHaveLength(1);
      expect(result.leads[0].status).toBe("new");
    });

    it("filters leads by search", async () => {
      mockState.leads.push(
        { id: 1, firstName: "John", lastName: "Doe", email: "john@example.com", company: "Acme", status: "new", source: "website", score: 50, jobTitle: null, phone: null, assignedTo: null, createdBy: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, firstName: "Jane", lastName: "Smith", email: "jane@example.com", company: "TechCorp", status: "qualified", source: "referral", score: 70, jobTitle: null, phone: null, assignedTo: null, createdBy: null, tags: [], deletedAt: null, createdAt: new Date(), updatedAt: new Date() }
      );

      const { leadsService } = await import("../services/leads.service");
      const result = await leadsService.list(null, { page: 1, limit: 20, search: "Acme" });

      expect(result.leads).toHaveLength(1);
      expect(result.leads[0].company).toBe("Acme");
    });
  });

  describe("create", () => {
    it("creates a lead with required fields", async () => {
      const { leadsService } = await import("../services/leads.service");
      const lead = await leadsService.create({
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        company: "Acme Inc",
      }, null);

      expect(lead.email).toBe("john@example.com");
      expect(lead.firstName).toBe("John");
      expect(lead.lastName).toBe("Doe");
      expect(lead.company).toBe("Acme Inc");
    });

    it("throws 409 if email already exists", async () => {
      mockState.leads.push({
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        company: "Acme",
        status: "new",
        source: "website",
        score: 50,
        jobTitle: null,
        phone: null,
        assignedTo: null,
        createdBy: null,
        tags: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { leadsService } = await import("../services/leads.service");

      await expect(
        leadsService.create({
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
          company: "Acme",
        }, null)
      ).rejects.toThrow("A lead with this email already exists");
    });
  });

  describe("update", () => {
    it("updates a lead successfully", async () => {
      mockState.leads.push({
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        company: "Acme",
        status: "new",
        source: "website",
        score: 50,
        jobTitle: null,
        phone: null,
        assignedTo: null,
        createdBy: null,
        tags: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { leadsService } = await import("../services/leads.service");
      const updated = await leadsService.update(1, { status: "qualified" }, null);

      expect(updated.status).toBe("qualified");
    });

    it("throws 404 if lead not found", async () => {
      const { leadsService } = await import("../services/leads.service");

      await expect(
        leadsService.update(999, { status: "qualified" }, null)
      ).rejects.toThrow("Lead not found");
    });
  });

  describe("delete", () => {
    it("soft deletes a lead", async () => {
      mockState.leads.push({
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        company: "Acme",
        status: "new",
        source: "website",
        score: 50,
        jobTitle: null,
        phone: null,
        assignedTo: null,
        createdBy: null,
        tags: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { leadsService } = await import("../services/leads.service");
      await leadsService.delete(1, null);

      const lead = mockState.leads.find((l) => l.id === 1);
      expect(lead?.deletedAt).toBeInstanceOf(Date);
    });
  });

  describe("updateStage", () => {
    it("updates lead stage with valid status", async () => {
      mockState.leads.push({
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        company: "Acme",
        status: "new",
        source: "website",
        score: 50,
        jobTitle: null,
        phone: null,
        assignedTo: null,
        createdBy: null,
        tags: [],
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const { leadsService } = await import("../services/leads.service");
      await leadsService.updateStage(1, "qualified");

      const lead = mockState.leads.find((l) => l.id === 1);
      expect(lead?.status).toBe("qualified");
    });

    it("throws for invalid status", async () => {
      const { leadsService } = await import("../services/leads.service");

      await expect(
        leadsService.updateStage(1, "invalid_status" as any)
      ).rejects.toThrow();
    });
  });
});