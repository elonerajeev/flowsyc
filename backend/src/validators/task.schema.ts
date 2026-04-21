import { z } from "zod";

export const taskPrioritySchema = z.enum(["high", "medium", "low"]);
export const taskColumnSchema = z.enum(["todo", "in-progress", "done"]);
export const taskValueStreamSchema = z.enum(["Growth", "Product", "Support"]);

export const createTaskSchema = z.object({
  title: z.string().min(1).max(160),
  assignee: z.string().min(1).max(160),
  priority: taskPrioritySchema,
  dueDate: z.string().max(32).optional().default(""),
  tags: z.array(z.string().min(1).max(40)).optional(),
  valueStream: taskValueStreamSchema.optional(),
  column: taskColumnSchema.optional(),
  projectId: z.number().int().positive().nullable().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();
