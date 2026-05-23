import { z } from "zod";

export const createServerSchema = z.object({
  name:     z.string().min(1, "Required").max(100),
  ip:       z.string().min(1, "Required").max(255).refine(
    (v) => /^(\d{1,3}\.){3}\d{1,3}$/.test(v) || /^[a-zA-Z0-9._-]+$/.test(v),
    "Must be a valid IP address or hostname"
  ),
  port:     z.coerce.number().int().min(1).max(65535).default(22),
  provider: z.string().max(100).optional(),
  region:   z.string().max(100).optional(),
  tags:     z.array(z.string().max(50)).max(10).default([]),
});

export const updateServerSchema = createServerSchema.partial().extend({
  isActive: z.boolean().optional(),
});
