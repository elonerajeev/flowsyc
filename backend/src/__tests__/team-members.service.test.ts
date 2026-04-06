import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type MockTeamMember = {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Employee";
  status: "active" | "pending" | "completed";
  avatar: string;
  department: string;
  team: string;
  designation: string;
  manager: string;
  workingHours: string;
  officeLocation: string;
  timeZone: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  paymentMode: "bank-transfer" | "cash" | "upi";
  warningCount: number;
  suspendedAt: Date | null;
  terminationEligibleAt: Date | null;
  handoverCompletedAt: Date | null;
  terminatedAt: Date | null;
  separationNote: string | null;
  attendance: "present" | "late" | "remote" | "absent";
  checkIn: string;
  location: string;
  workload: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const mockState = {
  members: [] as MockTeamMember[],
};

const mockPrisma = {
  teamMember: {
    findUnique: jest.fn(async ({ where }: { where: { id?: number; email?: string } }) => {
      if (where.id !== undefined) {
        return mockState.members.find((member) => member.id === where.id) ?? null;
      }
      if (where.email !== undefined) {
        return mockState.members.find((member) => member.email === where.email) ?? null;
      }
      return null;
    }),
    create: jest.fn(async ({ data }: { data: Omit<MockTeamMember, "id" | "deletedAt" | "createdAt" | "updatedAt"> }) => {
      const member: MockTeamMember = {
        id: mockState.members.length + 1,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
      mockState.members.push(member);
      return member;
    }),
  },
};

jest.mock("../config/prisma", () => ({
  prisma: mockPrisma,
}));

describe("teamMembersService", () => {
  beforeEach(() => {
    mockState.members.length = 0;
    mockPrisma.teamMember.findUnique.mockClear();
    mockPrisma.teamMember.create.mockClear();
  });

  it("creates a team member with required fields", async () => {
    const { teamMembersService } = await import("../services/team-members.service");

    const member = await teamMembersService.create({
      name: "Minimal Member",
      email: "minimal@example.com",
      role: "Employee",
      department: "Operations",
      team: "Platform Ops",
      designation: "Employee",
      manager: "Team Lead",
      workingHours: "09:00 - 18:00",
      officeLocation: "HQ",
      timeZone: "Asia/Calcutta",
      baseSalary: 50000,
      allowances: 5000,
      deductions: 1000,
      paymentMode: "upi",
      attendance: "present",
      checkIn: "9:00 AM",
      location: "HQ",
    });

    expect(member.team).toBe("Platform Ops");
    expect(member.department).toBe("Operations");
    expect(member.paymentMode).toBe("upi");
    expect(member.workingHours).toBe("09:00 - 18:00");
  });

  it("throws 409 if team member email already exists", async () => {
    mockState.members.push({
      id: 1,
      name: "Existing Member",
      email: "existing@example.com",
      role: "Employee",
      status: "active",
      avatar: "EM",
      department: "Operations",
      team: "General",
      designation: "Employee",
      manager: "Team Lead",
      workingHours: "09:00 - 18:00",
      officeLocation: "HQ",
      timeZone: "Asia/Calcutta",
      baseSalary: 0,
      allowances: 0,
      deductions: 0,
      paymentMode: "upi",
      warningCount: 0,
      suspendedAt: null,
      terminationEligibleAt: null,
      handoverCompletedAt: null,
      terminatedAt: null,
      separationNote: null,
      attendance: "present",
      checkIn: "-",
      location: "HQ",
      workload: 0,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { teamMembersService } = await import("../services/team-members.service");
    await expect(
      teamMembersService.create({
        name: "Duplicate Member",
        email: "existing@example.com",
        role: "Employee",
        department: "Operations",
        team: "Platform Ops",
        designation: "Employee",
        manager: "Team Lead",
        workingHours: "09:00 - 18:00",
        officeLocation: "HQ",
        timeZone: "Asia/Calcutta",
        baseSalary: 50000,
        allowances: 5000,
        deductions: 1000,
        paymentMode: "upi",
        attendance: "present",
        checkIn: "9:00 AM",
        location: "HQ",
      }),
    ).rejects.toThrow("Team member email already exists");
  });

  it("throws 400 when required fields are missing", async () => {
    const { teamMembersService } = await import("../services/team-members.service");

    await expect(
      teamMembersService.create({
        name: "Missing Team Member",
        email: "missing-team@example.com",
        role: "Employee",
      }),
    ).rejects.toThrow("Department is required");
  });
});
