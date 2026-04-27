import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockPrisma = {
  user: {
    findUnique: jest.fn(async () => null),
  },
  teamMember: {
    findFirst: jest.fn(async () => null),
  },
};

jest.mock("../config/prisma", () => ({
  prisma: mockPrisma,
}));

describe("access-control utilities", () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockClear();
    mockPrisma.teamMember.findFirst.mockClear();
  });

  describe("actorIds", () => {
    it("returns empty array for null actor", async () => {
      const { actorIds } = await import("../utils/access-control");
      const result = actorIds(null);
      expect(result).toHaveLength(0);
    });

    it("returns empty array for undefined actor", async () => {
      const { actorIds } = await import("../utils/access-control");
      const result = actorIds(undefined);
      expect(result).toHaveLength(0);
    });

    it("returns email only when userId is missing", async () => {
      const { actorIds } = await import("../utils/access-control");
      const result = actorIds({
        email: "test@example.com",
        role: "employee",
      });
      expect(result).toContain("test@example.com");
      expect(result).toHaveLength(1);
    });

    it("returns both email and userId when both present", async () => {
      const { actorIds } = await import("../utils/access-control");
      const result = actorIds({
        email: "test@example.com",
        userId: "user-123",
        role: "admin",
      });
      expect(result).toContain("test@example.com");
      expect(result).toContain("user-123");
      expect(result).toHaveLength(2);
    });

    it("deduplicates identical email and userId", async () => {
      const { actorIds } = await import("../utils/access-control");
      const result = actorIds({
        email: "test@example.com",
        userId: "test@example.com",
        role: "employee",
      });
      expect(result).toHaveLength(1);
    });
  });

  describe("getEmployeeAssigneeScope", () => {
    it("returns null for admin role", async () => {
      const { getEmployeeAssigneeScope } = await import("../utils/access-control");
      const result = await getEmployeeAssigneeScope({
        email: "admin@example.com",
        role: "admin",
      });
      expect(result).toBeNull();
    });

    it("returns null for manager role", async () => {
      const { getEmployeeAssigneeScope } = await import("../utils/access-control");
      const result = await getEmployeeAssigneeScope({
        email: "manager@example.com",
        role: "manager",
      });
      expect(result).toBeNull();
    });

    it("returns null for null actor", async () => {
      const { getEmployeeAssigneeScope } = await import("../utils/access-control");
      const result = await getEmployeeAssigneeScope(null);
      expect(result).toBeNull();
    });

    it("returns null for undefined actor", async () => {
      const { getEmployeeAssigneeScope } = await import("../utils/access-control");
      const result = await getEmployeeAssigneeScope(undefined);
      expect(result).toBeNull();
    });
  });

  describe("getEmployeeProjectScope", () => {
    it("returns null for non-employee role", async () => {
      const { getEmployeeProjectScope } = await import("../utils/access-control");
      const result = await getEmployeeProjectScope({
        email: "admin@example.com",
        role: "admin",
      });
      expect(result).toBeNull();
    });

    it("returns null for null actor", async () => {
      const { getEmployeeProjectScope } = await import("../utils/access-control");
      const result = await getEmployeeProjectScope(null);
      expect(result).toBeNull();
    });
  });

  describe("getClientAccessEmail", () => {
    it("returns null for admin role", async () => {
      const { getClientAccessEmail } = await import("../utils/access-control");
      const result = await getClientAccessEmail({
        email: "admin@example.com",
        role: "admin",
      });
      expect(result).toBeNull();
    });

    it("returns trimmed lowercase email for client role", async () => {
      const { getClientAccessEmail } = await import("../utils/access-control");
      const result = await getClientAccessEmail({
        email: "  Client@Example.COM  ",
        role: "client",
      });
      expect(result).toBe("client@example.com");
    });

    it("returns null for null actor", async () => {
      const { getClientAccessEmail } = await import("../utils/access-control");
      const result = await getClientAccessEmail(null);
      expect(result).toBeNull();
    });
  });

  describe("assertResourceOwnership", () => {
    it("does not throw for admin role", async () => {
      const { assertResourceOwnership } = await import("../utils/access-control");
      expect(() => {
        assertResourceOwnership(
          { email: "admin@example.com", role: "admin" },
          { createdBy: "other@example.com" }
        );
      }).not.toThrow();
    });

    it("does not throw for manager role", async () => {
      const { assertResourceOwnership } = await import("../utils/access-control");
      expect(() => {
        assertResourceOwnership(
          { email: "manager@example.com", role: "manager" },
          { createdBy: "manager@example.com" }
        );
      }).not.toThrow();
    });

    it("throws 403 when admin/manager doesn't own resource", async () => {
      const { assertResourceOwnership } = await import("../utils/access-control");
      expect(() => {
        assertResourceOwnership(
          { email: "manager@example.com", role: "manager" },
          { createdBy: "other@example.com" }
        );
      }).toThrow("Access denied: you do not own this resource");
    });

    it("does not throw for employee role", async () => {
      const { assertResourceOwnership } = await import("../utils/access-control");
      expect(() => {
        assertResourceOwnership(
          { email: "employee@example.com", role: "employee", userId: "123" },
          { createdBy: "other@example.com" }
        );
      }).not.toThrow();
    });
  });
});