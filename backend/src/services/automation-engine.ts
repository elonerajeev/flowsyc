import { prisma } from "../config/prisma";
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
type TriggerType = 
  | "lead_created" 
  | "lead_updated" 
  | "lead_scored" 
  | "lead_assigned"
  | "deal_created" 
  | "deal_stage_changed" 
  | "deal_closed"
  | "task_created" 
  | "task_completed" 
  | "task_overdue"
  | "client_created" 
  | "client_health_changed"
  | "invoice_created" 
  | "invoice_overdue"
  | "payroll_due" 
  | "project_stalled"
  | "custom_schedule";

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
  | "send_sms";

// Trigger event data
interface TriggerEvent {
  trigger: TriggerType;
  entityType?: string;
  entityId?: number;
  userId?: string;
  userEmail?: string;
  data?: Record<string, any>;
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
  payload: Record<string, any>;
  isRecurring?: boolean;
  entityType?: string;
  entityId?: number;
  createdBy?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Get all active rules for a trigger
async function getRulesForTrigger(trigger: TriggerType): Promise<any[]> {
  return prisma.automationRule.findMany({
    where: {
      trigger,
      isActive: true,
      status: "active"
    },
    orderBy: { priority: "desc" }
  });
}

// Check if conditions are met
function checkConditions(conditions: any[], event: TriggerEvent): boolean {
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
        return String(fieldValue).includes(value);
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
      case "is_empty":
        return !fieldValue || fieldValue === "";
      case "is_not_empty":
        return fieldValue && fieldValue !== "";
      default:
        return true;
    }
  });
}

// Log automation execution
async function logAutomation(
  ruleId: number,
  event: TriggerEvent,
  actions: any[],
  status: "completed" | "failed",
  error?: string
) {
  await prisma.automationLog.create({
    data: {
      ruleId,
      trigger: event.trigger,
      triggerData: event as any,
      actionData: actions,
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

async function executeAction(action: any, event: TriggerEvent): Promise<{ success: boolean; error?: string }> {
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
  } catch (error: any) {
    logger.error(`Error executing action ${type}:`, error);
    return { success: false, error: error.message };
  }
}

async function executeSendEmail(config: any, event: TriggerEvent) {
  const { to, cc, subject, template, templateData } = config;
  
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
  
  // Build email content
  const htmlBody = buildEmailFromTemplate(template, templateData || {}, event);
  
  await sendMail({
    to: toEmail,
    subject: resolveTemplateString(subject, event),
    text: htmlBody.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    html: htmlBody
  });
  
  // Queue email for tracking
  await prisma.emailQueue.create({
    data: {
      to: toEmail,
      subject: resolveTemplateString(subject, event),
      body: htmlBody,
      template,
      templateData,
      status: "sent",
      sentAt: new Date(),
      entityType: event.entityType,
      entityId: event.entityId,
      recipientName: templateData?.name
    }
  });
  
  return { success: true };
}

async function executeCreateTask(config: any, event: TriggerEvent) {
  const { title, description, assignee, dueIn, priority, projectId } = config;
  
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
  let assigneeEmail = assignee;
  if (assignee === "{{assignedTo}}" && event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    assigneeEmail = lead?.assignedTo;
  }
  
  const validPriority = (priority === "high" || priority === "medium" || priority === "low" ? priority : "medium") as "high" | "medium" | "low";
  const resolvedTitle = resolveTemplateString(title, event);
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

async function executeAssignLead(config: any, event: TriggerEvent) {
  if (event.entityType !== "Lead" || !event.entityId) {
    return { success: false, error: "Action only works with leads" };
  }
  
  const { assignTo, roundRobin } = config;
  
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

async function executeUpdateScore(config: any, event: TriggerEvent) {
  if (event.entityType !== "Lead" || !event.entityId) {
    return { success: false, error: "Action only works with leads" };
  }
  
  const { adjustment, setTo } = config;
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

async function executeMoveDeal(config: any, event: TriggerEvent) {
  if (event.entityType !== "Deal" || !event.entityId) {
    return { success: false, error: "Action only works with deals" };
  }
  
  const { stage } = config;
  
  await prisma.deal.update({
    where: { id: event.entityId },
    data: { stage }
  });
  
  return { success: true };
}

async function executeCreateClient(config: any, event: TriggerEvent) {
  // Can create from Lead or Deal
  let clientData: any = {};
  
  if (event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    if (lead) {
      clientData = {
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email,
        company: lead.company,
        phone: lead.phone,
        jobTitle: lead.jobTitle,
        source: lead.source,
        assignedTo: lead.assignedTo
      };
    }
  } else if (event.entityType === "Deal" && event.entityId) {
    const deal = await prisma.deal.findUnique({ where: { id: event.entityId } });
    if (deal) {
      clientData = {
        name: deal.title,
        email: "",
        company: deal.title,
        source: "deal"
      };
    }
  }
  
  if (Object.keys(clientData).length === 0) {
    return { success: false, error: "Could not create client from entity" };
  }
  
  const client = await prisma.client.create({
    data: {
      ...clientData,
      avatar: clientData.name?.charAt(0).toUpperCase() || "C"
    }
  });
  
  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "created",
      entityType: "Client",
      entityId: client.id,
      description: `Client created from ${event.entityType} #${event.entityId}`,
      performedBy: event.userEmail,
      isVisible: true
    }
  });
  
  return { success: true, clientId: client.id };
}

async function executeSendNotification(config: any, event: TriggerEvent) {
  const { message, to } = config;
  
  // For now, just log it - could integrate with Slack, Push, etc.
  logger.info(`Notification: ${resolveTemplateString(message, event)}`, {
    to,
    entityType: event.entityType,
    entityId: event.entityId
  });
  
  return { success: true };
}

async function executeTagEntity(config: any, event: TriggerEvent) {
  const { tags } = config;
  
  if (event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    const currentTags = lead?.tags || [];
    const newTags = [...new Set([...currentTags, ...tags])];
    await prisma.lead.update({
      where: { id: event.entityId },
      data: { tags: newTags }
    });
  }
  
  return { success: true };
}

async function executeRemoveTag(config: any, event: TriggerEvent) {
  const { tags } = config;
  
  if (event.entityType === "Lead" && event.entityId) {
    const lead = await prisma.lead.findUnique({ where: { id: event.entityId } });
    const currentTags = lead?.tags || [];
    const newTags = currentTags.filter((t: string) => !tags.includes(t));
    await prisma.lead.update({
      where: { id: event.entityId },
      data: { tags: newTags }
    });
  }
  
  return { success: true };
}

async function executeUpdateField(config: any, event: TriggerEvent) {
  const { field, value } = config;
  
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

async function executeWebhook(config: any, event: TriggerEvent) {
  const { url, method, headers, body } = config;
  
  if (!url) {
    return { success: false, error: "Webhook URL is required" };
  }
  
  try {
    const resolvedBody = body ? resolveTemplateString(JSON.stringify(body), event) : JSON.stringify(event);
    
    const response = await fetch(url, {
      method: method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers
      },
      body: resolvedBody
    });
    
    if (!response.ok) {
      return { success: false, error: `Webhook failed with status ${response.status}` };
    }
    
    logger.info(`Webhook sent to ${url}`, { status: response.status });
    return { success: true };
  } catch (error) {
    return { success: false, error: `Webhook error: ${String(error)}` };
  }
}

async function executeAddToCampaign(config: any, event: TriggerEvent) {
  const { campaignId, campaignName } = config;
  
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

async function executeDelay(config: any, event: TriggerEvent) {
  const { minutes } = config;
  
  if (!minutes) {
    return { success: true };
  }
  
  const delayMs = parseInt(minutes) * 60 * 1000;
  await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 300000))); // Max 5 minutes
  
  return { success: true };
}

async function executeSlackNotification(config: any, event: TriggerEvent) {
  const { webhookUrl, channel, message } = config;
  
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

async function executeAddToPipeline(config: any, event: TriggerEvent) {
  const { pipelineId, stage } = config;
  
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

async function executeSendSMS(config: any, event: TriggerEvent) {
  const { to, message, provider } = config;
  
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

async function executeRecalculateScore(config: any, event: TriggerEvent) {
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

async function executeAutoTag(config: any, event: TriggerEvent) {
  if (event.entityType === "Lead" && event.entityId) {
    const tags = await GTMAutomationService.autoTagLead(event.entityId);
    logger.info(`Auto-tagged lead ${event.entityId} with tags: ${tags.join(", ")}`);
    return { success: true, tags };
  }
  
  return { success: false, error: "Auto-tagging only works with leads" };
}

async function executeCreateFollowupSequence(config: any, event: TriggerEvent) {
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

async function executeCheckHealthScore(config: any, event: TriggerEvent) {
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

async function executeEscalateToManager(config: any, event: TriggerEvent) {
  const { reason, priority } = config;
  
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
      priority: priority || "high",
      column: "todo",
      dueDate: new Date().toISOString().slice(0, 10),
      valueStream: "escalation",
      avatar: "ESC",
      updatedAt: new Date()
    }
  });
  
  // Create alert
  await prisma.alert.create({
    data: {
      type: "escalation",
      severity: priority === "high" ? "critical" : "warning",
      title: `Escalation: ${entityName}`,
      message: reason || `Item has been escalated to ${manager.name}`,
      entityType: event.entityType,
      entityId: event.entityId,
      isResolved: false
    }
  });
  
  logger.info(`Escalated ${event.entityType} #${event.entityId} to manager ${manager.email}`);
  
  return { success: true, escalatedTo: manager.email };
}

async function executeCreateAlert(config: any, event: TriggerEvent) {
  const { type, severity, title, message } = config;
  
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
      type: alertType as any,
      severity: alertSeverity as any,
      title: title || `Alert: ${entityName}`,
      message: message || `Automation triggered for ${entityName}`,
      entityType: event.entityType,
      entityId: event.entityId,
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

function buildEmailFromTemplate(template: string, data: any, event: TriggerEvent): string {
  // Default templates
  const templates: Record<string, string> = {
    "lead_welcome": `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome, {{name}}!</h2>
        <p>Thank you for your interest. Our team will be in touch soon.</p>
        <p>Best regards,<br/>The Team</p>
      </div>
    `,
    "lead_assigned": `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Lead Assigned</h2>
        <p>A new lead has been assigned to you.</p>
        <p><strong>Name:</strong> {{name}}</p>
        <p><strong>Email:</strong> {{email}}</p>
        <p><strong>Company:</strong> {{company}}</p>
      </div>
    `,
    "followup_reminder": `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Follow-up Reminder</h2>
        <p>Don't forget to follow up with {{name}}!</p>
        <p>This is an automated reminder.</p>
      </div>
    `,
    "deal_won": `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">🎉 Congratulations!</h2>
        <p>Deal "{{dealName}}" has been won!</p>
        <p>Amount: {{amount}}</p>
      </div>
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
  const startTime = Date.now();
  const result: AutomationResult = {
    success: true,
    matchedRules: 0,
    actions: []
  };
  
  try {
    // Get matching rules
    const rules = await getRulesForTrigger(trigger);
    result.matchedRules = rules.length;
    
    for (const rule of rules) {
      // Check conditions
      const conditionsMet = checkConditions(rule.conditions, event);
      if (!conditionsMet) continue;
      
      // Execute actions
      const actions = Array.isArray(rule.actions) ? rule.actions : [];
      
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
      
      // Log execution
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
  return prisma.scheduledJob.create({
    data: {
      jobType: input.jobType as any,
      name: input.name,
      description: input.description,
      scheduledFor: input.scheduledFor,
      cronExpression: input.cronExpression,
      payload: input.payload,
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
      
      const payload = job.payload as any;
      
      // Execute based on job type
      if (job.jobType === "email") {
        await sendMail({
          to: payload.to,
          subject: payload.subject,
          text: payload.text || "",
          html: payload.html || ""
        });
      } else if (job.jobType === "task") {
        const validPriority = (["low", "medium", "high"].includes(payload.priority) ? payload.priority : "medium") as "high" | "medium" | "low";
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
export async function onLeadCreated(leadId: number, data: any) {
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
      description: `Lead created: ${data.firstName} ${data.lastName}`,
      performedBy: data.createdBy,
      isVisible: true
    }
  });

  await gtmLifecycleService.syncLeadLifecycle(leadId, data.createdBy);
}

export async function onLeadUpdated(leadId: number, changes: any, userEmail?: string) {
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

export async function onClientCreated(clientId: number, data: any) {
  await triggerAutomation("client_created", {
    trigger: "client_created",
    entityType: "Client",
    entityId: clientId,
    data
  });
}
