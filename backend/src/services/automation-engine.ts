import { prisma } from "../config/prisma";
import { AutomationTrigger as PrismaAutomationTrigger, Prisma } from "@prisma/client";
import { sendMail } from "../utils/mailer";
import { logger } from "../utils/logger";
import cron, { ScheduledTask } from "node-cron";
import { GTMAutomationService } from "./gtm-automation.service";
import { gtmLifecycleService } from "./gtm-lifecycle.service";

function buildTaskAvatar(title: string): string {
  const initials = title
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return initials || "TS";
}

// Types for automation
type TriggerType = PrismaAutomationTrigger;

type ActionType = 
  | "send_email"
  | "create_task"
  | "assign_lead"
  | "update_score"
  | "recalculate_score"
  | "auto_tag"
  | "move_deal"
  | "create_client"
  | "send_notification"
  | "tag_entity"
  | "remove_tag"
  | "update_field"
  | "webhook"
  | "add_to_campaign"
  | "delay"
  | "slack_notification"
  | "create_followup_sequence"
  | "check_health_score"
  | "escalate_to_manager"
  | "add_to_pipeline"
  | "send_sms"
  | "create_alert"
  | "log_lifecycle_sync";

// Trigger event data
interface TriggerEvent {
  trigger: TriggerType;
  entityType?: string;
  entityId?: number;
  userId?: string;
  userEmail?: string;
  data?: Record<string, unknown>;
  timestamp?: Date;
}

// Automation result
interface AutomationResult {
  success: boolean;
  matchedRules: number;
  actions: Array<{
    ruleId: number;
    action: string;
    success: boolean;
    error?: string;
  }>;
}

// Scheduled job input
interface ScheduledJobInput {
  jobType: string;
  name: string;
  description?: string;
  scheduledFor: Date;
  cronExpression?: string;
  payload: Record<string, unknown>;
  isRecurring?: boolean;
  entityType?: string;
  entityId?: number;
  createdBy?: string;
}

interface Condition {
  field: string;
  operator: string;
  value: unknown;
}

interface ActionConfig {
  type: ActionType;
  config: Record<string, unknown>;
}

interface AutomationRule {
  id: number;
  name: string;
  trigger: string;
  conditions: unknown;
  actions: unknown;
  isActive: boolean;
  status: string;
  priority: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get all active rules for a trigger
async function getRulesForTrigger(trigger: TriggerType): Promise<AutomationRule[]> {
  return prisma.automationRule.findMany({
    where: {
      trigger,
      isActive: true,
      status: "active"
    },
    orderBy: { priority: "desc" }
  }) as Promise<AutomationRule[]>;
}

// Check if conditions are met
function checkConditions(conditions: Condition[], event: TriggerEvent): boolean {
  if (!conditions || conditions.length === 0) return true;
  
  return conditions.every(condition => {
    const { field, operator, value } = condition;
    const fieldValue = event.data?.[field];
    
    switch (operator) {
      case "equals":
        return fieldValue === value;
      case "not_equals":
        return fieldValue !== value;
      case "contains":
        return Array.isArray(fieldValue)
          ? fieldValue.includes(value)
          : String(fieldValue ?? "").includes(String(value ?? ""));
      case "greater_than":
        return Number(fieldValue) > Number(value);
      case "less_than":
        return Number(fieldValue) < Number(value);
      case ">=":
      case "gte":
        return Number(fieldValue) >= Number(value);
      case "<=":
      case "lte":
        return Number(fieldValue) <= Number(value);
      case "in":
        return Array.isArray(value)
          ? value.includes(fieldValue)
          : String(value ?? "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
              .includes(String(fieldValue ?? ""));
      case "not_in":
        return Array.isArray(value)
          ? !value.includes(fieldValue)
          : !String(value ?? "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
              .includes(String(fieldValue ?? ""));
      case "is_empty":
        return fieldValue === undefined || fieldValue === null || fieldValue === "";
      case "is_not_empty":
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== "";
      default:
        return true;
    }
  });
}

// Log automation execution
async function logAutomation(
  ruleId: number,
  event: TriggerEvent,
  actions: ActionConfig[],
  status: "completed" | "failed",
  error?: string
) {
  await prisma.automationLog.create({
    data: {
      ruleId,
      trigger: event.trigger,
      triggerData: event as unknown as Prisma.InputJsonValue,
      actionData: actions as unknown as Prisma.InputJsonValue,
      status,
      error,
      entityType: event.entityType,
      entityId: event.entityId,
      completedAt: new Date()
    }
  });
  
  // Update rule stats
  await prisma.automationRule.update({
    where: { id: ruleId },
    data: {
      runCount: { increment: 1 },
      lastRunAt: new Date(),
      ...(error && { lastRunError: error })
    }
  });
}

// ============================================
// ACTION HANDLERS
// ============================================

async function executeAction(action: ActionConfig, event: TriggerEvent): Promise<{ success: boolean; error?: string }> {
  const { type, config } = action;
  
  try {
    switch (type) {
      case "send_email":
        return await executeSendEmail(config, event);
      
      case "create_task":
        return await executeCreateTask(config, event);
      
      case "assign_lead":
        return await executeAssignLead(config, event);
      
      case "update_score":
        return await executeUpdateScore(config, event);
      
      case "recalculate_score":
        return await executeRecalculateScore(config, event);
      
      case "auto_tag":
        return await executeAutoTag(config, event);
      
      case "move_deal":
        return await executeMoveDeal(config, event);
      
      case "create_client":
        return await executeCreateClient(config, event);
      
      case "send_notification":
        return await executeSendNotification(config, event);
      
      case "tag_entity":
        return await executeTagEntity(config, event);
      
      case "remove_tag":
        return await executeRemoveTag(config, event);
      
      case "update_field":
        return await executeUpdateField(config, event);
      
      case "webhook":
        return await executeWebhook(config, event);
      
      case "add_to_campaign":
        return await executeAddToCampaign(config, event);
      
      case "delay":
        return await executeDelay(config, event);
      
      case "slack_notification":
        return await executeSlackNotification(config, event);
      
      case "add_to_pipeline":
        return await executeAddToPipeline(config, event);
      
      case "send_sms":
        return await executeSendSMS(config, event);
      
      case "create_followup_sequence":
        return await executeCreateFollowupSequence(config, event);
      
      case "check_health_score":
        return await executeCheckHealthScore(config, event);
      
      case "escalate_to_manager":
        return await executeEscalateToManager(config, event);
      
      case "create_alert":
        return await executeCreateAlert(config, event);
      
      case "log_lifecycle_sync":
        return { success: true };
      
      default:
        logger.warn(`Unknown action type: ${type}`);
        return { success: true };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error executing action ${type}:`, error);
    return { success: false, error: errorMessage };
  }
}

async function executeSendEmail(config: Record<string, unknown>, event: TriggerEvent) {
  const { to, cc, subject, template, templateData } = config as { to?: string; cc?: string; subject?: string; template?: string; templateData?: Record<string, unknown> };
  
  // Resolve actual email addresses
  let toEmail = to;
  if (to === "{{lead.email}}" && event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    toEmail = lead?.email;
  } else if (to === "{{client.email}}" && event.entityType === "Client" && event.entityId) {
    const client = await prisma.client.findUnique({ where: { id: event.entityId } });
    toEmail = client?.email;
  }
  
  if (!toEmail) {
    return { success: false, error: "Could not resolve email address" };
  }

  // Build merge data from entity - FIX: Pull actual lead/client data for email templates
  const mergeData: Record<string, unknown> = { ...templateData };
  
  if (event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    if (lead) {
      mergeData.name = `${lead.firstName} ${lead.lastName}`.trim() || lead.email.split('@')[0];
      mergeData.company = lead.company || "";
      mergeData.email = lead.email;
      mergeData.phone = lead.phone || "";
      mergeData.jobTitle = lead.jobTitle || "";
    }
  } else if (event.entityType === "Client" && event.entityId) {
    const client = await prisma.client.findUnique({ where: { id: event.entityId } });
    if (client) {
      mergeData.name = client.name;
      mergeData.company = client.company || "";
      mergeData.email = client.email;
    }
  }
  
  // Build email content with actual data
  const htmlBody = buildEmailFromTemplate(template || "", mergeData, event);
  
  // Resolve subject line with actual data too
  let resolvedSubject = subject || "Welcome";
  Object.entries(mergeData).forEach(([key, value]) => {
    resolvedSubject = resolvedSubject.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
  });
  resolvedSubject = resolveTemplateString(resolvedSubject, event);
  
  await sendMail({
    to: toEmail,
    subject: resolvedSubject,
    text: htmlBody.replace(/<[^>]*>/g, ""),
    html: htmlBody
  });
  
  await prisma.emailQueue.create({
    data: {
      to: toEmail,
      subject: resolveTemplateString(subject || "", event),
      body: htmlBody,
      template: template || null,
      templateData: mergeData as Prisma.InputJsonValue | undefined,
      status: "sent",
      sentAt: new Date(),
      entityType: event.entityType || "",
      entityId: event.entityId || 0,
      recipientName: String(mergeData.name || "")
    }
  });
  
  return { success: true };
}

async function executeCreateTask(config: Record<string, unknown>, event: TriggerEvent) {
  const { title, description, assignee, dueIn, priority, projectId } = config as { title?: string; description?: string; assignee?: string; dueIn?: string; priority?: string; projectId?: number };
  
  // Calculate due date
  let dueDate: Date | undefined;
  if (dueIn) {
    dueDate = new Date();
    const hours = parseInt(dueIn);
    if (!isNaN(hours)) {
      dueDate.setHours(dueDate.getHours() + hours);
    }
  }
  
  // Resolve assignee
  let assigneeEmail: string | undefined = assignee;
  if (assignee === "{{assignedTo}}" && event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    assigneeEmail = lead?.assignedTo || undefined;
  }
  
  const validPriority = (priority === "high" || priority === "medium" || priority === "low" ? priority : "medium") as "high" | "medium" | "low";
  const resolvedTitle = resolveTemplateString(title || "", event);
  await prisma.task.create({
    data: {
      title: resolvedTitle,
      avatar: buildTaskAvatar(resolvedTitle),
      assignee: assigneeEmail || "unassigned",
      priority: validPriority,
      column: "todo" as const,
      dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : "",
      valueStream: "",
      projectId: projectId || null,
      updatedAt: new Date()
    }
  });
  
  return { success: true };
}

async function executeAssignLead(config: Record<string, unknown>, event: TriggerEvent) {
  if (event.entityType !== "Lead" || !event.entityId) {
    return { success: false, error: "Action only works with leads" };
  }
  
  const { assignTo, roundRobin } = config as { assignTo?: string; roundRobin?: boolean };
  
  if (roundRobin) {
    // Get active team members
    const members = await prisma.teamMember.findMany({
      where: { deletedAt: null, status: "active" },
      orderBy: { id: "asc" }
    });
    
    if (members.length === 0) {
      return { success: false, error: "No active team members found" };
    }
    
    // Find who got the last lead
    const lastAssigned = await prisma.lead.findFirst({
      where: { assignedTo: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { assignedTo: true }
    });
    
    let nextIndex = 0;
    if (lastAssigned?.assignedTo) {
      const lastIndex = members.findIndex(m => m.email === lastAssigned.assignedTo);
      nextIndex = (lastIndex + 1) % members.length;
    }
    
    await prisma.lead.update({
      where: { id: event.entityId },
      data: { assignedTo: members[nextIndex].email }
    });
  } else {
    await prisma.lead.update({
      where: { id: event.entityId },
      data: { assignedTo: assignTo }
    });
  }
  
  return { success: true };
}

async function executeUpdateScore(config: Record<string, unknown>, event: TriggerEvent) {
  if (event.entityType !== "Lead" || !event.entityId) {
    return { success: false, error: "Action only works with leads" };
  }
  
  const { adjustment, setTo } = config as { adjustment?: number; setTo?: number };
  const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
  
  if (!lead) {
    return { success: false, error: "Lead not found" };
  }
  
  let newScore = lead.score;
  if (setTo !== undefined) {
    newScore = setTo;
  } else if (adjustment) {
    newScore = Math.max(0, Math.min(100, lead.score + adjustment));
  }
  
  await prisma.lead.update({
    where: { id: event.entityId },
    data: { score: newScore }
  });
  
  return { success: true };
}

async function executeMoveDeal(config: Record<string, unknown>, event: TriggerEvent) {
  if (event.entityType !== "Deal" || !event.entityId) {
    return { success: false, error: "Action only works with deals" };
  }
  
  const { stage } = config as { stage?: string };
  
  if (!stage) {
    return { success: false, error: "Stage is required" };
  }
  
  await prisma.deal.update({
    where: { id: event.entityId },
    data: { stage: stage as "prospecting" | "qualification" | "proposal" | "negotiation" | "closed_won" | "closed_lost" }
  });
  
  return { success: true };
}

async function executeCreateClient(config: Record<string, unknown>, event: TriggerEvent) {
  let clientData: Record<string, string> = {};
  
  if (event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    if (lead) {
      clientData = {
        name: `${lead.firstName || ""} ${lead.lastName || ""}`,
        email: lead.email || "",
        company: lead.company || "",
        phone: lead.phone || "",
        jobTitle: lead.jobTitle || "",
        source: lead.source || "",
        assignedTo: lead.assignedTo || ""
      };
    }
  } else if (event.entityType === "Deal" && event.entityId) {
    const deal = await prisma.deal.findUnique({ where: { id: event.entityId } });
    if (deal) {
      clientData = {
        name: deal.title,
        email: "",
        company: deal.title,
        source: "deal",
        phone: "",
        jobTitle: "",
        assignedTo: ""
      };
    }
  }
  
  if (Object.keys(clientData).length === 0) {
    return { success: false, error: "Could not create client from entity" };
  }
  
  const client = await prisma.client.create({
    data: {
      name: clientData.name || "Unknown",
      email: clientData.email || "",
      avatar: clientData.name?.charAt(0).toUpperCase() || "C",
      updatedAt: new Date(),
      company: clientData.company || "",
      phone: clientData.phone || "",
      jobTitle: clientData.jobTitle || "",
      source: clientData.source || "",
      assignedTo: clientData.assignedTo || ""
    }
  });
  
  await prisma.activityLog.create({
    data: {
      action: "created",
      entityType: "Client",
      entityId: client.id,
      description: `Client created from ${event.entityType || ""} #${event.entityId}`,
      performedBy: event.userEmail || "",
      isVisible: true
    }
  });
  
  return { success: true, clientId: client.id };
}

async function executeSendNotification(config: Record<string, unknown>, event: TriggerEvent) {
  const { message, to } = config as { message?: string; to?: string };
  
  logger.info(`Notification: ${resolveTemplateString(message || "", event)}`, {
    to,
    entityType: event.entityType,
    entityId: event.entityId
  });
  
  return { success: true };
}

async function executeTagEntity(config: Record<string, unknown>, event: TriggerEvent) {
  const { tags } = config as { tags?: string[] };
  
  if (event.entityType === "Lead" && event.entityId && Array.isArray(tags)) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    const currentTags = lead?.tags || [];
    const newTags = [...new Set([...(currentTags as string[]), ...tags])];
    await prisma.lead.update({
      where: { id: event.entityId },
      data: { tags: newTags }
    });
  }
  
  return { success: true };
}

async function executeRemoveTag(config: Record<string, unknown>, event: TriggerEvent) {
  const { tags } = config as { tags?: string[] };
  
  if (event.entityType === "Lead" && event.entityId && Array.isArray(tags)) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    const currentTags = (lead?.tags || []) as string[];
    const newTags = currentTags.filter((t: string) => !tags.includes(t));
    await prisma.lead.update({
      where: { id: event.entityId },
      data: { tags: newTags }
    });
  }
  
  return { success: true };
}

async function executeUpdateField(config: Record<string, unknown>, event: TriggerEvent) {
  const { field, value } = config as { field?: string; value?: unknown };
  
  if (!field || value === undefined) {
    return { success: false, error: "Field and value are required" };
  }
  
  // Whitelist allowed fields per entity type to prevent injection
  const allowedFields: Record<string, string[]> = {
    Lead: ['status', 'score', 'notes', 'tags'],
    Deal: ['stage', 'probability', 'description', 'tags'],
    Client: ['status', 'notes', 'tags'],
    Task: ['status', 'priority', 'dueDate', 'column']
  };

  const fieldName = String(field);
  const entityFields = allowedFields[event.entityType || ''];
  
  if (!entityFields || !entityFields.includes(fieldName)) {
    return { success: false, error: `Field ${fieldName} is not allowed for ${event.entityType}` };
  }
  
  const resolvedValue = resolveTemplateString(String(value), event);
  
  switch (event.entityType) {
    case "Lead":
      if (event.entityId) {
        await prisma.lead.update({
          where: { id: event.entityId },
          data: { [fieldName]: resolvedValue }
        });
      }
      break;
    case "Deal":
      if (event.entityId) {
        await prisma.deal.update({
          where: { id: event.entityId },
          data: { [fieldName]: resolvedValue }
        });
      }
      break;
    case "Client":
      if (event.entityId) {
        await prisma.client.update({
          where: { id: event.entityId },
          data: { [fieldName]: resolvedValue }
        });
      }
      break;
    case "Task":
      if (event.entityId) {
        await prisma.task.update({
          where: { id: event.entityId },
          data: { [fieldName]: resolvedValue }
        });
      }
      break;
    default:
      return { success: false, error: `Entity type ${event.entityType} not supported` };
  }
  
  return { success: true };
}

const BLOCKED_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^localhost$/i,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
];

function isUrlSafe(urlString: string): { safe: boolean; reason?: string } {
  try {
    const url = new URL(urlString);
    
    if (!["http:", "https:"].includes(url.protocol)) {
      return { safe: false, reason: "Only HTTP and HTTPS protocols are allowed" };
    }
    
    const hostname = url.hostname.toLowerCase();
    
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { safe: false, reason: "Internal network addresses are not allowed" };
      }
    }
    
    const resolved = hostname.replace(/^\[|\]$/g, "");
    try {
      const dns = require("dns");
      dns.reverse(resolved, () => {});
    } catch {}
    
    return { safe: true };
  } catch {
    return { safe: false, reason: "Invalid URL format" };
  }
}

async function executeWebhook(config: Record<string, unknown>, event: TriggerEvent) {
  const { url, method, headers, body } = config as { url?: string; method?: string; headers?: Record<string, string>; body?: unknown };
  
  if (!url) {
    return { success: false, error: "Webhook URL is required" };
  }
  
  const safetyCheck = isUrlSafe(url);
  if (!safetyCheck.safe) {
    logger.warn(`Webhook blocked: ${safetyCheck.reason}`, { url });
    return { success: false, error: `Webhook URL blocked: ${safetyCheck.reason}` };
  }
  
  try {
    const resolvedBody = body ? resolveTemplateString(JSON.stringify(body), event) : JSON.stringify(event);
    
    const response = await fetch(url, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
        "User-Agent": "FocalPoint-Compass-CRM/1.0",
      },
      body: resolvedBody,
      signal: AbortSignal.timeout(30000),
    });
    
    if (!response.ok) {
      return { success: false, error: `Webhook failed with status ${response.status}` };
    }
    
    logger.info(`Webhook sent to ${url}`, { status: response.status });
    return { success: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    if (errMsg.includes("timeout")) {
      return { success: false, error: "Webhook request timed out" };
    }
    return { success: false, error: `Webhook error: Request failed` };
  }
}

async function executeAddToCampaign(config: Record<string, unknown>, event: TriggerEvent) {
  const { campaignId, campaignName } = config as { campaignId?: string; campaignName?: string };
  
  let email = "";
  let name = "";
  
  if (event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    email = lead?.email || "";
    name = `${lead?.firstName || ""} ${lead?.lastName || ""}`.trim();
  } else if (event.entityType === "Client" && event.entityId) {
    const client = await prisma.client.findUnique({ where: { id: event.entityId } });
    email = client?.email || "";
    name = client?.name || "";
  }
  
  if (!email) {
    return { success: false, error: "Could not find email for campaign" };
  }
  
  logger.info(`Added ${email} to campaign ${campaignName || campaignId}`, {
    campaignId,
    campaignName,
    email,
    name
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "added_to_campaign",
      entityType: event.entityType || "Unknown",
      entityId: event.entityId || 0,
      description: `Added to email campaign: ${campaignName || campaignId}`,
      performedBy: event.userEmail || "system",
      isVisible: true
    }
  });
  
  return { success: true };
}

async function executeDelay(config: Record<string, unknown>, event: TriggerEvent) {
  const { minutes } = config as { minutes?: string };
  
  if (!minutes) {
    return { success: true };
  }
  
  const delayMs = parseInt(minutes) * 60 * 1000;
  await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 300000))); // Max 5 minutes
  
  return { success: true };
}

async function executeSlackNotification(config: Record<string, unknown>, event: TriggerEvent) {
  const { webhookUrl, channel, message } = config as { webhookUrl?: string; channel?: string; message?: string };
  
  if (!webhookUrl) {
    return { success: false, error: "Slack webhook URL is required" };
  }
  
  const resolvedMessage = resolveTemplateString(message || "New automation triggered", event);
  
  try {
    const payload = {
      ...(channel && { channel }),
      text: resolvedMessage,
      attachments: [{
        color: "#36a64f",
        fields: [
          { title: "Entity", value: event.entityType || "Unknown", short: true },
          { title: "Trigger", value: event.trigger, short: true }
        ]
      }]
    };
    
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      return { success: false, error: `Slack notification failed: ${response.status}` };
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: `Slack error: ${String(error)}` };
  }
}

async function executeAddToPipeline(config: Record<string, unknown>, event: TriggerEvent) {
  const { pipelineId, stage } = config as { pipelineId?: string; stage?: string };
  
  if (event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    
    // Create a deal from the lead
    const deal = await prisma.deal.create({
      data: {
        title: `${lead?.firstName || ""} ${lead?.lastName || ""} - ${lead?.company || "Deal"}`,
        stage: (stage as any) || "prospecting",
        probability: 20,
        expectedClose: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        value: 0
      }
    });
    
    logger.info(`Created deal from lead ${event.entityId} in pipeline`, { dealId: deal.id, pipelineId });
    
    return { success: true, dealId: deal.id };
  }
  
  return { success: false, error: "Can only add leads to pipeline" };
}

async function executeSendSMS(config: Record<string, unknown>, event: TriggerEvent) {
  const { to, message, provider } = config as { to?: string; message?: string; provider?: string };
  
  const resolvedMessage = resolveTemplateString(message || "", event);
  
  // For now, just log SMS - would need SMS provider integration
  logger.info(`SMS would be sent via ${provider || "default"}:`, {
    to,
    message: resolvedMessage,
    entityType: event.entityType,
    entityId: event.entityId
  });
  
  return { success: true };
}

// ============================================
// GTM ACTION HANDLERS
// ============================================

async function executeRecalculateScore(_config: Record<string, unknown>, event: TriggerEvent) {
  if (event.entityType === "Lead" && event.entityId) {
    const result = await GTMAutomationService.calculateLeadScore(event.entityId);
    logger.info(`Recalculated score for lead ${event.entityId}: ${result.score}`);
    
    // Auto-tag based on new score
    const tags = await GTMAutomationService.autoTagLead(event.entityId);
    
    return { success: true, score: result.score, tags };
  }
  
  if (event.entityType === "Client" && event.entityId) {
    const result = await GTMAutomationService.calculateClientHealthScore(event.entityId);
    logger.info(`Calculated health score for client ${event.entityId}: ${result.score} (${result.grade})`);
    
    return { success: true, score: result.score, grade: result.grade };
  }
  
  return { success: false, error: "Entity type not supported for score recalculation" };
}

async function executeAutoTag(_config: Record<string, unknown>, event: TriggerEvent) {
  if (event.entityType === "Lead" && event.entityId) {
    const tags = await GTMAutomationService.autoTagLead(event.entityId);
    logger.info(`Auto-tagged lead ${event.entityId} with tags: ${tags.join(", ")}`);
    return { success: true, tags };
  }
  
  return { success: false, error: "Auto-tagging only works with leads" };
}

async function executeCreateFollowupSequence(_config: Record<string, unknown>, event: TriggerEvent) {
  if (event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    if (!lead) return { success: false, error: "Lead not found" };
    
    await GTMAutomationService.createFollowUpReminders(event.entityId, lead.assignedTo || "unassigned");
    
    // Also tag the lead
    await prisma.lead.update({
      where: { id: event.entityId },
      data: { tags: [...(lead.tags || []), "followup-sequence"] }
    });
    
    logger.info(`Created follow-up sequence for lead ${event.entityId}`);
    return { success: true };
  }
  
  return { success: false, error: "Follow-up sequence only works with leads" };
}

async function executeCheckHealthScore(_config: Record<string, unknown>, event: TriggerEvent) {
  if (event.entityType === "Client" && event.entityId) {
    const result = await GTMAutomationService.calculateClientHealthScore(event.entityId);
    
    // If health score is low, create an alert
    if (result.score < 50) {
      await prisma.alert.create({
        data: {
          type: "health_warning",
          severity: result.score < 30 ? "critical" : "warning",
          title: `Client Health Alert: Score ${result.score}`,
          message: `Client health score dropped to ${result.score}. Grade: ${result.grade}. Please check in.`,
          entityType: "Client",
          entityId: event.entityId,
          isResolved: false
        }
      });
    }
    
    return { success: true, score: result.score, grade: result.grade };
  }
  
  return { success: false, error: "Health check only works with clients" };
}

async function executeEscalateToManager(config: Record<string, unknown>, event: TriggerEvent) {
  const { reason, priority } = config as { reason?: string; priority?: string };
  
  // Find a manager
  const manager = await prisma.user.findFirst({
    where: { role: "manager" }
  });
  
  if (!manager) {
    return { success: false, error: "No manager found to escalate to" };
  }
  
  // Create task for manager
  const entityName = event.entityType === "Lead" 
    ? `Lead #${event.entityId}`
    : event.entityType === "Deal"
    ? `Deal #${event.entityId}`
    : `${event.entityType} #${event.entityId}`;
  
  await prisma.task.create({
    data: {
      title: `ESCALATED: ${entityName} - ${reason || "Needs attention"}`,
      assignee: manager.email,
      priority: (priority === "high" ? "high" : priority === "low" ? "low" : "medium") as "high" | "medium" | "low",
      column: "todo" as const,
      dueDate: new Date().toISOString().slice(0, 10),
      valueStream: "escalation",
      avatar: "ESC",
      updatedAt: new Date()
    }
  });
  
  await prisma.alert.create({
    data: {
      type: "escalation",
      severity: (priority === "high" ? "critical" : "warning") as "critical" | "warning",
      title: `Escalation: ${entityName}`,
      message: reason || `Item has been escalated to ${manager.name}`,
      entityType: event.entityType || "",
      entityId: event.entityId || 0,
      isResolved: false
    }
  });
  
  logger.info(`Escalated ${event.entityType} #${event.entityId} to manager ${manager.email}`);
  
  return { success: true, escalatedTo: manager.email };
}

async function executeCreateAlert(config: Record<string, unknown>, event: TriggerEvent) {
  const { type, severity, title, message } = config as { type?: string; severity?: string; title?: string; message?: string };
  
  const alertType = type || "custom";
  const alertSeverity = severity || "info";
  
  const entityName = event.entityType === "Lead" 
    ? `Lead #${event.entityId}`
    : event.entityType === "Deal"
    ? `Deal #${event.entityId}`
    : event.entityType === "Client"
    ? `Client #${event.entityId}`
    : `${event.entityType} #${event.entityId}`;
  
  await prisma.alert.create({
    data: {
      type: alertType as "health_warning" | "churn_risk" | "stale_deal" | "escalation" | "renewal_reminder" | "custom",
      severity: alertSeverity as "info" | "warning" | "critical",
      title: title || `Alert: ${entityName}`,
      message: message || `Automation triggered for ${entityName}`,
      entityType: event.entityType || "",
      entityId: event.entityId || 0,
      isResolved: false
    }
  });
  
  logger.info(`Created ${alertSeverity} alert for ${event.entityType} #${event.entityId}`);
  
  return { success: true, alertType, severity: alertSeverity };
}

// ============================================
// TEMPLATE RESOLVER
// ============================================

function resolveTemplateString(template: string, event: TriggerEvent): string {
  if (!template) return "";
  
  return template
    .replace(/\{\{entityType\}\}/g, event.entityType || "")
    .replace(/\{\{entityId\}\}/g, String(event.entityId || ""))
    .replace(/\{\{userEmail\}\}/g, event.userEmail || "");
}

function buildEmailFromTemplate(template: string, data: Record<string, unknown>, event: TriggerEvent): string {
  // Default templates
  const templates: Record<string, string> = {
    "lead_welcome": `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 36px 24px; text-align: center;">
              <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                <span style="font-size: 36px;">🎉</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -0.5px;">Welcome to Focal Point Compass!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <p style="color: #111827; font-size: 17px; line-height: 1.6; margin: 0 0 16px;">Hello <strong style="color: #667eea;">{{name}}</strong>,</p>
              <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 16px;">Thank you for connecting with <strong>{{company}}</strong>. We're thrilled to have you here and can't wait to show you what we have to offer!</p>
              <p style="color: #4b5563; font-size: 15px; line-height: 1.7; margin: 0 0 24px;">Our team will be reaching out to you shortly. In the meantime, feel free to reach out if you have any questions.</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 12px; color: #374151; font-size: 14px; font-weight: 600;">What happens next?</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 6px 0; color: #4b5563; font-size: 14px;">📞 Our team will contact you within 24 hours</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #4b5563; font-size: 14px;">📅 We'll schedule a convenient time to discuss your needs</td>
                      </tr>
                      <tr>
                        <td style="padding: 6px 0; color: #4b5563; font-size: 14px;">✨ Get a customized solution tailored to your requirements</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; font-size: 13px; margin: 0;">Best regards,<br/><strong style="color: #4b5563;">The Focal Point Compass Team</strong></p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 16px 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated message. Please do not reply directly.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    "lead_assigned": `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lead Assigned</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 36px 24px; text-align: center;">
              <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                <span style="font-size: 36px;">👤</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Lead Assigned</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px;">
              <p style="color: #111827; font-size: 15px; margin: 0 0 20px;">A new lead has been assigned to you:</p>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 12px; overflow: hidden;">
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 13px; width: 80px;">Name</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 500;">{{name}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 13px; width: 80px;">Email</td>
                        <td style="color: #111827; font-size: 14px;">{{email}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color: #6b7280; font-size: 13px; width: 80px;">Company</td>
                        <td style="color: #111827; font-size: 14px; font-weight: 500;">{{company}}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0;">Sent via Focal Point Compass CRM</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    "followup_reminder": `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Follow-up Reminder</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 36px 24px; text-align: center;">
              <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                <span style="font-size: 36px;">⏰</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Follow-up Reminder</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px; text-align: center;">
              <p style="color: #111827; font-size: 17px; margin: 0 0 16px;">Don't forget to follow up with <strong style="color: #f59e0b;">{{name}}</strong>!</p>
              <p style="color: #4b5563; font-size: 15px; margin: 0;">This is an automated reminder from your CRM.</p>
              <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0;">Sent via Focal Point Compass CRM</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
    "deal_won": `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deal Won!</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 36px 24px; text-align: center;">
              <div style="width: 72px; height: 72px; background: rgba(255,255,255,0.2); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
                <span style="font-size: 36px;">🎉</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Congratulations!</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 24px; text-align: center;">
              <p style="color: #111827; font-size: 17px; margin: 0 0 16px;">Deal "<strong>{{dealName}}</strong>" has been won!</p>
              <div style="display: inline-block; background: #d1fae5; padding: 12px 24px; border-radius: 8px; margin: 8px 0 0;">
                <span style="color: #059669; font-size: 18px; font-weight: 600;">Amount: {{amount}}</span>
              </div>
              <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0;">Sent via Focal Point Compass CRM</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `
  };
  
  let html = templates[template] || templates["lead_welcome"];
  html = resolveTemplateString(html, event);
  
  // Replace data placeholders
  Object.entries(data).forEach(([key, value]) => {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
  });
  
  return html;
}

// ============================================
// MAIN AUTOMATION ENGINE
// ============================================

export async function triggerAutomation(
  trigger: TriggerType,
  event: TriggerEvent
): Promise<AutomationResult> {
  const result: AutomationResult = {
    success: true,
    matchedRules: 0,
    actions: []
  };
  
  try {
    const rules = await getRulesForTrigger(trigger);
    result.matchedRules = rules.length;
    
    for (const rule of rules) {
      const conditions = (rule.conditions as Condition[]) || [];
      const conditionsMet = checkConditions(conditions, event);
      if (!conditionsMet) continue;
      
      const actions = (rule.actions as ActionConfig[]) || [];
      
      for (const action of actions) {
        const actionResult = await executeAction(action, event);
        result.actions.push({
          ruleId: rule.id,
          action: action.type,
          ...actionResult
        });
        
        if (!actionResult.success) {
          result.success = false;
        }
      }
      
      await logAutomation(
        rule.id,
        event,
        actions,
        result.success ? "completed" : "failed",
        result.success ? undefined : "Some actions failed"
      );
    }
    
  } catch (error) {
    logger.error("Automation trigger failed:", error);
    result.success = false;
  }
  
  return result;
}

// ============================================
// SCHEDULED JOBS
// ============================================

export async function createScheduledJob(input: ScheduledJobInput) {
  const jobType = input.jobType as "email" | "task" | "alert" | "webhook" | "reminder";
  return prisma.scheduledJob.create({
    data: {
      jobType,
      name: input.name,
      description: input.description,
      scheduledFor: input.scheduledFor,
      cronExpression: input.cronExpression,
      payload: input.payload as Prisma.InputJsonValue,
      isRecurring: input.isRecurring || false,
      entityType: input.entityType,
      entityId: input.entityId,
      createdBy: input.createdBy
    }
  });
}

export async function cancelScheduledJob(jobId: number) {
  return prisma.scheduledJob.update({
    where: { id: jobId },
    data: { status: "cancelled" }
  });
}

export async function executeScheduledJobs() {
  const now = new Date();
  
  // Get pending jobs that are due
  const jobs = await prisma.scheduledJob.findMany({
    where: {
      status: "pending",
      scheduledFor: { lte: now }
    },
    take: 10
  });
  
  for (const job of jobs) {
    try {
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: { status: "running" }
      });
      
      const payload = job.payload as { to?: string; subject?: string; text?: string; html?: string; title?: string; assignee?: string; priority?: string; dueDate?: string } | null;
      
      // Execute based on job type
      if (job.jobType === "email" && payload) {
        await sendMail({
          to: payload.to || "",
          subject: payload.subject || "",
          text: payload.text || "",
          html: payload.html || ""
        });
      } else if (job.jobType === "task" && payload) {
        const validPriority = (["low", "medium", "high"].includes(payload.priority || "") ? payload.priority : "medium") as "high" | "medium" | "low";
        const taskTitle = String(payload.title || "Scheduled Task");
        await prisma.task.create({
          data: {
            title: taskTitle,
            assignee: String(payload.assignee || "unassigned"),
            avatar: buildTaskAvatar(taskTitle),
            priority: validPriority,
            column: "todo" as const,
            dueDate: String(payload.dueDate || ""),
            valueStream: "",
            updatedAt: new Date()
          }
        });
      } else if (job.jobType === "alert") {
        logger.info(`Alert job executed: ${job.name}`, payload);
      }
      
      // Mark complete
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          runCount: { increment: 1 },
          lastRunAt: new Date(),
          ...(job.isRecurring && job.cronExpression ? {
            nextRunAt: getNextCronRun(job.cronExpression)
          } : {})
        }
      });
      
    } catch (error) {
      await prisma.scheduledJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          lastError: String(error)
        }
      });
    }
  }
}

// Calculate next cron run time
function getNextCronRun(cronExpression: string): Date {
  try {
    const cron = require("node-cron");
    // This is simplified - real implementation would use cron library
    return new Date(Date.now() + 86400000); // Default to 1 day
  } catch {
    return new Date(Date.now() + 86400000);
  }
}

// ============================================
// CRON JOB SETUP
// ============================================

let cronJob: ScheduledTask | null = null;

export function startAutomationCron() {
  // 1. Run every 5 minutes to check scheduled jobs
  cronJob = cron.schedule("*/5 * * * *", async () => {
    logger.debug("Running automation cron...");
    await executeScheduledJobs();
  });
  
  // 2. Hourly GTM alert checks (stale deals, churn risk)
  cron.schedule("0 * * * *", async () => {
    logger.info("Running hourly GTM alert checks...");
    try {
      await GTMAutomationService.checkStaleDeals();
      await GTMAutomationService.checkChurnRisk();
      logger.info("Hourly GTM checks completed");
    } catch (err) {
      logger.error("Hourly GTM checks failed:", err);
    }
  });

  // 3. Daily cleanup — remove stale DB rows to keep tables lean
  cron.schedule("30 0 * * *", async () => {
    logger.info("Running daily DB cleanup...");
    try {
      const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const cutoff90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      const [tokens, jobs, logs, actLogs] = await Promise.all([
        // Expired refresh tokens
        prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
        // Completed/failed/cancelled scheduled jobs older than 30 days
        prisma.scheduledJob.deleteMany({
          where: { status: { in: ["completed", "failed", "cancelled"] }, scheduledFor: { lt: cutoff30d } },
        }),
        // Automation logs older than 90 days
        prisma.automationLog.deleteMany({ where: { startedAt: { lt: cutoff90d } } }),
        // Activity logs older than 90 days
        prisma.activityLog.deleteMany({ where: { createdAt: { lt: cutoff90d } } }),
      ]);

      logger.info("Daily cleanup done", {
        expiredTokens: tokens.count,
        oldJobs: jobs.count,
        oldLogs: logs.count,
        oldActivityLogs: actLogs.count,
      });
    } catch (err) {
      logger.error("Daily cleanup failed:", err);
    }
  });

  // 4. Daily Maintenance Sweep (at midnight)
  cron.schedule("0 0 * * *", async () => {
    logger.info("Running daily automation maintenance sweep...");
    try {
      // Recalculate all health scores
      const clients = await prisma.client.findMany({ where: { deletedAt: null, status: "active" } });
      for (const client of clients) {
        await GTMAutomationService.calculateClientHealthScore(client.id);
      }
      
      // Run GTM logic
      await GTMAutomationService.identifyColdLeads();
      await GTMAutomationService.createRenewalReminders();
      
      logger.info("Daily automation sweep completed successfully");
    } catch (err) {
      logger.error("Daily automation sweep failed:", err);
    }
  });
  
  logger.info("Automation cron job started (Scheduled: 5m, GTM alerts: 1h, Sweep: Daily)");
}

export function stopAutomationCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    logger.info("Automation cron job stopped");
  }
}

// ============================================
// HOOK INTO EXISTING SERVICES
// ============================================

// This function should be called when certain events happen
export async function onLeadCreated(leadId: number, data: Record<string, unknown>) {
  await triggerAutomation("lead_created", {
    trigger: "lead_created",
    entityType: "Lead",
    entityId: leadId,
    data
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "created",
      entityType: "Lead",
      entityId: leadId,
      description: `Lead created: ${String(data.firstName || "")} ${String(data.lastName || "")}`,
      performedBy: String(data.createdBy || ""),
      isVisible: true
    }
  });

  await gtmLifecycleService.syncLeadLifecycle(leadId, String(data.createdBy || ""));
}

export async function onLeadUpdated(leadId: number, changes: Record<string, unknown>, userEmail?: string) {
  await triggerAutomation("lead_updated", {
    trigger: "lead_updated",
    entityType: "Lead",
    entityId: leadId,
    userEmail,
    data: { changes }
  });

  await gtmLifecycleService.syncLeadLifecycle(leadId, userEmail);
}

export async function onDealStageChanged(dealId: number, newStage: string, oldStage: string) {
  await triggerAutomation("deal_stage_changed", {
    trigger: "deal_stage_changed",
    entityType: "Deal",
    entityId: dealId,
    data: { newStage, oldStage }
  });
  
  // Auto-create client if deal won
  if (newStage === "closed_won") {
    await triggerAutomation("deal_closed", {
      trigger: "deal_closed",
      entityType: "Deal",
      entityId: dealId,
      data: { outcome: "won" }
    });
  }

  await gtmLifecycleService.syncDealLifecycle(dealId);
}

export async function onTaskOverdue(taskId: number) {
  await triggerAutomation("task_overdue", {
    trigger: "task_overdue",
    entityType: "Task",
    entityId: taskId
  });
}

export async function onClientCreated(clientId: number, data: Record<string, unknown>) {
  await triggerAutomation("client_created", {
    trigger: "client_created",
    entityType: "Client",
    entityId: clientId,
    data
  });
}
