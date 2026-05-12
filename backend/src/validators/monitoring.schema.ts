import { z } from "zod";

// Validate URL based on check type
function validateUrl(url: string, checkType: string): boolean {
  if (checkType === "http") {
    try {
      const u = new URL(url);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch { return false; }
  }
  if (checkType === "tcp") {
    // host:port or tcp://host:port
    const clean = url.replace(/^tcp:\/\//, "");
    const parts = clean.split(":");
    if (parts.length !== 2) return false;
    const port = parseInt(parts[1]);
    return parts[0].length > 0 && !isNaN(port) && port > 0 && port <= 65535;
  }
  if (checkType === "ping") {
    // hostname or IP — no protocol, no path
    return /^[a-zA-Z0-9._-]+$/.test(url);
  }
  return false;
}

const urlWithCheckType = z
  .object({
    url: z.string().min(1).max(500),
    checkType: z.enum(["http", "tcp", "ping"]).default("http"),
  })
  .superRefine(({ url, checkType }, ctx) => {
    if (!validateUrl(url, checkType)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message:
          checkType === "http"
            ? "Must be a valid http:// or https:// URL"
            : checkType === "tcp"
            ? "Must be host:port (e.g. localhost:5432)"
            : "Must be a valid hostname or IP (e.g. 8.8.8.8)",
      });
    }
  });

export const createServiceSchema = urlWithCheckType.and(
  z.object({
    name:           z.string().min(1, "Name is required").max(100),
    intervalSecs:   z.coerce.number().int().min(10).max(3600).default(30),
    timeoutMs:      z.coerce.number().int().min(500).max(30000).default(5000),
    expectedStatus: z.coerce.number().int().min(100).max(599).default(200),
    tags:           z.array(z.string().max(50)).max(10).default([]),
  }),
);

export const updateServiceSchema = z.object({
  name:           z.string().min(1).max(100).optional(),
  url:            z.string().min(1).max(500).optional(),
  checkType:      z.enum(["http", "tcp", "ping"]).optional(),
  intervalSecs:   z.coerce.number().int().min(10).max(3600).optional(),
  timeoutMs:      z.coerce.number().int().min(500).max(30000).optional(),
  expectedStatus: z.coerce.number().int().min(100).max(599).optional(),
  tags:           z.array(z.string().max(50)).max(10).optional(),
  isActive:       z.boolean().optional(),
});
