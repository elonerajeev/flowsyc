import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type MockTeamMember = {
  id: number;
  name: string;
  email: string;
  userId: string | null;
  role: "Admin" | "Manager" | "Employee";
  status: "active" | "pending" | "completed";
  avatar: string;
  department: string;
  team: string;
  teamId: number | null;
  organizationId: string | null;
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
    create: jest.fn(async ({ data }: { data: Partial<MockTeamMember> }) => {
      const member: MockTeamMember = {
        id: mockState.members.length + 1,
        userId: null,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        name: data.name ?? "Unknown",
        email: data.email ?? "unknown@example.com",
        role: data.role ?? "Employee",
        status: data.status ?? "active",
        avatar: data.avatar ?? "TM",
        department: data.department ?? "Operations",
        team: data.team ?? "General",
        teamId: data.teamId ?? null,
        organizationId: data.organizationId ?? null,
        designation: data.designation ?? "Employee",
        manager: data.manager ?? "Manager",
        workingHours: data.workingHours ?? "09:00 - 18:00",
        officeLocation: data.officeLocation ?? "HQ",
        timeZone: data.timeZone ?? "Asia/Calcutta",
        baseSalary: data.baseSalary ?? 0,
        allowances: data.allowances ?? 0,
        deductions: data.deductions ?? 0,
        paymentMode: data.paymentMode ?? "upi",
        warningCount: data.warningCount ?? 0,
        suspendedAt: data.suspendedAt ?? null,
        terminationEligibleAt: data.terminationEligibleAt ?? null,
        handoverCompletedAt: data.handoverCompletedAt ?? null,
        terminatedAt: data.terminatedAt ?? null,
        separationNote: data.separationNote ?? null,
        attendance: data.attendance ?? "present",
        checkIn: data.checkIn ?? "-",
        location: data.location ?? "HQ",
        workload: data.workload ?? 0,
      };
      mockState.members.push(member);
      return member;
    }),
    update: jest.fn(async ({ where, data }: { where: { id: number }; data: Partial<MockTeamMember> }) => {
      const index = mockState.members.findIndex((member) => member.id === where.id);
      if (index === -1) {
        return null;
      }
      const updated = {
        ...mockState.members[index],
        ...data,
        updatedAt: new Date(),
      } as MockTeamMember;
      mockState.members[index] = updated;
      return updated;
    }),
  },
};

const mockAuthService = {
  provisionInvitedUserFromTeamMember: jest.fn(async () => ({
    userId: "user-1",
    invitationSent: true,
    status: "invited" as const,
  })),
};

jest.mock("../config/prisma", () => ({
  prisma: mockPrisma,
}));

jest.mock("../services/auth.service", () => ({
  authService: mockAuthService,
}));

describe("teamMembersService", () => {
  beforeEach(() => {
    mockState.members.length = 0;
    mockPrisma.teamMember.findUnique.mockClear();
    mockPrisma.teamMember.create.mockClear();
    mockPrisma.teamMember.update.mockClear();
    mockAuthService.provisionInvitedUserFromTeamMember.mockClear();
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
    }, {
      userId: "admin-1",
      email: "admin@example.com",
      role: "admin",
      organizationId: "org-1",
    });

    expect(member.team).toBe("Platform Ops");
    expect(member.department).toBe("Operations");
    expect(member.paymentMode).toBe("upi");
    expect(member.workingHours).toBe("09:00 - 18:00");
    expect(mockAuthService.provisionInvitedUserFromTeamMember).toHaveBeenCalledTimes(1);
  });

  it("throws 409 if team member email already exists", async () => {
    mockState.members.push({
      id: 1,
      name: "Existing Member",
      email: "existing@example.com",
      userId: null,
      role: "Employee",
      status: "active",
      avatar: "EM",
      department: "Operations",
      team: "General",
      teamId: null,
      organizationId: "org-1",
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
      }, {
        userId: "admin-1",
        email: "admin@example.com",
        role: "admin",
        organizationId: "org-1",
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
      }, {
        userId: "admin-1",
        email: "admin@example.com",
        role: "admin",
        organizationId: "org-1",
      }),
    ).rejects.toThrow("Department is required");
  });
});
