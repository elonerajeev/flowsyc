import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { AccessActor } from "../utils/access-control";
import { ensureOrgTeamMembers } from "./team-members.service";

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
  async list(actor?: AccessActor) {
    const orgAdminId =
      actor?.role === "admin" || actor?.role === "manager"
        ? await ensureOrgTeamMembers(actor)
        : null;

    const members = await prisma.teamMember.findMany({
      where: {
        deletedAt: null,
        // Admin: global visibility. Manager: only owned members. Employee: self only.
        ...(actor?.role === "admin" || actor?.role === "manager"
          ? { adminId: orgAdminId ?? "__none__" }
          : actor?.role === "employee"
            ? { email: { equals: actor.email, mode: "insensitive" } }
            : {}),
      },
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
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, role: true, adminId: true } });
    const member = await prisma.teamMember.findUnique({ where: { id: memberId }, select: { id: true, name: true, role: true, department: true, attendance: true, checkIn: true, location: true, email: true, adminId: true } });
    
    if (!member) {
      throw new AppError("Member not found", 404, "NOT_FOUND");
    }

    const actorOrgAdminId =
      user?.role === "admin"
        ? user.id
        : user?.role === "manager"
          ? user.adminId ?? user.id
          : null;

    const isAllowedManagerOrAdmin =
      (user?.role === "admin" || user?.role === "manager") &&
      Boolean(actorOrgAdminId) &&
      member.adminId === actorOrgAdminId;

    const isAllowedSelf = user?.role === "employee" && member.email === user.email;

    if (!isAllowedManagerOrAdmin && !isAllowedSelf) {
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
