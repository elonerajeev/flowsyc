import { prisma } from "../config/prisma";
import type { AccessActor } from "../utils/access-control";
import { getAuditLogs } from "../utils/audit";
import { teamsService } from "./teams.service";
import {
  getClientAccessEmail,
  getEmployeeAssigneeScope,
  getEmployeeProjectScope,
  getInvoiceClientLabels,
} from "../utils/access-control";

const pipelineColors = [
  { name: "Qualified", color: "hsl(211 38% 51%)" },
  { name: "Proposal", color: "hsl(213 43% 64%)" },
  { name: "Negotiation", color: "hsl(202 100% 88%)" },
  { name: "Closed Won", color: "hsl(173 58% 39%)" },
];

function formatRelativeTime(value: Date | string) {
  const timestamp = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return "Unknown";
  }

  const diffMs = Date.now() - timestamp.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60_000));

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function mapAuditCategory(entity: string) {
  switch (entity) {
    case "Client":
      return "sales" as const;
    case "Project":
      return "delivery" as const;
    case "Task":
    case "Note":
      return "collaboration" as const;
    case "Invoice":
      return "finance" as const;
    case "Candidate":
    case "JobPosting":
      return "hiring" as const;
    default:
      return "system" as const;
  }
}

function mapAuditType(action: string) {
  switch (action) {
    case "create":
      return "active" as const;
    case "update":
    case "stage_change":
    case "email_sent":
      return "in-progress" as const;
    case "delete":
    case "rejected":
      return "rejected" as const;
    default:
      return "completed" as const;
  }
}

function parseAmount(raw: string) {
  const numeric = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function buildHeatmap(timestamps: Date[]) {
  const activityByDate: Record<string, number> = {};

  for (const record of timestamps) {
    const date = record.toISOString().split("T")[0];
    activityByDate[date] = (activityByDate[date] ?? 0) + 1;
  }

  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    const dateStr = d.toISOString().split("T")[0];
    return { date: dateStr, count: activityByDate[dateStr] ?? 0 };
  });
}

async function buildStaffDashboard(actor?: AccessActor) {
  // Scope all queries to the actor's own resources (prevents cross-admin data leaks)
  const actorIds = actor ? [actor.email, actor.userId].filter(Boolean) as string[] : [];
  const clientWhere = actorIds.length > 0
    ? { deletedAt: null, OR: actorIds.map(id => ({ assignedTo: id })) } as const
    : { deletedAt: null } as const;
  const projectWhere = actorIds.length > 0
    ? { deletedAt: null, OR: actorIds.map(id => ({ createdBy: id })) } as const
    : { deletedAt: null } as const;
  const invoiceWhere = actorIds.length > 0
    ? { deletedAt: null, OR: actorIds.map(id => ({ createdBy: id })) } as const
    : { deletedAt: null } as const;

  const [
    clientCounts,
    projectCounts,
    taskCounts,
    invoices,
    members,
    auditLogs,
    teamAttendanceRows,
    managedTeams,
  ] = await Promise.all([
    prisma.client.groupBy({
      by: ["status"],
      where: clientWhere,
      _count: { _all: true },
    }),
    prisma.project.groupBy({
      by: ["status"],
      where: projectWhere,
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["column"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    prisma.invoice.findMany({
      where: invoiceWhere,
      orderBy: { createdAt: "asc" },
      select: { amount: true, createdAt: true, date: true },
      take: 500,
    }),
    prisma.teamMember.findMany({
      where: {
        deletedAt: null,
        attendance: {
          in: ["present", "remote", "late"],
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
      select: { id: true, name: true, designation: true, avatar: true, attendance: true, updatedAt: true },
    }),
    getAuditLogs(12),
    prisma.teamMember.groupBy({
      by: ["team", "attendance"],
      where: { deletedAt: null },
      _count: { _all: true },
    }),
    teamsService.list(),
  ]);

  const totalClients = clientCounts.reduce((sum, entry) => sum + entry._count._all, 0);
  const activeClients = clientCounts.find((entry) => entry.status === "active")?._count._all ?? 0;
  const pendingClients = clientCounts.find((entry) => entry.status === "pending")?._count._all ?? 0;

  const totalProjects = projectCounts.reduce((sum, entry) => sum + entry._count._all, 0);
  const activeProjects = projectCounts.find((entry) => entry.status === "active")?._count._all ?? 0;

  const totalTasks = taskCounts.reduce((sum, entry) => sum + entry._count._all, 0);
  const completedTasks = taskCounts.find((entry) => entry.column === "done")?._count._all ?? 0;

  const totalInvoiceRevenue = invoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0);

  const monthlyRevenue = invoices.reduce<Record<string, { revenue: number; deals: number; retention: number }>>(
    (acc, invoice) => {
      const invoiceDate = invoice.date ? new Date(invoice.date) : invoice.createdAt;
      const month = invoiceDate.toLocaleString("en-US", { month: "short" });
      acc[month] ??= { revenue: 0, deals: 0, retention: 0 };
      acc[month].revenue += parseAmount(invoice.amount);
      acc[month].deals += 1;
      acc[month].retention = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;
      return acc;
    },
    {},
  );

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const revenueSeries = months.map((month) => {
    const entry = monthlyRevenue[month];
    return {
      month,
      revenue: entry?.revenue ?? 0,
      deals: entry?.deals ?? 0,
      retention: entry?.retention ?? (totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0),
    };
  });

  const pipelineBreakdown = pipelineColors.map((entry) => {
    const value =
      entry.name === "Qualified"
        ? clientCounts.find((item) => item.status === "pending")?._count._all ?? 0
        : entry.name === "Proposal"
          ? clientCounts.find((item) => item.status === "active")?._count._all ?? 0
          : entry.name === "Negotiation"
            ? projectCounts.find((item) => item.status === "in_progress")?._count._all ?? 0
            : projectCounts.find((item) => item.status === "completed")?._count._all ?? 0;
    return { name: entry.name, value, color: entry.color };
  });

  const attendanceByTeam = new Map<string, { total: number; present: number }>();
  for (const row of teamAttendanceRows) {
    const teamName = row.team?.trim() || "General";
    const bucket = attendanceByTeam.get(teamName) ?? { total: 0, present: 0 };
    bucket.total += row._count._all;
    if (row.attendance === "present") {
      bucket.present += row._count._all;
    }
    attendanceByTeam.set(teamName, bucket);
  }

  const operatingCadence = managedTeams
    .map((team) => {
      const stats = attendanceByTeam.get(team.name) ?? { total: 0, present: 0 };
      const value = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
      return { name: team.name, value };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const executionReadiness =
    operatingCadence.length > 0
      ? Math.round(operatingCadence.reduce((sum, item) => sum + item.value, 0) / operatingCadence.length)
      : 0;
  const currentMonthRevenue = revenueSeries[revenueSeries.length - 1]?.revenue ?? 0;
  const previousMonthRevenue = revenueSeries[revenueSeries.length - 2]?.revenue ?? 0;
  const revenueGrowth = previousMonthRevenue > 0
    ? Math.round(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
    : 0;

  const unreadResult = await prisma.conversation.aggregate({
    where: { deletedAt: null },
    _sum: { unread: true },
  });
  const unreadMessages = unreadResult._sum.unread ?? 0;

  const twentyEightDaysAgo = new Date();
  twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 27);
  twentyEightDaysAgo.setHours(0, 0, 0, 0);

  const [recentTasks, recentClients, recentProjects, recentInvoices] = await Promise.all([
    prisma.task.findMany({ where: { createdAt: { gte: twentyEightDaysAgo }, deletedAt: null }, select: { createdAt: true }, take: 1000 }),
    prisma.client.findMany({ where: { ...clientWhere, createdAt: { gte: twentyEightDaysAgo } }, select: { createdAt: true }, take: 500 }),
    prisma.project.findMany({ where: { ...projectWhere, createdAt: { gte: twentyEightDaysAgo } }, select: { createdAt: true }, take: 500 }),
    prisma.invoice.findMany({ where: { ...invoiceWhere, createdAt: { gte: twentyEightDaysAgo } }, select: { createdAt: true }, take: 500 }),
  ]);

  const atRiskClients = await prisma.client.count({
    where: { ...clientWhere, healthScore: { lt: 70 } },
  });

  const priorityAccounts = await prisma.client.findMany({
    where: { ...clientWhere, status: "active" },
    orderBy: [{ tier: "asc" }, { healthScore: "desc" }],
    take: 3,
  });

  const atRiskAccountDetails = await prisma.client.findMany({
    where: { ...clientWhere, healthScore: { lt: 70 } },
    orderBy: { healthScore: "asc" },
    take: 5,
  });

  return {
    metrics: [
      {
        label: "Revenue Run Rate",
        value: totalInvoiceRevenue >= 1_000_000
          ? `$${(totalInvoiceRevenue / 1_000_000).toFixed(2)}M`
          : totalInvoiceRevenue >= 1_000
            ? `$${(totalInvoiceRevenue / 1_000).toFixed(1)}K`
            : totalInvoiceRevenue > 0
              ? `$${totalInvoiceRevenue}`
              : "No data",
        change: totalInvoiceRevenue > 0 ? `${revenueGrowth >= 0 ? "+" : ""}${revenueGrowth}%` : "—",
        direction: revenueGrowth >= 0 ? "up" as const : "down" as const,
        detail: totalInvoiceRevenue > 0 ? "from invoice ledger" : "No invoices yet",
      },
      {
        label: "Active Clients",
        value: totalClients > 0 ? String(activeClients) : "No data",
        change: totalClients > 0 ? `${pendingClients > 0 ? "+" : ""}${pendingClients}` : "—",
        direction: "up" as const,
        detail: totalClients > 0 ? "active accounts" : "No clients yet",
      },
      {
        label: "Pipeline Coverage",
        value: totalProjects > 0 && activeClients > 0
          ? `${Math.max(0.1, Math.round((activeClients / totalProjects) * 10) / 10)}x`
          : "No data",
        change: totalProjects > 0 ? `${activeProjects} active` : "—",
        direction: "up" as const,
        detail: totalProjects > 0 ? "against workload" : "No projects yet",
      },
      {
        label: "At-Risk Accounts",
        value: totalClients > 0 ? String(atRiskClients) : "No data",
        change: totalClients > 0 ? `${atRiskClients} accounts` : "—",
        direction: atRiskClients === 0 ? "up" as const : "down" as const,
        detail: totalClients > 0 ? "health score below 70" : "No clients yet",
      },
    ],
    revenueSeries,
    pipelineBreakdown,
    operatingCadence,
    activityFeed: auditLogs.data.map((log, index) => ({
      id: Number(log.id) || index + 1,
      text: log.detail?.trim() || `${log.userName} ${log.action.replace(/_/g, " ")} ${log.entity}`,
      time: formatRelativeTime(log.createdAt),
      type: mapAuditType(log.action),
      category: mapAuditCategory(log.entity),
      source: log.entity,
    })),
    todayFocus: [
      ...(activeProjects > 0 ? [`${activeProjects} active project${activeProjects === 1 ? "" : "s"} currently require delivery attention.`] : []),
      ...(pendingClients > 0 ? [`${pendingClients} client${pendingClients === 1 ? "" : "s"} remain in pending follow-up state.`] : []),
      ...(completedTasks > 0 ? [`${completedTasks} task${completedTasks === 1 ? "" : "s"} have already been completed.`] : []),
      ...(unreadMessages > 0 ? [`${unreadMessages} unread conversation update${unreadMessages === 1 ? "" : "s"} still need review.`] : []),
    ],
    executionReadiness,
    collaborators: members.map((member) => ({
      id: String(member.id),
      name: member.name,
      role: member.designation,
      avatar: member.avatar,
      status: member.attendance,
      lastSeen: member.updatedAt.toISOString(),
    })),
    focusClients: priorityAccounts,
    atRiskClients: atRiskAccountDetails,
    unreadMessages,
    activityHeatmap: buildHeatmap([
      ...recentTasks.map((entry) => entry.createdAt),
      ...recentClients.map((entry) => entry.createdAt),
      ...recentProjects.map((entry) => entry.createdAt),
      ...recentInvoices.map((entry) => entry.createdAt),
    ]),
  };
}

async function buildEmployeeDashboard(actor: AccessActor) {
  const [employeeAssignees, employeeProjectScopes] = await Promise.all([
    getEmployeeAssigneeScope(actor),
    getEmployeeProjectScope(actor),
  ]);

  const projectWhere =
    employeeProjectScopes || employeeAssignees
      ? {
          deletedAt: null,
          OR: [
            ...(employeeProjectScopes ? [{ team: { hasSome: employeeProjectScopes } }] : []),
            ...(employeeAssignees ? [{ tasks: { some: { deletedAt: null, assignee: { in: employeeAssignees } } } }] : []),
          ],
        }
      : {
          deletedAt: null,
          id: -1,
        };
  const taskWhere = {
    deletedAt: null,
    ...(employeeAssignees ? { assignee: { in: employeeAssignees } } : { id: -1 }),
  };

  const [projects, tasks, member] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true, progress: true, createdAt: true, updatedAt: true },
    }),
    prisma.task.findMany({
      where: taskWhere,
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, column: true, dueDate: true, priority: true, createdAt: true, updatedAt: true },
    }),
    prisma.teamMember.findFirst({
      where: { deletedAt: null, email: { equals: actor?.email, mode: "insensitive" } },
      select: { id: true, name: true, designation: true, avatar: true, attendance: true, updatedAt: true },
    }),
  ]);

  const activeProjects = projects.filter((project) => project.status === "active" || project.status === "in_progress").length;
  const completedTasks = tasks.filter((task) => task.column === "done").length;
  const inProgressTasks = tasks.filter((task) => task.column === "in_progress").length;
  const todoTasks = tasks.filter((task) => task.column === "todo").length;
  const overdueTasks = tasks.filter((task) => {
    const due = new Date(task.dueDate);
    return task.column !== "done" && !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
  }).length;
  const avgProjectProgress = projects.length > 0 ? Math.round(projects.reduce((sum, project) => sum + project.progress, 0) / projects.length) : 0;
  const taskCompletionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;
  const executionReadiness = Math.round((avgProjectProgress + taskCompletionRate) / 2);

  const activityFeed = [
    ...tasks.map((task) => ({
      id: task.id,
      text: `${task.title} is ${task.column.replace(/_/g, " ")}`,
      time: formatRelativeTime(task.updatedAt),
      type: task.column === "done" ? "completed" as const : task.column === "in_progress" ? "in-progress" as const : "active" as const,
      category: "collaboration" as const,
      source: "Task",
      updatedAt: task.updatedAt,
    })),
    ...projects.map((project) => ({
      id: project.id + 100_000,
      text: `${project.name} is ${project.status.replace(/_/g, " ")}`,
      time: formatRelativeTime(project.updatedAt),
      type: project.status === "completed" ? "completed" as const : project.status === "pending" ? "active" as const : "in-progress" as const,
      category: "delivery" as const,
      source: "Project",
      updatedAt: project.updatedAt,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 12)
    .map(({ updatedAt: _updatedAt, ...entry }) => entry);

  return {
    metrics: [
      {
        label: "Assigned Tasks",
        value: String(tasks.length),
        change: `${todoTasks} open`,
        direction: todoTasks > 0 ? "down" as const : "up" as const,
        detail: "visible to you",
      },
      {
        label: "In Progress",
        value: String(inProgressTasks),
        change: activeProjects > 0 ? `${activeProjects} project${activeProjects === 1 ? "" : "s"}` : "—",
        direction: "up" as const,
        detail: "current delivery load",
      },
      {
        label: "Completed",
        value: String(completedTasks),
        change: `${taskCompletionRate}%`,
        direction: "up" as const,
        detail: "task completion rate",
      },
      {
        label: "Assigned Projects",
        value: String(projects.length),
        change: overdueTasks > 0 ? `${overdueTasks} overdue` : "0 overdue",
        direction: overdueTasks > 0 ? "down" as const : "up" as const,
        detail: "scoped to your assignments",
      },
    ],
    revenueSeries: [],
    pipelineBreakdown: [],
    operatingCadence: [],
    activityFeed,
    todayFocus: [
      ...(activeProjects > 0 ? [`${activeProjects} assigned project${activeProjects === 1 ? "" : "s"} are currently active.`] : []),
      ...(todoTasks > 0 ? [`${todoTasks} task${todoTasks === 1 ? "" : "s"} are still waiting for action.`] : []),
      ...(overdueTasks > 0 ? [`${overdueTasks} task${overdueTasks === 1 ? "" : "s"} are overdue and need follow-up.`] : []),
      ...(completedTasks > 0 ? [`${completedTasks} task${completedTasks === 1 ? "" : "s"} have already been completed.`] : []),
    ],
    executionReadiness,
    collaborators: member && ["present", "remote", "late"].includes(member.attendance)
      ? [{
          id: String(member.id),
          name: member.name,
          role: member.designation,
          avatar: member.avatar,
          status: member.attendance,
          lastSeen: member.updatedAt.toISOString(),
        }]
      : [],
    focusClients: [],
    atRiskClients: [],
    unreadMessages: 0,
    activityHeatmap: buildHeatmap([
      ...tasks.map((task) => task.createdAt),
      ...projects.map((project) => project.createdAt),
    ]),
  };
}

async function buildClientDashboard(actor: AccessActor) {
  const clientEmail = await getClientAccessEmail(actor);
  const invoiceLabels = await getInvoiceClientLabels(actor);

  const [clients, invoices] = await Promise.all([
    prisma.client.findMany({
      where: {
        deletedAt: null,
        ...(clientEmail ? { email: { equals: clientEmail, mode: "insensitive" } } : { id: -1 }),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, status: true, createdAt: true, updatedAt: true },
    }),
    prisma.invoice.findMany({
      where: {
        deletedAt: null,
        ...(invoiceLabels && invoiceLabels.length > 0 ? { client: { in: invoiceLabels } } : { id: "__no_match__" }),
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, client: true, amount: true, due: true, status: true, createdAt: true, updatedAt: true },
    }),
  ]);

  const openInvoices = invoices.filter((invoice) => invoice.status !== "completed");
  const outstandingBalance = openInvoices.reduce((sum, invoice) => sum + parseAmount(invoice.amount), 0);
  const paidInvoices = invoices.filter((invoice) => invoice.status === "completed").length;
  const activeAccounts = clients.filter((client) => client.status === "active").length;
  const pendingAccounts = clients.filter((client) => client.status === "pending").length;
  const invoiceSettlementRate = invoices.length > 0 ? Math.round((paidInvoices / invoices.length) * 100) : 0;

  const activityFeed = [
    ...invoices.map((invoice, index) => ({
      id: index + 1,
      text: `${invoice.client} invoice is ${invoice.status.replace(/_/g, " ")}`,
      time: formatRelativeTime(invoice.updatedAt),
      type: invoice.status === "completed" ? "completed" as const : invoice.status === "pending" ? "active" as const : "in-progress" as const,
      category: "finance" as const,
      source: "Invoice",
      updatedAt: invoice.updatedAt,
    })),
    ...clients.map((client, index) => ({
      id: index + 50_000,
      text: `${client.name} account is ${client.status}`,
      time: formatRelativeTime(client.updatedAt),
      type: client.status === "completed" ? "completed" as const : client.status === "pending" ? "active" as const : "in-progress" as const,
      category: "sales" as const,
      source: "Client",
      updatedAt: client.updatedAt,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 12)
    .map(({ updatedAt: _updatedAt, ...entry }) => entry);

  return {
    metrics: [
      {
        label: "My Accounts",
        value: String(clients.length),
        change: `${activeAccounts} active`,
        direction: "up" as const,
        detail: "linked to your login",
      },
      {
        label: "Open Invoices",
        value: String(openInvoices.length),
        change: openInvoices.length > 0 ? `${pendingAccounts} pending account${pendingAccounts === 1 ? "" : "s"}` : "—",
        direction: openInvoices.length > 0 ? "down" as const : "up" as const,
        detail: "billing items needing review",
      },
      {
        label: "Outstanding Balance",
        value: outstandingBalance > 0 ? `$${outstandingBalance.toLocaleString()}` : "$0",
        change: `${paidInvoices} paid`,
        direction: outstandingBalance > 0 ? "down" as const : "up" as const,
        detail: "from your invoice records",
      },
      {
        label: "Invoice Status",
        value: invoices.length > 0 ? `${invoiceSettlementRate}%` : "No data",
        change: `${invoices.length} total`,
        direction: invoiceSettlementRate >= 50 ? "up" as const : "down" as const,
        detail: "settled invoices",
      },
    ],
    revenueSeries: [],
    pipelineBreakdown: [],
    operatingCadence: [],
    activityFeed,
    todayFocus: [
      ...(openInvoices.length > 0 ? [`${openInvoices.length} invoice${openInvoices.length === 1 ? "" : "s"} still need attention.`] : []),
      ...(outstandingBalance > 0 ? [`$${outstandingBalance.toLocaleString()} remains outstanding across your billing records.`] : []),
      ...(pendingAccounts > 0 ? [`${pendingAccounts} account${pendingAccounts === 1 ? "" : "s"} are still pending follow-up.`] : []),
      ...(paidInvoices > 0 ? [`${paidInvoices} invoice${paidInvoices === 1 ? "" : "s"} have already been completed.`] : []),
    ],
    executionReadiness: invoiceSettlementRate,
    collaborators: [],
    focusClients: [],
    atRiskClients: [],
    unreadMessages: 0,
    activityHeatmap: buildHeatmap([
      ...clients.map((client) => client.createdAt),
      ...invoices.map((invoice) => invoice.createdAt),
    ]),
  };
}

export const dashboardService = {
  async get(actor?: AccessActor) {
    if (actor?.role === "employee") {
      return buildEmployeeDashboard(actor);
    }

    if (actor?.role === "client") {
      return buildClientDashboard(actor);
    }

    return buildStaffDashboard(actor);
  },
};
