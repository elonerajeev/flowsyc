import { z } from "zod";

const authConfigSchema = z.record(z.string().trim().min(1).max(100), z.string().trim().max(600));

export const createLogSourceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  provider: z.string().trim().min(1).max(80).default("generic"),
  environment: z.string().trim().min(1).max(50).default("production"),
  endpoint: z.string().trim().url().optional(),
  authType: z.enum(["api_key", "bearer", "custom_header"]).default("api_key"),
  authConfig: authConfigSchema.optional(),
  isActive: z.boolean().default(true),
}).superRefine((value, ctx) => {
  // For header-based auth on non-CloudWatch sources, headerName is required
  if ((value.authType === "api_key" || value.authType === "custom_header") && value.provider !== "aws-cloudwatch") {
    const headerName = value.authConfig?.headerName?.trim();
    if (!headerName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authConfig", "headerName"],
        message: "authConfig.headerName is required for header-based auth",
      });
    }
  }

  if (value.provider === "aws-cloudwatch") {
    const region = value.authConfig?.region?.trim();
    const roleArn = value.authConfig?.roleArn?.trim();
    const logGroupName = value.authConfig?.logGroupName?.trim();

    if (!region) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authConfig", "region"],
        message: "authConfig.region is required for AWS CloudWatch",
      });
    }
    if (!roleArn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authConfig", "roleArn"],
        message: "authConfig.roleArn is required for AWS CloudWatch",
      });
    }
    if (!logGroupName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["authConfig", "logGroupName"],
        message: "authConfig.logGroupName is required for AWS CloudWatch",
      });
    }
  }
});

export const updateLogSourceSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  provider: z.string().trim().min(1).max(80).optional(),
  environment: z.string().trim().min(1).max(50).optional(),
  endpoint: z.string().trim().url().optional(),
  authType: z.enum(["api_key", "bearer", "custom_header"]).optional(),
  authConfig: authConfigSchema.optional(),
  isActive: z.boolean().optional(),
});

export const listLogSourceLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(20).max(1000).default(300),
});

export const ingestLogsSchema = z.object({
  entries: z
    .array(
      z.object({
        level: z.string().trim().min(1).max(20).default("info"),
        message: z.string().trim().min(1).max(4000),
        timestamp: z.string().datetime().optional(),
      }),
    )
    .min(1)
    .max(200),
});
