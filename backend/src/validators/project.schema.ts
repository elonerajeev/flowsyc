import { z } from "zod";

export const projectStatusSchema = z.enum(["active", "pending", "completed", "in-progress"]);
export const projectStageSchema = z.enum(["Discovery", "Build", "Review", "Launch"]);

export const createProjectSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
  status: projectStatusSchema.optional(),
  team: z.array(z.string().min(1).max(100)).optional(),
  dueDate: z.string().min(1).max(32).optional(),
  stage: projectStageSchema.optional(),
  budget: z.string().min(1).max(80).optional(),
  tasksDone: z.coerce.number().int().min(0).optional(),
  tasksTotal: z.coerce.number().int().min(0).optional(),
});

export const updateProjectSchema = createProjectSchema.partial();
