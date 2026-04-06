import { Prisma, type PaymentMode } from "@prisma/client";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { fromDbPaymentMode, toDbPaymentMode } from "../utils/payment-mode";
import { logger } from "../utils/logger";

type TeamMemberRecord = {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Employee";
  status: "active" | "pending" | "completed";
  avatar: string;
  department: string;
  team: string;
  teamId: number | null;
  designation: string;
  manager: string;
  workingHours: string;
  officeLocation: string;
  timeZone: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  paymentMode: "bank-transfer" | "cash" | "upi";
  warningCount?: number;
  suspendedAt?: string | null;
  terminationEligibleAt?: string | null;
  handoverCompletedAt?: string | null;
  terminatedAt?: string | null;
  separationNote?: string;
  attendance: "present" | "late" | "remote" | "absent";
  checkIn: string;
  location: string;
  workload: number;
};

type TeamMemberCreateInput = {
  name: string;
  email: string;
  role: TeamMemberRecord["role"];
  status?: TeamMemberRecord["status"];
  avatar?: string;
  department?: string;
  team?: string;
  teamId?: number | null;
  designation?: string;
  manager?: string;
  workingHours?: string;
  officeLocation?: string;
  timeZone?: string;
  baseSalary?: number;
  allowances?: number;
  deductions?: number;
  paymentMode?: TeamMemberRecord["paymentMode"];
  warningCount?: number;
  suspendedAt?: string | null;
  terminationEligibleAt?: string | null;
  handoverCompletedAt?: string | null;
  terminatedAt?: string | null;
  separationNote?: string;
  attendance?: TeamMemberRecord["attendance"];
  checkIn?: string;
  location?: string;
  workload?: number;
};

type TeamMemberUpdateInput = Partial<TeamMemberCreateInput>;

type TeamMemberQuery = {
  page: number;
  limit: number;
  role?: TeamMemberRecord["role"];
  status?: TeamMemberRecord["status"];
  department?: string;
};

const teamMemberSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  avatar: true,
  department: true,
  team: true,
  designation: true,
  manager: true,
  workingHours: true,
  officeLocation: true,
  timeZone: true,
  baseSalary: true,
  allowances: true,
  deductions: true,
  paymentMode: true,
  warningCount: true,
  suspendedAt: true,
  terminationEligibleAt: true,
  handoverCompletedAt: true,
  terminatedAt: true,
  separationNote: true,
  attendance: true,
  checkIn: true,
  location: true,
  workload: true,
  deletedAt: true,
} as const;

function mapMember(member: {
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
  paymentMode: PaymentMode;
  warningCount: number;
  suspendedAt: Date | null;
  terminationEligibleAt: Date | null;
  handoverCompletedAt: Date | null;
  terminatedAt: Date | null;
  separationNote: string | null;
  attendance: string;
  checkIn: string;
  location: string;
  workload: number;
  deletedAt: Date | null;
}): TeamMemberRecord {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    status: member.status,
    avatar: member.avatar,
    department: member.department,
    team: member.team,
    teamId: null,
    designation: member.designation,
    manager: member.manager,
    workingHours: member.workingHours,
    officeLocation: member.officeLocation,
    timeZone: member.timeZone,
    baseSalary: member.baseSalary,
    allowances: member.allowances,
    deductions: member.deductions,
    paymentMode: fromDbPaymentMode(member.paymentMode),
    warningCount: member.warningCount,
    suspendedAt: member.suspendedAt?.toISOString() ?? null,
    terminationEligibleAt: member.terminationEligibleAt?.toISOString() ?? null,
    handoverCompletedAt: member.handoverCompletedAt?.toISOString() ?? null,
    terminatedAt: member.terminatedAt?.toISOString() ?? null,
    separationNote: member.separationNote ?? "",
    attendance: member.attendance as TeamMemberRecord["attendance"],
    checkIn: member.checkIn,
    location: member.location,
    workload: member.workload,
  };
}

function isEmailUniqueConstraintError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes("email");
  }
  if (typeof target === "string") {
    return target.includes("email");
  }
  return false;
}

export const teamMembersService = {
  async getById(memberId: number) {
    const member = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: teamMemberSelect,
    });
    if (!member || member.deletedAt) {
      throw new AppError("Team member not found", 404, "NOT_FOUND");
    }
    return mapMember(member);
  },

  async list(query: TeamMemberQuery) {
    const where: Prisma.TeamMemberWhereInput = {
      deletedAt: null,
      ...(query.role ? { role: query.role } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.department ? { department: { contains: query.department, mode: "insensitive" } } : {}),
    };

    const [total, members, taskCounts, projects] = await prisma.$transaction([
      prisma.teamMember.count({ where }),
      prisma.teamMember.findMany({
        where,
        select: teamMemberSelect,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.task.groupBy({
        by: ["assignee"],
        where: { deletedAt: null, column: { not: "done" } },
        orderBy: { assignee: "asc" },
        _count: { assignee: true },
      }),
      prisma.project.findMany({ where: { deletedAt: null, status: { in: ["active", "in_progress"] } }, select: { team: true } }),
    ]);

    // Build task count map by assignee name
    const groupedTaskCounts = taskCounts as Array<{ assignee: string; _count: { assignee: number | null } }>;
    const taskMap = new Map(groupedTaskCounts.map((taskCount) => [taskCount.assignee.toLowerCase(), taskCount._count.assignee ?? 0]));

    // Build project count map by avatar/initials
    const projectMap = new Map<string, number>();
    for (const project of projects) {
      for (const initials of project.team) {
        projectMap.set(initials.toLowerCase(), (projectMap.get(initials.toLowerCase()) ?? 0) + 1);
      }
    }

    // Calculate dynamic workload: tasks (weight 15%) + projects (weight 20%) + base role weight
    const membersWithWorkload = members.map(member => {
      const taskCount = taskMap.get(member.name.toLowerCase()) ?? 0;
      const projectCount = projectMap.get(member.avatar.toLowerCase()) ?? 0;
      const roleBase = member.role === "Admin" ? 30 : member.role === "Manager" ? 25 : 20;
      const attendancePenalty = member.attendance === "absent" ? -20 : member.attendance === "late" ? -5 : 0;
      const rawWorkload = roleBase + (taskCount * 15) + (projectCount * 20) + attendancePenalty;
      const workload = Math.min(100, Math.max(0, rawWorkload));

      return { ...member, workload };
    });

    // Persist updated workloads back to DB (fire and forget)
    Promise.allSettled(membersWithWorkload.map(m =>
      prisma.teamMember.update({
        where: { id: m.id },
        data: { workload: m.workload },
        select: { id: true },
      })
    )).then(results => {
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      if (failures.length > 0) {
        logger.warn("Some workload updates failed", { failures: failures.map(f => f.reason) });
      }
    });

    return {
      data: membersWithWorkload.map(mapMember),
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.max(1, Math.ceil(total / query.limit)) },
    };
  },

  async create(input: TeamMemberCreateInput) {
    const name = input.name.trim();
    const existing = await prisma.teamMember.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new AppError("Team member email already exists", 409, "CONFLICT");
    }

    const requireString = (value: string | undefined, label: string) => {
      const trimmed = value?.trim();
      if (!trimmed) {
        throw new AppError(`${label} is required`, 400, "BAD_REQUEST");
      }
      return trimmed;
    };

    const teamName = requireString(input.team, "Team");
    const department = requireString(input.department, "Department");
    const designation = requireString(input.designation, "Designation");
    const manager = requireString(input.manager, "Manager");
    const workingHours = requireString(input.workingHours, "Working hours");
    const officeLocation = requireString(input.officeLocation, "Office location");
    const timeZone = requireString(input.timeZone, "Time zone");
    const checkIn = requireString(input.checkIn, "Check-in");
    const location = requireString(input.location, "Location");
    const paymentMode = input.paymentMode;
    const attendance = input.attendance;
    const baseSalary = input.baseSalary;
    const allowances = input.allowances;
    const deductions = input.deductions;

    if (paymentMode === undefined) {
      throw new AppError("Payment mode is required", 400, "BAD_REQUEST");
    }
    if (attendance === undefined) {
      throw new AppError("Attendance is required", 400, "BAD_REQUEST");
    }
    if (baseSalary === undefined || allowances === undefined || deductions === undefined) {
      throw new AppError("Compensation fields are required", 400, "BAD_REQUEST");
    }

    try {
      const member = await prisma.teamMember.create({
        data: {
          name,
          email: input.email,
          role: input.role,
          status: input.status ?? "active",
          avatar: input.avatar ?? name.slice(0, 2).toUpperCase(),
          department,
          team: teamName,
          designation,
          manager,
          workingHours,
          officeLocation,
          timeZone,
          baseSalary,
          allowances,
          deductions,
          paymentMode: toDbPaymentMode(paymentMode),
          warningCount: input.warningCount ?? 0,
          suspendedAt: input.suspendedAt ? new Date(input.suspendedAt) : null,
          terminationEligibleAt: input.terminationEligibleAt ? new Date(input.terminationEligibleAt) : null,
          handoverCompletedAt: input.handoverCompletedAt ? new Date(input.handoverCompletedAt) : null,
          terminatedAt: input.terminatedAt ? new Date(input.terminatedAt) : null,
          separationNote: input.separationNote ?? null,
          attendance,
          checkIn,
          location,
          workload: input.workload ?? 0,
          updatedAt: new Date(),
        },
        select: teamMemberSelect,
      });
      return mapMember(member);
    } catch (error) {
      if (isEmailUniqueConstraintError(error)) {
        throw new AppError("Team member email already exists", 409, "CONFLICT");
      }
      throw error;
    }
  },

  async update(memberId: number, patch: TeamMemberUpdateInput) {
    const existing = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        deletedAt: true,
      },
    });
    if (!existing || existing.deletedAt) {
      throw new AppError("Team member not found", 404, "NOT_FOUND");
    }
    if (patch.email !== undefined && patch.email !== existing.email) {
      const emailOwner = await prisma.teamMember.findUnique({ where: { email: patch.email } });
      if (emailOwner && emailOwner.id !== existing.id) {
        throw new AppError("Team member email already exists", 409, "CONFLICT");
      }
    }

    try {
      const member = await prisma.teamMember.update({
        where: { id: memberId },
        data: {
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.email !== undefined ? { email: patch.email } : {}),
          ...(patch.role !== undefined ? { role: patch.role } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
          ...(patch.department !== undefined ? { department: patch.department } : {}),
          ...(patch.team !== undefined ? { team: patch.team.trim() || "General" } : {}),
          ...(patch.designation !== undefined ? { designation: patch.designation } : {}),
          ...(patch.manager !== undefined ? { manager: patch.manager } : {}),
          ...(patch.workingHours !== undefined ? { workingHours: patch.workingHours } : {}),
          ...(patch.officeLocation !== undefined ? { officeLocation: patch.officeLocation } : {}),
          ...(patch.timeZone !== undefined ? { timeZone: patch.timeZone } : {}),
          ...(patch.baseSalary !== undefined ? { baseSalary: patch.baseSalary } : {}),
          ...(patch.allowances !== undefined ? { allowances: patch.allowances } : {}),
          ...(patch.deductions !== undefined ? { deductions: patch.deductions } : {}),
          ...(patch.paymentMode !== undefined ? { paymentMode: toDbPaymentMode(patch.paymentMode) } : {}),
          ...(patch.warningCount !== undefined ? { warningCount: patch.warningCount } : {}),
          ...(patch.suspendedAt !== undefined ? { suspendedAt: patch.suspendedAt ? new Date(patch.suspendedAt) : null } : {}),
          ...(patch.terminationEligibleAt !== undefined ? { terminationEligibleAt: patch.terminationEligibleAt ? new Date(patch.terminationEligibleAt) : null } : {}),
          ...(patch.handoverCompletedAt !== undefined ? { handoverCompletedAt: patch.handoverCompletedAt ? new Date(patch.handoverCompletedAt) : null } : {}),
          ...(patch.terminatedAt !== undefined ? { terminatedAt: patch.terminatedAt ? new Date(patch.terminatedAt) : null } : {}),
          ...(patch.separationNote !== undefined ? { separationNote: patch.separationNote } : {}),
          ...(patch.attendance !== undefined ? { attendance: patch.attendance } : {}),
          ...(patch.checkIn !== undefined ? { checkIn: patch.checkIn } : {}),
          ...(patch.location !== undefined ? { location: patch.location } : {}),
          ...(patch.workload !== undefined ? { workload: patch.workload } : {}),
        },
        select: teamMemberSelect,
      });

      return mapMember(member);
    } catch (error) {
      if (isEmailUniqueConstraintError(error)) {
        throw new AppError("Team member email already exists", 409, "CONFLICT");
      }
      throw error;
    }
  },

  async delete(memberId: number) {
    const existing = await prisma.teamMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        deletedAt: true,
      },
    });
    if (!existing || existing.deletedAt) {
      throw new AppError("Team member not found", 404, "NOT_FOUND");
    }

    await prisma.teamMember.update({
      where: { id: memberId },
      data: { deletedAt: new Date() },
    });
  },
};
