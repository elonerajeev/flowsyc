import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";

type AttendanceRecord = {
  id: number;
  name: string;
  role: "Admin" | "Manager" | "Employee";
  department: string;
  status: "present" | "late" | "remote" | "absent";
  checkIn: string;
  location: string;
  note: string;
};

export const attendanceService = {
  async list() {
    const members = await prisma.teamMember.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });

    const data: AttendanceRecord[] = members.map((member) => ({
      id: member.id,
      name: member.name,
      role: member.role,
      department: member.department,
      status: member.attendance as AttendanceRecord["status"],
      checkIn: member.checkIn,
      location: member.location,
      note:
        member.attendance === "absent"
          ? "Needs follow-up"
          : member.attendance === "late"
            ? "Late check-in"
            : member.attendance === "remote"
              ? "Remote today"
              : "On time",
    }));

    return { data };
  },

  async update(memberId: number, data: { status: AttendanceRecord["status"]; checkIn: string; location: string }, userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const member = await prisma.teamMember.findUnique({ where: { id: memberId } });
    
    if (!member) {
      throw new AppError("Member not found", 404, "NOT_FOUND");
    }

    // Allow only if user is admin/manager or updating their own record
    if (user?.role !== "admin" && user?.role !== "manager" && member.email !== user?.email) {
      throw new AppError("Unauthorized", 403, "FORBIDDEN");
    }

    // Allow only if user is admin/manager or updating their own record
    if (user?.role !== "admin" && user?.role !== "manager" && member.email !== user?.email) {
      throw new AppError("Unauthorized", 403, "FORBIDDEN");
    }

    const updated = await prisma.teamMember.update({
      where: { id: memberId },
      data: {
        attendance: data.status,
        checkIn: data.checkIn,
        location: data.location,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      role: updated.role,
      department: updated.department,
      status: updated.attendance as AttendanceRecord["status"],
      checkIn: updated.checkIn,
      location: updated.location,
      note:
        updated.attendance === "absent"
          ? "Needs follow-up"
          : updated.attendance === "late"
            ? "Late check-in"
            : updated.attendance === "remote"
              ? "Remote today"
              : "On time",
    };
  },
};
