import { Prisma, type PayrollStatus } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { getEmployeeMemberRecord, type AccessActor } from "../utils/access-control";

export const payrollService = {
  async list(access: AccessActor, period?: string) {
    const where: any = { deletedAt: null };

    if (period) {
      where.period = period;
    }

    if (access?.role === "employee") {
      const member = await getEmployeeMemberRecord(access);
      if (!member) {
        throw new AppError("Employee record not found", 404, "NOT_FOUND");
      }
      where.memberId = String(member.id);
    }

    const records = await prisma.payroll.findMany({
      where,
      orderBy: [{ period: "desc" }, { memberName: "asc" }],
    });

    return records.map((r: any) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      paidAt: r.paidAt?.toISOString() ?? null,
    }));
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