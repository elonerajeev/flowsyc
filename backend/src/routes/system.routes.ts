import type { Request, Response } from "express";
import { Router } from "express";

import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth.middleware";
import { systemService } from "../services/system.service";
import { getAuditLogs } from "../utils/audit";
import { asyncHandler } from "../utils/async-handler";

const systemRouter = Router();

systemRouter.get("/theme-previews", (_req: Request, res: Response) => {
  res.status(200).json(systemService.getThemePreviews());
});

// GET /system/integrations - get user's integration states
systemRouter.get("/integrations", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const rows = await (prisma as any).integration.findMany({ where: { userId: req.auth!.userId } });
    res.status(200).json({ data: rows });
  } catch {
    // Table may not exist yet - return empty
    res.status(200).json({ data: [] });
  }
}));

// PATCH /system/integrations/:id - connect/disconnect/update integration
systemRouter.patch("/integrations/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, config, name } = req.body;
    const existing = await (prisma as any).integration.findFirst({ where: { id, userId: req.auth!.userId } });

    if (existing) {
      const updated = await (prisma as any).integration.update({
        where: { id },
        data: {
          ...(status !== undefined && { status }),
          ...(config !== undefined && { config }),
          ...(status === "connected" && { connectedAt: new Date() }),
          updatedAt: new Date(),
        },
      });
      res.status(200).json(updated);
    } else {
      const created = await (prisma as any).integration.create({
        data: {
          id,
          userId: req.auth!.userId,
          name: name ?? id,
          status: status ?? "disconnected",
          config: config ?? {},
          ...(status === "connected" && { connectedAt: new Date() }),
          updatedAt: new Date(),
        },
      });
      res.status(201).json(created);
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to persist integration", details: error instanceof Error ? error.message : "Unknown error" });
  }
}));

// POST /system/integrations/slack/test - send a test message to the configured Slack webhook
systemRouter.post("/integrations/slack/test", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { webhookUrl } = req.body as { webhookUrl?: string };
  if (!webhookUrl || !webhookUrl.startsWith("https://hooks.slack.com/")) {
    res.status(400).json({ error: "Invalid Slack webhook URL. Must start with https://hooks.slack.com/" });
    return;
  }
  const payload = {
    text: "",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: ":white_check_mark: *CRM Integration Test*\nYour Slack integration is working correctly! You'll receive notifications here for key CRM events.",
        },
      },
      {
        type: "context",
        elements: [{ type: "mrkdwn", text: `Sent from *Focal Point CRM* · ${new Date().toLocaleString()}` }],
      },
    ],
  };
  const slackRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!slackRes.ok) {
    const text = await slackRes.text();
    res.status(502).json({ error: "Slack rejected the request", detail: text });
    return;
  }
  res.status(200).json({ ok: true });
}));

// POST /system/integrations/zapier/test - send a test event to the configured Zapier webhook
systemRouter.post("/integrations/zapier/test", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { webhookUrl } = req.body as { webhookUrl?: string };
  if (!webhookUrl || !webhookUrl.startsWith("https://hooks.zapier.com/")) {
    res.status(400).json({ error: "Invalid Zapier webhook URL. Must start with https://hooks.zapier.com/" });
    return;
  }
  const payload = {
    event: "test",
    timestamp: new Date().toISOString(),
    source: "Focal Point CRM",
    data: {
      message: "Your Zapier integration is working correctly! You'll receive notifications here for key CRM events.",
      test: true,
    },
  };
  const zapierRes = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!zapierRes.ok) {
    const text = await zapierRes.text();
    res.status(502).json({ error: "Zapier rejected the request", detail: text });
    return;
  }
  res.status(200).json({ ok: true });
}));

systemRouter.get("/search", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const query = String(req.query.q ?? "").trim();
  const category = req.query.category ? String(req.query.category).trim() : undefined;
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20) || 20));
  const { searchService } = await import("../services/search.service");
  const results = await searchService.global(query, limit, category);
  res.status(200).json({ data: results });
}));

// Export endpoints
systemRouter.get("/export/clients/csv", requireAuth, requireRole(["admin", "manager"]), asyncHandler(async (req: Request, res: Response) => {
  const { clientsService } = await import("../services/clients.service");
  const result = await clientsService.list({ page: 1, limit: 10000, sort: "createdAt", order: "desc" }, req.auth);
  const csv = [
    "ID,Name,Email,Company,Industry,Status,Tier,Revenue,Health Score,Next Action",
    ...result.data.map((c: any) => `${c.id},"${c.name}","${c.email}","${c.company}","${c.industry}","${c.status}","${c.tier}","${c.revenue}",${c.healthScore},"${c.nextAction}"`)
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=clients.csv");
  res.status(200).send(csv);
}));

systemRouter.get("/export/invoices/csv", requireAuth, requireRole(["admin", "manager"]), asyncHandler(async (req: Request, res: Response) => {
  const { invoicesService } = await import("../services/invoices.service");
  const result = await invoicesService.list({ page: 1, limit: 10000 }, req.auth);
  const csv = [
    "ID,Client,Amount,Date,Due,Status",
    ...result.data.map((i: any) => `${i.id},"${i.client}","${i.amount}","${i.date}","${i.due}","${i.status}"`)
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=invoices.csv");
  res.status(200).send(csv);
}));

systemRouter.get("/export/payroll/csv", requireAuth, requireRole(["admin", "manager"]), asyncHandler(async (req: Request, res: Response) => {
  const { payrollService } = await import("../services/payroll.service");
  const result = await payrollService.list(req.auth);
  const csv = [
    "ID,Employee,Month,Year,Base Salary,Allowances,Deductions,Net Salary,Status",
    ...result.map((p: any) => `${p.id},"${p.employee}","${p.month}",${p.year},${p.baseSalary},${p.allowances},${p.deductions},${p.netSalary},"${p.status}"`)
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=payroll.csv");
  res.status(200).send(csv);
}));

systemRouter.get("/export/tasks/csv", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res: Response) => {
  const { tasksService } = await import("../services/tasks.service");
  const result = await tasksService.list({ page: 1, limit: 10000, column: undefined }, req.auth);
  const allTasks = [...result.todo, ...result["in-progress"], ...result.done];
  const csv = [
    "ID,Title,Assignee,Priority,Due Date,Tags,Value Stream,Status",
    ...allTasks.map((t: any) => `${t.id},"${t.title}","${t.assignee}","${t.priority}","${t.dueDate}","${t.tags.join('; ')}","${t.valueStream}","${t.column}"`)
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=tasks.csv");
  res.status(200).send(csv);
}));

systemRouter.get("/export/projects/csv", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res: Response) => {
  const { projectsService } = await import("../services/projects.service");
  const result = await projectsService.list({ page: 1, limit: 10000 }, req.auth);
  const csv = [
    "ID,Name,Status,Stage,Progress,Budget,Tasks Done,Tasks Total,Team,Due Date",
    ...result.data.map((p: any) => `${p.id},"${p.name}","${p.status}","${p.stage}",${p.progress},"${p.budget}",${p.tasksDone},${p.tasksTotal},"${p.team.join('; ')}","${p.dueDate}"`)
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=projects.csv");
  res.status(200).send(csv);
}));

systemRouter.get("/export/team-members/csv", requireAuth, requireRole(["admin", "manager"]), asyncHandler(async (req: Request, res: Response) => {
  const { teamMembersService } = await import("../services/team-members.service");
  const result = await teamMembersService.list({ page: 1, limit: 10000 });
  const csv = [
    "ID,Name,Email,Department,Designation,Team,Status,Role",
    ...result.data.map((m: any) => `${m.id},"${m.name}","${m.email}","${m.department}","${m.designation}","${m.team}","${m.status}","${m.role}"`)
  ].join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=team-members.csv");
  res.status(200).send(csv);
}));

systemRouter.get("/audit", requireAuth, requireRole(["admin", "manager", "employee"]), asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 100) || 100));
  const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);
  const search = String(req.query.search ?? "").trim();
  const action = String(req.query.action ?? "").trim();
  const entity = String(req.query.entity ?? "").trim();
  const dateFrom = req.query.dateFrom ? String(req.query.dateFrom).trim() : undefined;
  const dateTo = req.query.dateTo ? String(req.query.dateTo).trim() : undefined;
  const logs = await getAuditLogs({
    limit,
    offset,
    search,
    action,
    entity,
    dateFrom,
    dateTo,
    userId: req.auth?.userId,
    role: req.auth?.role
  });
  res.status(200).json(logs);
}));

export { systemRouter };
