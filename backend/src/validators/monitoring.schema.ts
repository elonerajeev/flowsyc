import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().min(1).max(500),
  checkType: z.enum(["http", "tcp", "ping"]).default("http"),
  intervalSecs: z.coerce.number().int().min(10).max(3600).default(30),
  timeoutMs: z.coerce.number().int().min(500).max(30000).default(5000),
  expectedStatus: z.coerce.number().int().min(100).max(599).default(200),
  tags: z.array(z.string().max(50)).max(10).default([]),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});
