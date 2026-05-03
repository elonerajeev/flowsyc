import { Router } from "express";
import { Prisma } from "@prisma/client";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { asyncHandler } from "../utils/async-handler";
import { prisma } from "../config/prisma";
import { automationService } from "../services/automation.service";
import { GTMAutomationService } from "../services/gtm-automation.service";
import { triggerAutomation, createScheduledJob, cancelScheduledJob } from "../services/automation-engine";
import { gtmLifecycleService } from "../services/gtm-lifecycle.service";
import {
  automationTriggerValues,
  createScheduledJobSchema,
  createAutomationRuleSchema,
  updateAutomationRuleSchema,
} from "../validators/automation.schema";

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================
// ALERTS
// ============================================

// Get all alerts - filtered by user's entities
router.get(
  "/alerts",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const userEmail = req.auth?.email;
    const userRole = req.auth?.role;
    
    const alerts = await automationService.checkAllAlerts(userEmail, userRole);
    res.json(alerts);
  })
);

// Get alerts summary
router.get(
  "/alerts/summary",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const userEmail = req.auth?.email;
    const userRole = req.auth?.role;
    const summary = await automationService.getAlertsSummary(userEmail, userRole);
    res.json(summary);
  })
);

// ============================================
// AUTOMATION RULES
// ============================================

// List all automation rules
router.get(
  "/rules",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const rules = await prisma.automationRule.findMany({
      where: { createdBy: req.auth?.email },
      orderBy: { priority: "desc" },
      include: { _count: { select: { logs: true } } }
    });
    res.json(rules);
  })
);

// Get single automation rule
router.get(
  "/rules/:id",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const rule = await prisma.automationRule.findFirst({
      where: { id: Number(req.params.id), createdBy: req.auth?.email },
      include: { logs: { orderBy: { startedAt: "desc" }, take: 10 } }
    });
    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    res.json(rule);
  })
);

// Create automation rule
router.post(
  "/rules",
  requireRole(["admin", "manager"]),
  validateBody(createAutomationRuleSchema),
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      trigger,
      conditions,
      actions,
      cronExpression,
      isActive,
      priority,
      status,
      maxRunsPerDay,
    } = req.body;
    
    const rule = await prisma.automationRule.create({
      data: {
        name,
        description,
        trigger,
        conditions,
        actions,
        cronExpression,
        isActive,
        status,
        priority,
        maxRunsPerDay,
        createdBy: req.auth?.email
      }
    });
    
    res.status(201).json(rule);
  })
);

// Update automation rule
router.patch(
  "/rules/:id",
  requireRole(["admin", "manager"]),
  validateBody(updateAutomationRuleSchema),
  asyncHandler(async (req, res) => {
    const {
      name,
      description,
      trigger,
      conditions,
      actions,
      cronExpression,
      isActive,
      priority,
      status,
      maxRunsPerDay,
    } = req.body;
    
    const rule = await prisma.automationRule.updateMany({
      where: { id: Number(req.params.id), createdBy: req.auth?.email },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(trigger !== undefined && { trigger }),
        ...(conditions !== undefined && { conditions }),
        ...(actions !== undefined && { actions }),
        ...(cronExpression !== undefined && { cronExpression }),
        ...(isActive !== undefined && { isActive }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status }),
        ...(maxRunsPerDay !== undefined && { maxRunsPerDay }),
      }
    });
    if (rule.count === 0) { res.status(404).json({ error: "Rule not found" }); return; }
    const updated = await prisma.automationRule.findFirst({ where: { id: Number(req.params.id) } });
    res.json(updated);
  })
);

// Delete automation rule
router.delete(
  "/rules/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    const r = await prisma.automationRule.deleteMany({
      where: { id: Number(req.params.id), createdBy: req.auth?.email }
    });
    if (r.count === 0) { res.status(404).json({ error: "Rule not found" }); return; }
    res.status(204).end();
  })
);

// Toggle rule active/paused
router.post(
  "/rules/:id/toggle",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const rule = await prisma.automationRule.findFirst({
      where: { id: Number(req.params.id), createdBy: req.auth?.email }
    });
    if (!rule) { res.status(404).json({ error: "Rule not found" }); return; }
    const updated = await prisma.automationRule.update({
      where: { id: Number(req.params.id) },
      data: { isActive: !rule.isActive }
    });
    res.json(updated);
  })
);

// ============================================
// AUTOMATION LOGS
// ============================================

// Get automation logs
router.get(
  "/logs",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 100);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const status = req.query.status as string | undefined;
    const ruleId = req.query.ruleId ? Number(req.query.ruleId) : undefined;
    const entityType = req.query.entityType as string | undefined;
    
    const validStatuses = ["pending", "running", "completed", "failed", "cancelled"];
    const where: Prisma.AutomationLogWhereInput = {};
    if (status && validStatuses.includes(status)) where.status = status as Prisma.AutomationLogWhereInput["status"];
    if (ruleId && !isNaN(ruleId)) where.ruleId = ruleId;
    if (entityType) where.entityType = entityType;

    // Get rules created by this admin and include their logs
    const userEmail = req.auth?.email;
    if (userEmail) {
      const userRules = await prisma.automationRule.findMany({
        where: { createdBy: userEmail },
        select: { id: true }
      });
      const userRuleIds = userRules.map(r => r.id);
      
      // Include logs from user's rules OR rules without creator (system/global)
      where.OR = [
        { ruleId: { in: userRuleIds } },
        { rule: { createdBy: null } }  // Legacy rules without owner
      ];
    }

    const [logs, total] = await prisma.$transaction([
      prisma.automationLog.findMany({
        where,
        orderBy: [{ startedAt: "desc" }, { id: "desc" }],
        include: {
          rule: { select: { name: true, createdBy: true } },
        },
        take: limit,
        skip: offset,
      }),
      prisma.automationLog.count({ where }),
    ]);
    
    res.json({ logs, total, limit, offset });
  })
);

// Get logs for specific rule
router.get(
  "/rules/:ruleId/logs",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const { limit = 20 } = req.query;
    
    const logs = await prisma.automationLog.findMany({
      where: { ruleId: Number(req.params.ruleId) },
      orderBy: { startedAt: "desc" },
      take: Number(limit)
    });
    
    res.json(logs);
  })
);

// ============================================
// SCHEDULED JOBS
// ============================================

// List scheduled jobs
router.get(
  "/scheduled",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const status = req.query.status as string | undefined;
    const where: any = {};
    
    if (status && ["pending", "completed", "failed", "cancelled"].includes(status)) {
      where.status = status;
    }
    
    const jobs = await prisma.scheduledJob.findMany({
      where: { ...where, createdBy: req.auth?.email },
      orderBy: { scheduledFor: "desc" },
      take: 200,
    });
    res.json(jobs);
  })
);

// Create scheduled job
router.post(
  "/scheduled",
  requireRole(["admin", "manager"]),
  validateBody(createScheduledJobSchema),
  asyncHandler(async (req, res) => {
    const { jobType, name, description, scheduledFor, cronExpression, payload, isRecurring, entityType, entityId } = req.body;
    
    const job = await createScheduledJob({
      jobType,
      name,
      description,
      scheduledFor: new Date(scheduledFor),
      cronExpression,
      payload,
      isRecurring,
      entityType,
      entityId,
      createdBy: req.auth?.email
    });
    
    res.status(201).json(job);
  })
);

// Cancel scheduled job
router.delete(
  "/scheduled/:id",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    await cancelScheduledJob(Number(req.params.id));
    res.status(204).end();
  })
);

// ============================================
// MANUAL TRIGGER
// ============================================

// Manually trigger automation for an entity
router.post(
  "/trigger",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const { trigger, entityType, entityId, data } = req.body;
    if (
      typeof trigger !== "string" ||
      !automationTriggerValues.includes(trigger as (typeof automationTriggerValues)[number])
    ) {
      res.status(400).json({ error: "Invalid trigger type" });
      return;
    }
    const normalizedTrigger = trigger as (typeof automationTriggerValues)[number];
    
    const result = await triggerAutomation(normalizedTrigger, {
      trigger: normalizedTrigger,
      entityType,
      entityId,
      data: data && typeof data === "object" ? data : {}
    });
    
    res.json({
      triggered: true,
      rulesMatched: result.matchedRules,
      actionsExecuted: result.actions.length,
      result
    });
  })
);

// ============================================
// EMAIL QUEUE
// ============================================

// Get email queue status
router.get(
  "/email-queue",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const stats = await prisma.emailQueue.groupBy({
      by: ["status"],
      _count: { id: true }
    });
    res.json(stats);
  })
);

// ============================================
// ACTIVITY LOG
// ============================================

// Get recent activities — scoped to the requesting user
router.get(
  "/activities",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 100);
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId ? Number(req.query.entityId) : undefined;

    const actorIds = [req.auth?.email, req.auth?.userId].filter(Boolean) as string[];
    const where: any = {
      isVisible: true,
      ...(actorIds.length > 0 ? { performedBy: { in: actorIds } } : {}),
    };
    if (entityType) where.entityType = entityType;
    if (entityId && !isNaN(entityId)) where.entityId = entityId;

    const activities = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json(activities);
  })
);

// ============================================
// STATS
// ============================================

// Get automation stats
router.get(
  "/stats",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      activeRules,
      totalLogs,
      pendingJobs,
      failedToday,
      completedToday,
      sentToday
    ] = await Promise.all([
      prisma.automationRule.count({ where: { isActive: true } }),
      prisma.automationLog.count(),
      prisma.scheduledJob.count({ where: { status: "pending" } }),
      prisma.automationLog.count({
        where: {
          status: "failed",
          startedAt: { gte: today }
        }
      }),
      prisma.automationLog.count({
        where: {
          status: "completed",
          completedAt: { gte: today }
        }
      }),
      prisma.emailQueue.count({
        where: {
          status: "sent",
          sentAt: { gte: today }
        }
      })
    ]);
    
    res.json({
      activeRules,
      totalLogs,
      pendingJobs,
      failedToday,
      completedToday,
      sentToday,
      alertsSummary: await automationService.getAlertsSummary()
    });
  })
);

// ============================================
// GTM AUTOMATION FEATURES
// ============================================

router.get(
  "/gtm/overview",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const overview = await gtmLifecycleService.getOverview(req.auth);
    res.json(overview);
  }),
);

// Get lead score
router.get(
  "/gtm/lead-score/:leadId",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const actorIds = [req.auth?.email, req.auth?.userId].filter(Boolean) as string[];
    const lead = await prisma.lead.findFirst({
      where: {
        id: Number(req.params.leadId),
        deletedAt: null,
        ...(actorIds.length > 0 ? { assignedTo: { in: actorIds } } : {}),
      }
    });

    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }

    const score = await GTMAutomationService.calculateLeadScore(lead.id);
    res.json({ leadId: lead.id, leadName: `${lead.firstName} ${lead.lastName}`, score });
  })
);

// Recalculate all lead scores
router.post(
  "/gtm/recalculate-lead-scores",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 100), 200);
    const afterId = Number(req.query.afterId);
    const actorIds = [req.auth?.email, req.auth?.userId].filter(Boolean) as string[];
    const leads = await prisma.lead.findMany({
      where: actorIds.length > 0
        ? {
            assignedTo: { in: actorIds },
            deletedAt: null,
            ...(Number.isFinite(afterId) && afterId > 0 ? { id: { gt: afterId } } : {}),
          }
        : {
            deletedAt: null,
            ...(Number.isFinite(afterId) && afterId > 0 ? { id: { gt: afterId } } : {}),
          },
      orderBy: { id: "asc" },
      take: limit,
    });
    
    const results: Array<{ leadId: number; leadName: string; score: { score: number; breakdown: Record<string, number> } }> = [];
    for (const lead of leads) {
      const score = await GTMAutomationService.calculateLeadScore(lead.id);
      await GTMAutomationService.autoTagLead(lead.id);
      results.push({ leadId: lead.id, leadName: `${lead.firstName} ${lead.lastName}`, score });
    }

    const nextAfterId = leads.length === limit ? leads[leads.length - 1]?.id ?? null : null;
    
    res.json({
      message: "Lead scores recalculated",
      count: results.length,
      hasMore: nextAfterId !== null,
      nextAfterId,
      results,
    });
  })
);

// Get client health score
router.get(
  "/gtm/client-health/:clientId",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const client = await prisma.client.findUnique({
      where: { id: Number(req.params.clientId) }
    });
    
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    
    const health = await GTMAutomationService.calculateClientHealthScore(client.id);
    res.json({ clientId: client.id, clientName: client.name, health });
  })
);

// Recalculate all client health scores
router.post(
  "/gtm/recalculate-client-health",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 100), 200);
    const afterId = Number(req.query.afterId);
    const actorIds = [req.auth?.email, req.auth?.userId].filter(Boolean) as string[];
    const clients = await prisma.client.findMany({
      where: actorIds.length > 0
        ? {
            assignedTo: { in: actorIds },
            deletedAt: null,
            ...(Number.isFinite(afterId) && afterId > 0 ? { id: { gt: afterId } } : {}),
          }
        : {
            deletedAt: null,
            ...(Number.isFinite(afterId) && afterId > 0 ? { id: { gt: afterId } } : {}),
          },
      orderBy: { id: "asc" },
      take: limit,
    });
    
    const results: Array<{ clientId: number; clientName: string; health: { score: number; grade: string; breakdown: Record<string, number> } }> = [];
    for (const client of clients) {
      const health = await GTMAutomationService.calculateClientHealthScore(client.id);
      results.push({ clientId: client.id, clientName: client.name, health });
    }

    const nextAfterId = clients.length === limit ? clients[clients.length - 1]?.id ?? null : null;
    
    res.json({
      message: "Client health scores recalculated",
      count: results.length,
      hasMore: nextAfterId !== null,
      nextAfterId,
      results,
    });
  })
);

// Get cold leads
router.get(
  "/gtm/cold-leads",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const days = Math.max(1, Math.min(90, Number(req.query.days) || 14));
    const actorIds = [req.auth?.email, req.auth?.userId].filter(Boolean) as string[];
    const coldLeads = await prisma.lead.findMany({
      where: {
        updatedAt: { lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        tags: { has: "cold-lead" },
        ...(actorIds.length > 0 ? { assignedTo: { in: actorIds } } : {}),
      }
    });
    res.json({ days, count: coldLeads.length, leads: coldLeads.map(l => ({ id: l.id, name: `${l.firstName} ${l.lastName}`, company: l.company })) });
  })
);

// Get stale deals
router.get(
  "/gtm/stale-deals",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const days = Math.max(1, Math.min(90, Number(req.query.days) || 7));
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const actorIds = [req.auth?.email, req.auth?.userId].filter(Boolean) as string[];
    const staleDeals = await prisma.deal.findMany({
      where: {
        updatedAt: { lt: cutoffDate },
        stage: { notIn: ["closed_won", "closed_lost"] },
        ...(actorIds.length > 0 ? { createdBy: { in: actorIds } } : {}),
      }
    });
    res.json({ days, count: staleDeals.length, deals: staleDeals });
  })
);

// Get churn risk clients
router.get(
  "/gtm/churn-risk",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const threshold = Math.max(0, Math.min(100, Number(req.query.threshold) || 50));
    const actorIds = [req.auth?.email, req.auth?.userId].filter(Boolean) as string[];
    const clients = await prisma.client.findMany({
      where: {
        healthScore: { lt: threshold },
        status: "active",
        ...(actorIds.length > 0 ? { assignedTo: { in: actorIds } } : {}),
      }
    });

    res.json({ threshold, count: clients.length, clients: clients.map(c => ({ id: c.id, name: c.name, healthScore: c.healthScore, healthGrade: c.healthGrade })) });
  })
);

// Create follow-up sequence for a lead
router.post(
  "/gtm/followup-sequence/:leadId",
  requireRole(["admin", "manager", "employee"]),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: Number(req.params.leadId) }
    });
    
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    
    await GTMAutomationService.createFollowUpReminders(lead.id, req.auth?.email || "system");
    res.json({ message: "Follow-up sequence created", leadId: lead.id });
  })
);

// Assign lead to best rep
router.post(
  "/gtm/assign-lead/:leadId",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: Number(req.params.leadId) }
    });
    
    if (!lead) {
      res.status(404).json({ error: "Lead not found" });
      return;
    }
    
    const assignment = await GTMAutomationService.assignLeadToBestRep(lead.id);
    
    if (!assignment.assigned) {
      res.status(404).json({ error: "No available team members found" });
      return;
    }
    
    res.json({ message: "Lead assigned", leadId: lead.id, assignment });
  })
);

// Create renewal reminders
router.post(
  "/gtm/create-renewal-reminders",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const count = await GTMAutomationService.createRenewalReminders();
    res.json({ message: "Renewal reminders created", count });
  })
);

// ============================================
// ALERTS (Additional)
// ============================================

// Get alerts by type
router.get(
  "/alerts/:type",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const validTypes = ["health_warning", "churn_risk", "stale_deal", "escalation", "renewal_reminder", "custom"];
    const type = req.params.type as string;
    
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: "Invalid alert type" });
      return;
    }
    
    const alerts = await prisma.alert.findMany({
      where: { type: type as any },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    res.json(alerts);
  })
);

// Dismiss alert (mark as resolved)
router.patch(
  "/alerts/:id/dismiss",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const alert = await prisma.alert.update({
      where: { id: Number(req.params.id) },
      data: { 
        isResolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.auth?.email
      }
    });
    
    res.json(alert);
  })
);

export const automationRouter = router;
