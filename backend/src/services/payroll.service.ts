import { Prisma, type PayrollStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { getEmployeeMemberRecord, type AccessActor } from "../utils/access-control";
import { fromDbPaymentMode } from "../utils/payment-mode";
import { sendSalaryPaidEmail } from "../utils/email-templates";
import { logAudit } from "../utils/audit";
import { ensureOrgTeamMembers, resolveOrgAdminId } from "./team-members.service";

function derivePayrollDueDate(period: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const dueDate = new Date(year, monthIndex + 1, 5);

  return dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export const payrollService = {
  async list(access: AccessActor, period?: string) {
    const where: any = { deletedAt: null };
    let fallbackUserProfile:
      | {
          id: string;
          name: string;
          paymentMode: "bank_transfer" | "cash" | "upi";
          payrollDueDate: string;
        }
      | null = null;
    let orgAdminId: string | null = null;

    if (period) {
      where.period = period;
    }

    // Admin/Manager: organization-scoped visibility based on owner adminId.
    if (access?.role === "admin" || access?.role === "manager") {
      orgAdminId = await ensureOrgTeamMembers(access);
      const teamMembers = await prisma.teamMember.findMany({
        where: {
          deletedAt: null,
          adminId: orgAdminId ?? "__none__",
        },
        select: {
          id: true,
          name: true,
          department: true,
          baseSalary: true,
          allowances: true,
          deductions: true,
          paymentMode: true,
        },
      });
      const memberIds = teamMembers.map((member) => String(member.id));

      if (memberIds.length === 0) {
        // No visible team members -> no payroll rows should be visible.
        where.memberId = "__none__";
      } else {
        where.memberId = { in: memberIds };

        // Ensure payroll exists for the requested period (or current month when period is not passed).
        const targetPeriod = period ?? getCurrentPeriod();
        const existing = await prisma.payroll.findMany({
          where: {
            deletedAt: null,
            period: targetPeriod,
            memberId: { in: memberIds },
          },
          select: { memberId: true },
        });
        const existingIds = new Set(existing.map((record) => String(record.memberId)));
        const missingMembers = teamMembers.filter((member) => !existingIds.has(String(member.id)));

        if (missingMembers.length > 0) {
          await prisma.payroll.createMany({
            data: missingMembers.map((member) => ({
              memberId: String(member.id),
              memberName: member.name,
              department: member.department,
              period: targetPeriod,
              baseSalary: member.baseSalary,
              allowances: member.allowances,
              deductions: member.deductions,
              netPay: member.baseSalary + member.allowances - member.deductions,
              status: "pending",
              paymentMode: member.paymentMode,
            })),
          });
        }
      }
    } else if (access?.role === "employee") {
      const member = await getEmployeeMemberRecord(access);
      if (member) {
        where.memberId = String(member.id);
      } else if (access.userId) {
        fallbackUserProfile = await prisma.user.findUnique({
          where: { id: access.userId },
          select: { id: true, name: true, paymentMode: true, payrollDueDate: true },
        });
        if (fallbackUserProfile?.name) {
          where.memberName = { equals: fallbackUserProfile.name, mode: "insensitive" };
        }
      }
    }

    const records = await prisma.payroll.findMany({
      where,
      orderBy: [{ period: "desc" }, { memberName: "asc" }],
    });

    const memberIds = Array.from(
      new Set(
        records
          .map((record) => Number(record.memberId))
          .filter((memberId) => Number.isInteger(memberId) && memberId > 0),
      ),
    );

    const members = memberIds.length > 0
      ? await prisma.teamMember.findMany({
          where: { id: { in: memberIds }, deletedAt: null },
          select: {
            id: true,
            name: true,
            designation: true,
            team: true,
            avatar: true,
            paymentMode: true,
          },
        })
      : [];
    const memberMap = new Map(members.map((member) => [String(member.id), member]));

    return records.map((record: any) => {
      const member = memberMap.get(String(record.memberId));
      const paymentMode = member
        ? fromDbPaymentMode(member.paymentMode)
        : fallbackUserProfile
          ? fromDbPaymentMode(fallbackUserProfile.paymentMode)
          : "bank-transfer";

      return {
        id: record.id,
        memberId: String(record.memberId),
        memberName: member?.name ?? record.memberName,
        period: record.period,
        baseSalary: record.baseSalary,
        allowances: record.allowances,
        deductions: record.deductions,
        netPay: record.netPay,
        status: record.status,
        paymentMode,
        dueDate: fallbackUserProfile?.payrollDueDate || derivePayrollDueDate(record.period),
        paidAt: record.paidAt?.toISOString() ?? null,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
        member: member
          ? {
              designation: member.designation,
              team: member.team,
              avatar: member.avatar,
            }
          : null,
      };
    });
  },

  async generate(period: string, access: AccessActor) {
    if (access?.role !== "admin" && access?.role !== "manager") {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    const orgAdminId = await ensureOrgTeamMembers(access);
    const members = await prisma.teamMember.findMany({
      where: {
        deletedAt: null,
        status: "active",
        adminId: orgAdminId ?? "__none__",
      },
    });

    const results = [];
    for (const member of members) {
      const existing = await prisma.payroll.findFirst({
        where: {
          memberId: String(member.id),
          period,
          deletedAt: null,
        },
      });

      if (!existing) {
        const netPay = member.baseSalary + member.allowances - member.deductions;
        const created = await prisma.payroll.create({
          data: {
            memberId: String(member.id),
            memberName: member.name,
            department: member.department,
            period,
            baseSalary: member.baseSalary,
            allowances: member.allowances,
            deductions: member.deductions,
            netPay,
            status: "pending" as PayrollStatus,
            paymentMode: member.paymentMode,
          },
        });
        results.push(created);
      } else {
        results.push(existing);
      }
    }

    return results;
  },

  async markPaid(id: number, access: AccessActor) {
    if (access?.role !== "admin" && access?.role !== "manager") {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    const orgAdminId = await resolveOrgAdminId(access);
    const payroll = await prisma.payroll.findUnique({ where: { id } });
    if (!payroll) {
      throw new AppError("Payroll record not found", 404, "NOT_FOUND");
    }

    const teamMember = await prisma.teamMember.findUnique({
      where: { id: Number(payroll.memberId) },
      select: { name: true, email: true, adminId: true },
    });
    if (!teamMember) {
      throw new AppError("Team member not found", 404, "NOT_FOUND");
    }
    if (!orgAdminId || teamMember.adminId !== orgAdminId) {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        status: "paid" as PayrollStatus,
        paidAt: new Date(),
      },
    });

    // Send salary paid email with invoice details
    sendSalaryPaidEmail({
      name: teamMember.name,
      email: teamMember.email,
      period: payroll.period as string,
      baseSalary: payroll.baseSalary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      netPay: payroll.netPay,
      paidAt: updated.paidAt!,
    }).catch(() => {});

    await logAudit({
      userId: access.userId as string,
      action: "update",
      entity: "Payroll",
      entityId: id,
      detail: `Marked salary as paid for ${teamMember.name} (${payroll.period})`,
    });

    return updated;
  },

  async updateStatus(id: number, status: string, access: AccessActor) {
    if (access?.role !== "admin" && access?.role !== "manager") {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    const orgAdminId = await resolveOrgAdminId(access);
    const payroll = await prisma.payroll.findUnique({ where: { id } });
    if (!payroll) {
      throw new AppError("Payroll record not found", 404, "NOT_FOUND");
    }
    const teamMember = await prisma.teamMember.findUnique({
      where: { id: Number(payroll.memberId) },
      select: { adminId: true },
    });
    if (!teamMember || !orgAdminId || teamMember.adminId !== orgAdminId) {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    const updated = await prisma.payroll.update({
      where: { id },
      data: { status: status as PayrollStatus },
    });

    return updated;
  },
};
