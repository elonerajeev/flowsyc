import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export const projectQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["active", "pending", "completed", "in-progress"]).optional(),
});

export const taskQuerySchema = paginationQuerySchema.extend({
  column: z.enum(["todo", "in-progress", "done"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  projectId: z.coerce.number().int().positive().optional(),
});

export const taskPaginatedQuerySchema = paginationQuerySchema.extend({
  column: z.enum(["todo", "in-progress", "done"]),
  priority: z.enum(["high", "medium", "low"]).optional(),
  projectId: z.coerce.number().int().positive().optional(),
});

export const taskStatsQuerySchema = z.object({
  priority: z.enum(["high", "medium", "low"]).optional(),
  projectId: z.coerce.number().int().positive().optional(),
});

export const teamMemberQuerySchema = paginationQuerySchema.extend({
  role: z.enum(["Admin", "Manager", "Employee"]).optional(),
  status: z.enum(["active", "pending", "completed"]).optional(),
  department: z.string().trim().optional(),
});

export const invoiceQuerySchema = paginationQuerySchema.extend({
  status: z.enum(["active", "pending", "completed"]).optional(),
});
