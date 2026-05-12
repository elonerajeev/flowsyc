import { z } from "zod";

export const createAlertSchema = z.object({
  title:       z.string().min(1).max(200),
  service:     z.string().min(1).max(100),
  severity:    z.enum(["critical", "warning", "info"]).default("warning"),
  description: z.string().max(1000).optional(),
});
