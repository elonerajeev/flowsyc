import { z } from "zod";

import { clientStatusSchema } from "./client.schema";

export const teamMemberRoleSchema = z.enum(["Admin", "Manager", "Employee"]);
export const teamMemberPaymentModeSchema = z.enum(["bank-transfer", "cash", "upi"]);
export const attendanceStatusSchema = z.enum(["present", "late", "remote", "absent"]);

const teamMemberBase = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email(),
  role: teamMemberRoleSchema,
  status: clientStatusSchema.optional(),
  avatar: z.string().min(1).max(10).optional(),
  department: z.string().min(1).max(120),
  team: z.string().min(1).max(120),
  designation: z.string().min(1).max(160),
  manager: z.string().min(1).max(160),
  workingHours: z.string().min(1).max(80),
  officeLocation: z.string().min(1).max(160),
  timeZone: z.string().min(1).max(80),
  baseSalary: z.coerce.number().int().min(0),
  allowances: z.coerce.number().int().min(0),
  deductions: z.coerce.number().int().min(0),
  paymentMode: teamMemberPaymentModeSchema,
  warningCount: z.coerce.number().int().min(0).optional(),
  suspendedAt: z.string().datetime().nullable().optional(),
  terminationEligibleAt: z.string().datetime().nullable().optional(),
  handoverCompletedAt: z.string().datetime().nullable().optional(),
  terminatedAt: z.string().datetime().nullable().optional(),
  separationNote: z.string().max(500).optional(),
  attendance: attendanceStatusSchema,
  checkIn: z.string().min(1).max(32),
  location: z.string().min(1).max(160),
  workload: z.coerce.number().int().min(0).max(100).optional(),
});

export const createTeamMemberSchema = teamMemberBase.extend({
  role: teamMemberRoleSchema,
});

export const updateTeamMemberSchema = teamMemberBase.partial();
