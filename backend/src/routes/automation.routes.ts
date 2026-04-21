import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";
import { prisma } from "../config/prisma";
import { automationService } from "../services/automation.service";
import { GTMAutomationService } from "../services/gtm-automation.service";
import { triggerAutomation, createScheduledJob, cancelScheduledJob } from "../services/automation-engine";
import { gtmLifecycleService } from "../services/gtm-lifecycle.service";

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
      orderBy: { priority: "desc" },
      include: {
        _count: {
          select: { logs: true }
        }
      }
    });
    res.json(rules);
  })
);

// Get single automation rule
router.get(
  "/rules/:id",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const rule = await prisma.automationRule.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        logs: {
          orderBy: { startedAt: "desc" },
          take: 10
        }
      }
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
  asyncHandler(async (req, res) => {
    const { name, description, trigger, conditions, actions, cronExpression, isActive, priority } = req.body;
    
    const rule = await prisma.automationRule.create({
      data: {
        name,
        description,
        trigger,
        conditions: conditions || [],
        actions: actions || [],
        cronExpression,
        isActive: isActive ?? true,
        priority: priority ?? 0,
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
  asyncHandler(async (req, res) => {
    const { name, description, conditions, actions, cronExpression, isActive, priority, status } = req.body;
    
    const rule = await prisma.automationRule.update({
      where: { id: Number(req.params.id) },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(conditions !== undefined && { conditions }),
        ...(actions !== undefined && { actions }),
        ...(cronExpression !== undefined && { cronExpression }),
        ...(isActive !== undefined && { isActive }),
        ...(priority !== undefined && { priority }),
        ...(status !== undefined && { status })
      }
    });
    
    res.json(rule);
  })
);

// Delete automation rule
router.delete(
  "/rules/:id",
  requireRole(["admin"]),
  asyncHandler(async (req, res) => {
    await prisma.automationRule.delete({
      where: { id: Number(req.params.id) }
    });
    res.status(204).end();
  })
);

// Toggle rule active/paused
router.post(
  "/rules/:id/toggle",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const rule = await prisma.automationRule.findUnique({
      where: { id: Number(req.params.id) }
    });
    
    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    
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
    const where: any = {};
    if (status && validStatuses.includes(status)) where.status = status;
    if (ruleId && !isNaN(ruleId)) where.ruleId = ruleId;
    if (entityType) where.entityType = entityType;
    
    // Fetch logs and filter by user's createdBy in triggerData
    const allLogs = await prisma.automationLog.findMany({
      where,
      orderBy: { startedAt: "desc" },
      include: {
        rule: { select: { name: true } }
      }
    });
    
    // Filter logs: show if createdBy matches user OR createdBy is null/system (shared automations)
    const userEmail = req.auth?.email;
    const filteredLogs = allLogs.filter((log: any) => {
      const triggerData = log.triggerData as any;
      const createdBy = triggerData?.data?.createdBy;
      // Show logs created by this user or system (null/undefined createdBy means system)
      return !createdBy || createdBy === userEmail || createdBy === "system";
    });
    
    const total = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);
    
    res.json({ logs: paginatedLogs, total, limit, offset });
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
      where,
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
    
    const result = await triggerAutomation(trigger, {
      entityType,
      entityId,
      ...data
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

// Get recent activities
router.get(
  "/activities",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 100);
    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId ? Number(req.query.entityId) : undefined;
    
    const where: any = { isVisible: true };
    if (entityType) where.entityType = entityType;
    if (entityId && !isNaN(entityId)) where.entityId = entityId;
    
    const activities = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit
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
    const lead = await prisma.lead.findUnique({
      where: { id: Number(req.params.leadId) }
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
    const leads = await prisma.lead.findMany();
    
    const results = [];
    for (const lead of leads) {
      const score = await GTMAutomationService.calculateLeadScore(lead.id);
      await GTMAutomationService.autoTagLead(lead.id);
      results.push({ leadId: lead.id, leadName: `${lead.firstName} ${lead.lastName}`, score });
    }
    
    res.json({ message: "Lead scores recalculated", count: results.length, results });
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
    const clients = await prisma.client.findMany();
    
    const results = [];
    for (const client of clients) {
      const health = await GTMAutomationService.calculateClientHealthScore(client.id);
      results.push({ clientId: client.id, clientName: client.name, health });
    }
    
    res.json({ message: "Client health scores recalculated", count: results.length, results });
  })
);

// Get cold leads
router.get(
  "/gtm/cold-leads",
  requireRole(["admin", "manager"]),
  asyncHandler(async (req, res) => {
    const days = Math.max(1, Math.min(90, Number(req.query.days) || 14));
    const coldLeads = await prisma.lead.findMany({
      where: {
        updatedAt: { lt: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
        tags: { has: "cold-lead" }
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
    const staleDeals = await prisma.deal.findMany({
      where: {
        updatedAt: { lt: cutoffDate },
        stage: { notIn: ["closed_won", "closed_lost"] }
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
    const clients = await prisma.client.findMany({
      where: {
        healthScore: { lt: threshold },
        status: "active"
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
