import { Prisma, type PayrollStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { getEmployeeMemberRecord, type AccessActor } from "../utils/access-control";
import { fromDbPaymentMode } from "../utils/payment-mode";

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

    if (period) {
      where.period = period;
    }

    if (access?.role === "employee") {
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
        memberName: record.memberName,
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

    const members = await prisma.teamMember.findMany({
      where: { deletedAt: null, status: "active" },
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
            period,
            baseSalary: member.baseSalary,
            allowances: member.allowances,
            deductions: member.deductions,
            netPay,
            status: "pending" as PayrollStatus,
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

    const updated = await prisma.payroll.update({
      where: { id },
      data: {
        status: "paid" as PayrollStatus,
        paidAt: new Date(),
      },
    });

    return updated;
  },

  async updateStatus(id: number, status: string, access: AccessActor) {
    if (access?.role !== "admin" && access?.role !== "manager") {
      throw new AppError("Access denied", 403, "FORBIDDEN");
    }

    const updated = await prisma.payroll.update({
      where: { id },
      data: { status: status as PayrollStatus },
    });

    return updated;
  },
};
