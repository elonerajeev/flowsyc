import cron from "node-cron";
import { z } from "zod";

export const automationTriggerValues = [
  "lead_created",
  "lead_updated",
  "lead_scored",
  "lead_assigned",
  "lead_score_above",
  "lead_score_below",
  "deal_created",
  "deal_stage_changed",
  "deal_closed",
  "deal_stale",
  "task_created",
  "task_completed",
  "task_overdue",
  "client_created",
  "client_health_changed",
  "client_health_low",
  "churn_risk",
  "cold_lead_detected",
  "followup_due",
  "renewal_due",
  "invoice_created",
  "invoice_overdue",
  "payroll_due",
  "project_stalled",
  "custom_schedule",
  "manual",
] as const;

export const automationActionValues = [
  "send_email",
  "create_task",
  "assign_lead",
  "update_score",
  "recalculate_score",
  "auto_tag",
  "move_deal",
  "create_client",
  "send_notification",
  "tag_entity",
  "remove_tag",
  "update_field",
  "webhook",
  "add_to_campaign",
  "delay",
  "slack_notification",
  "create_followup_sequence",
  "check_health_score",
  "escalate_to_manager",
  "add_to_pipeline",
  "send_sms",
  "create_alert",
  "log_lifecycle_sync",
] as const;

export const automationConditionOperatorValues = [
  "equals",
  "not_equals",
  "contains",
  "greater_than",
  "less_than",
  "gte",
  ">=",
  "lte",
  "<=",
  "is_empty",
  "is_not_empty",
  "in",
  "not_in",
] as const;

export const automationTriggerSchema = z.enum(automationTriggerValues);
export const automationActionSchema = z.enum(automationActionValues);
export const automationRuleStatusSchema = z.enum(["active", "paused", "archived"]);
export const automationConditionOperatorSchema = z.enum(automationConditionOperatorValues);
export const scheduledJobTypeSchema = z.enum(["email", "task", "alert", "webhook", "reminder"]);

const automationConditionSchema = z
  .object({
    field: z.string().trim().min(1).max(120),
    operator: automationConditionOperatorSchema,
    value: z.unknown().optional(),
  })
  .superRefine((condition, ctx) => {
    const needsValue = !["is_empty", "is_not_empty"].includes(condition.operator);
    if (needsValue && condition.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Condition value is required for this operator",
      });
    }
  });

const automationActionConfigSchema = z
  .object({
    type: automationActionSchema,
    config: z.record(z.string(), z.unknown()).optional().default({}),
  })
  .strict();

const cronExpressionSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .refine((value) => cron.validate(value), "Invalid cron expression");

export const createAutomationRuleSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(500).optional(),
    trigger: automationTriggerSchema,
    conditions: z.array(automationConditionSchema).max(25).optional().default([]),
    actions: z.array(automationActionConfigSchema).min(1).max(50),
    cronExpression: cronExpressionSchema.optional(),
    isActive: z.boolean().optional().default(true),
    status: automationRuleStatusSchema.optional().default("active"),
    priority: z.number().int().min(-100).max(100).optional().default(0),
    maxRunsPerDay: z.number().int().positive().max(10000).optional(),
  })
  .superRefine((rule, ctx) => {
    if (rule.trigger === "custom_schedule" && !rule.cronExpression) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cronExpression"],
        message: "Cron expression is required for scheduled automation",
      });
    }

    if (rule.trigger !== "custom_schedule" && rule.cronExpression) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cronExpression"],
        message: "Cron expression can only be used with custom_schedule trigger",
      });
    }
  });

export const updateAutomationRuleSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().max(500).optional().nullable(),
    trigger: automationTriggerSchema.optional(),
    conditions: z.array(automationConditionSchema).max(25).optional(),
    actions: z.array(automationActionConfigSchema).min(1).max(50).optional(),
    cronExpression: z.union([cronExpressionSchema, z.null()]).optional(),
    isActive: z.boolean().optional(),
    status: automationRuleStatusSchema.optional(),
    priority: z.number().int().min(-100).max(100).optional(),
    maxRunsPerDay: z.number().int().positive().max(10000).optional().nullable(),
  })
  .superRefine((rule, ctx) => {
    if (Object.keys(rule).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required",
      });
    }

    if (rule.trigger === "custom_schedule" && rule.cronExpression === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cronExpression"],
        message: "Cron expression is required when switching to custom_schedule trigger",
      });
    }

    if (rule.trigger === "custom_schedule" && rule.cronExpression === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cronExpression"],
        message: "Cron expression cannot be null for scheduled automation",
      });
    }

    if (rule.trigger && rule.trigger !== "custom_schedule" && typeof rule.cronExpression === "string") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cronExpression"],
        message: "Cron expression can only be used with custom_schedule trigger",
      });
    }
  });

export const createScheduledJobSchema = z
  .object({
    jobType: scheduledJobTypeSchema,
    name: z.string().trim().min(1).max(160),
    description: z.string().trim().max(500).optional(),
    scheduledFor: z
      .string()
      .trim()
      .min(1)
      .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid scheduledFor date"),
    cronExpression: z
      .string()
      .trim()
      .min(1)
      .max(120)
      .refine((value) => cron.validate(value), "Invalid cron expression")
      .optional(),
    payload: z.record(z.string(), z.unknown()).optional().default({}),
    isRecurring: z.boolean().optional().default(false),
    entityType: z.string().trim().max(80).optional(),
    entityId: z.number().int().positive().optional(),
  })
  .superRefine((job, ctx) => {
    if (job.isRecurring && !job.cronExpression) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cronExpression"],
        message: "Cron expression is required for recurring scheduled jobs",
      });
    }
  });
