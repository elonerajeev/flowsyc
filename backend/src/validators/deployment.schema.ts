import { z } from "zod";

export const createDeploymentSchema = z.object({
  service:       z.string().min(1).max(100),
  environment:   z.string().min(1).max(50),
  status:        z.enum(["success", "failed", "running", "cancelled"]).default("running"),
  commitHash:    z.string().max(40).optional(),
  commitMessage: z.string().max(500).optional(),
  branch:        z.string().max(100).optional(),
  deployedBy:    z.string().max(100).optional(),
  version:       z.string().max(50).optional(),
  notes:         z.string().max(1000).optional(),
  startedAt:     z.string().datetime().optional(),
  finishedAt:    z.string().datetime().optional(),
});

export const updateDeploymentSchema = z.object({
  status:     z.enum(["success", "failed", "running", "cancelled"]),
  finishedAt: z.string().datetime().optional(),
  notes:      z.string().max(1000).optional(),
});

export const listDeploymentsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
