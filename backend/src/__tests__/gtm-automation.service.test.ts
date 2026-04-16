import { describe, expect, it, jest, beforeAll, afterAll } from "@jest/globals";

jest.mock("../config/prisma", () => ({
  prisma: {
    lead: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    client: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    deal: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    alert: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    scheduledJob: {
      create: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
      delete: jest.fn(),
    },
    task: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    teamMember: {
      findMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

import { GTMAutomationService } from "../services/gtm-automation.service";
import { prisma } from "../config/prisma";

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("GTM Automation Service", () => {
  beforeAll(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("calculateLeadScore", () => {
    it("should calculate score for enterprise lead with referral source", async () => {
      const mockLead = {
        id: 1,
        firstName: "John",
        lastName: "Doe",
        email: "john@enterprise.com",
        company: "Enterprise Corp",
        source: "referral",
        companySize: "1000+",
        budget: "100k_500k",
        timeline: "immediate",
        score: 50,
        tags: [] as string[],
        status: "new",
        jobTitle: null,
        phone: null,
        assignedTo: null,
        assignedAt: null,
        notes: null,
        convertedAt: null,
        convertedToClientId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead as any);
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, score: 175 } as any);

      const result = await GTMAutomationService.calculateLeadScore(1);

      expect(result.score).toBe(100);
      expect(result.breakdown).toHaveProperty("companySize");
      expect(result.breakdown).toHaveProperty("source");
      expect(result.breakdown).toHaveProperty("budget");
      expect(result.breakdown).toHaveProperty("timeline");
      expect(result.breakdown).toHaveProperty("existingScore");
    });

    it("should return 0 score for non-existent lead", async () => {
      mockPrisma.lead.findUnique.mockResolvedValue(null);

      const result = await GTMAutomationService.calculateLeadScore(999);

      expect(result.score).toBe(0);
    });
  });

  describe("autoTagLead", () => {
    it("should tag hot lead for score >= 80", async () => {
      const mockLead = {
        id: 2,
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@bigcorp.com",
        company: "Big Corp",
        source: "referral",
        score: 85,
        tags: [] as string[],
        companySize: "1000+",
        budget: "100k_500k",
        timeline: "immediate",
        status: "new",
        jobTitle: null,
        phone: null,
        assignedTo: null,
        assignedAt: null,
        notes: null,
        convertedAt: null,
        convertedToClientId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead as any);
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, tags: ["hot-lead", "priority", "referral", "enterprise"] } as any);

      const tags = await GTMAutomationService.autoTagLead(2);

      expect(tags).toContain("hot-lead");
      expect(tags).toContain("priority");
      expect(tags).toContain("enterprise");
      expect(tags).toContain("referral");
    });

    it("should tag cold lead for score < 40", async () => {
      const mockLead = {
        id: 3,
        firstName: "Bob",
        lastName: "Jones",
        email: "bob@smallco.com",
        company: "Small Co",
        source: "website",
        score: 25,
        tags: [] as string[],
        status: "new",
        companySize: "1-10",
        budget: null,
        timeline: null,
        jobTitle: null,
        phone: null,
        assignedTo: null,
        assignedAt: null,
        notes: null,
        convertedAt: null,
        convertedToClientId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead as any);
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, tags: ["cold-lead"] } as any);

      const tags = await GTMAutomationService.autoTagLead(3);

      expect(tags).toContain("cold-lead");
    });
  });

  describe("calculateClientHealthScore", () => {
    it("should calculate health score for active Enterprise client", async () => {
      const mockClient = {
        id: 1,
        name: "Enterprise Client",
        email: "contact@enterprise.com",
        status: "active",
        tier: "Enterprise",
        engagementScore: 80,
        lastContactDate: new Date(),
        healthScore: 75,
        healthGrade: "B",
        industry: "Tech",
        manager: "Manager",
        revenue: "$100k",
        location: "NYC",
        avatar: "EC",
        nextAction: "Follow up",
        segment: "new_business",
        companyId: null,
        jobTitle: null,
        source: null,
        assignedTo: null,
        phone: "",
        company: "Enterprise",
        tags: [] as string[],
        contractStartDate: null,
        contractEndDate: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.client.findUnique.mockResolvedValue(mockClient as any);
      mockPrisma.client.update.mockResolvedValue({ ...mockClient, healthScore: 95, healthGrade: "A" } as any);

      const result = await GTMAutomationService.calculateClientHealthScore(1);

      expect(result.score).toBe(95);
      expect(result.grade).toBe("A+");
      expect(result.breakdown).toHaveProperty("lastContact");
      expect(result.breakdown).toHaveProperty("engagement");
      expect(result.breakdown).toHaveProperty("status");
      expect(result.breakdown).toHaveProperty("tier");
    });

    it("should return D grade for neglected client", async () => {
      const mockClient = {
        id: 2,
        name: "Neglected Client",
        email: "neglected@oldclient.com",
        status: "pending",
        tier: "Growth",
        engagementScore: 10,
        lastContactDate: null,
        healthScore: 30,
        healthGrade: "D",
        industry: "Retail",
        manager: "Manager",
        revenue: "$10k",
        location: "LA",
        avatar: "NC",
        nextAction: "Re-engage",
        segment: "new_business",
        companyId: null,
        jobTitle: null,
        source: null,
        assignedTo: null,
        phone: "",
        company: "Old Client",
        tags: [] as string[],
        contractStartDate: null,
        contractEndDate: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.client.findUnique.mockResolvedValue(mockClient as any);
      mockPrisma.client.update.mockResolvedValue({ ...mockClient, healthScore: 35, healthGrade: "F" } as any);

      const result = await GTMAutomationService.calculateClientHealthScore(2);

      expect(result.grade).toBe("F");
      expect(result.score).toBeLessThan(50);
    });
  });

  describe("checkStaleDeals", () => {
    it("should create alerts for stale deals", async () => {
      const staleDeals = [
        {
          id: 1,
          title: "Stale Deal 1",
          value: 50000,
          stage: "negotiation",
          assignedTo: "rep@example.com",
          updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      ];

      mockPrisma.deal.findMany.mockResolvedValue(staleDeals as any);
      mockPrisma.alert.create.mockResolvedValue({ id: 1 } as any);
      mockPrisma.task.create.mockResolvedValue({ id: 1 } as any);

      const result = await GTMAutomationService.checkStaleDeals();

      expect(result).toBe(1);
      expect(mockPrisma.alert.create).toHaveBeenCalled();
      expect(mockPrisma.task.create).toHaveBeenCalled();
    });
  });

  describe("assignLeadToBestRep", () => {
    it("should assign to least loaded rep", async () => {
      const mockLead = {
        id: 5,
        firstName: "New",
        lastName: "Lead",
        email: "new@lead.com",
        company: "New Lead Co",
        source: "inbound",
        score: 60,
        tags: [] as string[],
        status: "new",
        companySize: "51-200",
        budget: null,
        timeline: null,
        jobTitle: null,
        phone: null,
        assignedTo: null,
        assignedAt: null,
        notes: null,
        convertedAt: null,
        convertedToClientId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockReps = [
        { id: 1, email: "rep1@company.com", status: "active", deletedAt: null },
        { id: 2, email: "rep2@company.com", status: "active", deletedAt: null },
      ];

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead as any);
      mockPrisma.teamMember.findMany.mockResolvedValue(mockReps as any);
      mockPrisma.lead.count.mockResolvedValueOnce(5).mockResolvedValueOnce(2);
      mockPrisma.lead.groupBy.mockResolvedValue([
        { assignedTo: "rep1@company.com", _count: 3 },
        { assignedTo: "rep2@company.com", _count: 1 },
      ] as any);
      mockPrisma.deal.groupBy.mockResolvedValue([
        { assignedTo: "rep1@company.com", _sum: { value: 50000 } },
        { assignedTo: "rep2@company.com", _sum: { value: 10000 } },
      ] as any);
      mockPrisma.deal.aggregate.mockResolvedValue({ _sum: { value: 10000 } } as any);
      mockPrisma.lead.update.mockResolvedValue({ ...mockLead, assignedTo: "rep2@company.com" } as any);

      const result = await GTMAutomationService.assignLeadToBestRep(5);

      expect(result.assigned).toBe(true);
      expect(result.repEmail).toBe("rep2@company.com");
    });
  });

  describe("checkChurnRisk", () => {
    it("should identify at-risk clients", async () => {
      const atRiskClients = [
        { id: 1, name: "Risk Client", healthScore: 35, status: "active" },
      ];

      mockPrisma.client.findMany.mockResolvedValue(atRiskClients as any);
      mockPrisma.alert.findFirst.mockResolvedValue(null);
      mockPrisma.alert.create.mockResolvedValue({ id: 1 } as any);

      const result = await GTMAutomationService.checkChurnRisk();

      expect(result).toBe(1);
      expect(mockPrisma.alert.create).toHaveBeenCalled();
    });
  });

  describe("createRenewalReminders", () => {
    it("should create reminders for Enterprise clients", async () => {
      const enterpriseClients = [
        { id: 1, name: "Big Enterprise", tier: "Enterprise", status: "active" },
      ];

      mockPrisma.client.findMany.mockResolvedValue(enterpriseClients as any);
      mockPrisma.scheduledJob.create.mockResolvedValue({ id: 1 } as any);

      const result = await GTMAutomationService.createRenewalReminders();

      expect(result).toBe(1);
      expect(mockPrisma.scheduledJob.create).toHaveBeenCalledTimes(3);
    });
  });

  describe("identifyColdLeads", () => {
    it("should identify and tag cold leads", async () => {
      const coldLeads = [
        {
          id: 1,
          firstName: "Cold",
          lastName: "Lead",
          email: "cold@lead.com",
          company: "Cold Co",
          assignedTo: "rep@company.com",
          tags: ["cold-lead"],
          source: "website",
          score: 20,
          status: "new",
          companySize: "11-50",
          budget: null,
          timeline: null,
          jobTitle: null,
          phone: null,
          assignedAt: null,
          notes: null,
          convertedAt: null,
          convertedToClientId: null,
          deletedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
        },
      ];

      mockPrisma.lead.findMany.mockResolvedValue(coldLeads as any);
      mockPrisma.task.create.mockResolvedValue({ id: 1 } as any);
      mockPrisma.lead.update.mockResolvedValue({ ...coldLeads[0], tags: ["needs-re-engagement"] } as any);

      const result = await GTMAutomationService.identifyColdLeads(30);

      expect(result).toBe(1);
      expect(mockPrisma.task.create).toHaveBeenCalled();
    });
  });

  describe("createFollowUpReminders", () => {
    it("should create day 1, 3, and 7 follow-up reminders", async () => {
      const mockLead = {
        id: 10,
        firstName: "Follow",
        lastName: "Up",
        email: "follow@up.com",
        company: "FollowUp Inc",
        source: "inbound",
        score: 50,
        tags: [] as string[],
        status: "new",
        companySize: null,
        budget: null,
        timeline: null,
        jobTitle: null,
        phone: null,
        assignedTo: null,
        assignedAt: null,
        notes: null,
        convertedAt: null,
        convertedToClientId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.lead.findUnique.mockResolvedValue(mockLead as any);
      mockPrisma.scheduledJob.create.mockResolvedValue({ id: 1 } as any);

      await GTMAutomationService.createFollowUpReminders(10, "test@example.com");

      expect(mockPrisma.scheduledJob.create).toHaveBeenCalledTimes(3);
    });
  });
});
