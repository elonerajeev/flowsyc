import { prisma } from "../config/prisma";
import type { AccessActor } from "../utils/access-control";

type ReportRecord = {
  title: string;
  description: string;
  date: string;
  type: string;
  gradient: string;
  details?: ReportDetail;
};

type ReportDetail = {
  metrics: Array<{ label: string; value: string; sub?: string }>;
  rows: Array<{ label: string; value: string; badge?: string }>;
};

type MonthlyTrend = {
  month: string;
  revenue: number;
  clients: number;
  projects: number;
  candidates: number;
};

const REPORT_SNAPSHOT_LIMIT = 600;
const ANALYTICS_SNAPSHOT_LIMIT = 1200;
const REPORT_MONTH_WINDOW = 18;
const ANALYTICS_MONTH_WINDOW = 12;

function formatMonthRange(dates: Date[]) {
  if (!dates.length) return "No activity yet";
  const first = dates[0];
  const last = dates[dates.length - 1];
  const firstLabel = first.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const lastLabel = last.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return firstLabel === lastLabel ? firstLabel : `${firstLabel} to ${lastLabel}`;
}

function buildActorFilter(actor?: AccessActor) {
  if (!actor || actor.role === "employee") return {};
  const actorIds = [actor.email, actor.userId].filter(Boolean) as string[];
  return actorIds.length > 0 ? { createdBy: { in: actorIds } } : {};
}

function buildClientActorFilter(actor?: AccessActor) {
  if (!actor) return {};
  const actorIds = [actor.email, actor.userId].filter(Boolean) as string[];
  return actorIds.length > 0 ? { assignedTo: { in: actorIds } } : {};
}

function parseCurrency(value: unknown): number {
  const parsed = Number(String(value ?? "0").replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function subtractMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

function monthKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function buildMonthlyTrendSkeleton(windowMonths: number): { key: string; value: MonthlyTrend }[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (windowMonths - 1), 1);

  const rows: { key: string; value: MonthlyTrend }[] = [];
  for (let index = 0; index < windowMonths; index += 1) {
    const monthDate = new Date(start.getFullYear(), start.getMonth() + index, 1);
    rows.push({
      key: monthKey(monthDate),
      value: {
        month: monthDate.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        revenue: 0,
        clients: 0,
        projects: 0,
        candidates: 0,
      },
    });
  }

  return rows;
}

function safeAverage(total: number, count: number) {
  if (count <= 0) return 0;
  return Math.round(total / count);
}

export const reportsService = {
  async list(actor?: AccessActor) {
    const actorFilter = buildActorFilter(actor);
    const clientActorFilter = buildClientActorFilter(actor);
    const reportSince = subtractMonths(new Date(), REPORT_MONTH_WINDOW);

    const [invoices, clients, projects, teamMembers] = await Promise.all([
      prisma.invoice.findMany({
        where: { deletedAt: null, ...actorFilter, createdAt: { gte: reportSince } },
        select: { amount: true, createdAt: true, client: true, status: true, due: true },
        orderBy: { createdAt: "desc" },
        take: REPORT_SNAPSHOT_LIMIT,
      }),
      prisma.client.findMany({
        where: { deletedAt: null, ...clientActorFilter, createdAt: { gte: reportSince } },
        select: { name: true, status: true, tier: true, healthScore: true, revenue: true, industry: true },
        orderBy: { createdAt: "desc" },
        take: REPORT_SNAPSHOT_LIMIT,
      }),
      prisma.project.findMany({
        where: { deletedAt: null, ...actorFilter, createdAt: { gte: reportSince } },
        select: { name: true, status: true, progress: true, stage: true, budget: true },
        orderBy: { createdAt: "desc" },
        take: REPORT_SNAPSHOT_LIMIT,
      }),
      prisma.teamMember.findMany({
        where: { deletedAt: null },
        select: { name: true, attendance: true, department: true, role: true, designation: true },
        orderBy: { createdAt: "desc" },
        take: REPORT_SNAPSHOT_LIMIT,
      }),
    ]);

    const totalInvoiceAmount = invoices.reduce((sum, inv) => sum + parseCurrency(inv.amount), 0);

    const activeClients = clients.filter((client) => client.status === "active");
    const enterpriseClients = clients.filter((client) => client.tier === "Enterprise").length;
    const growthClients = clients.filter((client) => client.tier === "Growth").length;
    const strategicClients = clients.filter((client) => client.tier === "Strategic").length;
    const activeProjects = projects.filter((project) => project.status === "active" || project.status === "in_progress").length;
    const completedProjects = projects.filter((project) => project.status === "completed").length;
    const presentMembers = teamMembers.filter((member) => member.attendance === "present").length;
    const remoteMembers = teamMembers.filter((member) => member.attendance === "remote").length;
    const absentMembers = teamMembers.filter((member) => member.attendance === "absent").length;
    const lateMembers = teamMembers.filter((member) => member.attendance === "late").length;

    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const invoiceDates = invoices
      .map((invoice) => invoice.createdAt)
      .sort((a, b) => a.getTime() - b.getTime());
    const completedInvoices = invoices.filter((invoice) => invoice.status === "completed");
    const pendingInvoices = invoices.filter((invoice) => invoice.status === "pending");
    const avgHealth = safeAverage(
      clients.reduce((sum, client) => sum + (client.healthScore ?? 0), 0),
      clients.length,
    );

    const reports: ReportRecord[] = [
      {
        title: "Revenue Summary",
        description: `Recent invoiced revenue is $${Math.round(totalInvoiceAmount).toLocaleString()} across ${invoices.length} invoices.`,
        date: formatMonthRange(invoiceDates),
        type: "Financial",
        gradient: "from-success/18 via-success/6 to-transparent",
        details: {
          metrics: [
            { label: "Total Revenue", value: `$${Math.round(totalInvoiceAmount).toLocaleString()}`, sub: "Recent snapshot" },
            { label: "Collected", value: `$${completedInvoices.reduce((sum, invoice) => sum + parseCurrency(invoice.amount), 0).toLocaleString()}`, sub: `${completedInvoices.length} paid` },
            { label: "Outstanding", value: `$${pendingInvoices.reduce((sum, invoice) => sum + parseCurrency(invoice.amount), 0).toLocaleString()}`, sub: `${pendingInvoices.length} pending` },
            { label: "Invoices", value: String(invoices.length), sub: `Last ${REPORT_MONTH_WINDOW} months` },
          ],
          rows: invoices.slice(0, 8).map((invoice) => ({
            label: invoice.client,
            value: `$${parseCurrency(invoice.amount).toLocaleString()}`,
            badge: invoice.status,
          })),
        },
      },
      {
        title: "Active Client Report",
        description: `${activeClients.length} active clients, including ${enterpriseClients} enterprise, ${growthClients} growth, and ${strategicClients} strategic accounts.`,
        date: today,
        type: "Sales",
        gradient: "from-accent/18 via-accent/8 to-transparent",
        details: {
          metrics: [
            { label: "Clients", value: String(clients.length), sub: `Last ${REPORT_MONTH_WINDOW} months` },
            { label: "Active", value: String(activeClients.length), sub: "Currently active" },
            { label: "Avg Health Score", value: `${avgHealth}%`, sub: "Portfolio health" },
            { label: "Enterprise", value: String(enterpriseClients), sub: "Top tier" },
          ],
          rows: clients.slice(0, 8).map((client) => ({
            label: client.name,
            value: client.revenue ?? "$0",
            badge: client.status,
          })),
        },
      },
      {
        title: "Project Delivery Report",
        description: `${activeProjects} projects are active and ${completedProjects} are already complete.`,
        date: today,
        type: "Operations",
        gradient: "from-primary/18 via-primary/8 to-transparent",
        details: {
          metrics: [
            { label: "Projects", value: String(projects.length), sub: `Last ${REPORT_MONTH_WINDOW} months` },
            { label: "Active", value: String(activeProjects), sub: "In progress" },
            { label: "Completed", value: String(completedProjects), sub: "Delivered" },
            {
              label: "Avg Progress",
              value: projects.length ? `${safeAverage(projects.reduce((sum, project) => sum + project.progress, 0), projects.length)}%` : "0%",
              sub: "Across snapshot",
            },
          ],
          rows: projects.slice(0, 8).map((project) => ({
            label: project.name,
            value: `${project.progress}%`,
            badge: project.stage,
          })),
        },
      },
      {
        title: "Team Attendance Report",
        description: `${presentMembers} team members are present and ${remoteMembers} are working remotely today.`,
        date: today,
        type: "HR",
        gradient: "from-info/16 via-info/8 to-transparent",
        details: {
          metrics: [
            { label: "Team Members", value: String(teamMembers.length), sub: "Latest snapshot" },
            { label: "Present", value: String(presentMembers), sub: "In office" },
            { label: "Remote", value: String(remoteMembers), sub: "Working remote" },
            { label: "Absent / Late", value: String(absentMembers + lateMembers), sub: "Needs follow-up" },
          ],
          rows: teamMembers.slice(0, 8).map((member) => ({
            label: member.name,
            value: member.designation,
            badge: member.attendance,
          })),
        },
      },
    ];

    return reports;
  },

  async getAnalytics(actor?: AccessActor) {
    const actorFilter = buildActorFilter(actor);
    const clientFilter = buildClientActorFilter(actor);
    const analyticsSince = subtractMonths(new Date(), ANALYTICS_MONTH_WINDOW + 1);

    const [invoices, clients, projects, candidates, teamMembers] = await Promise.all([
      prisma.invoice.findMany({
        where: { deletedAt: null, ...actorFilter, createdAt: { gte: analyticsSince } },
        select: { amount: true, createdAt: true, status: true },
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SNAPSHOT_LIMIT,
      }),
      prisma.client.findMany({
        where: { deletedAt: null, ...clientFilter, createdAt: { gte: analyticsSince } },
        select: { createdAt: true, tier: true, revenue: true, status: true },
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SNAPSHOT_LIMIT,
      }),
      prisma.project.findMany({
        where: { deletedAt: null, ...actorFilter, createdAt: { gte: analyticsSince } },
        select: { createdAt: true, status: true },
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SNAPSHOT_LIMIT,
      }),
      prisma.candidate.findMany({
        where: { deletedAt: null, ...actorFilter, createdAt: { gte: analyticsSince } },
        select: { createdAt: true, stage: true },
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SNAPSHOT_LIMIT,
      }),
      prisma.teamMember.findMany({
        where: { deletedAt: null },
        select: { department: true, attendance: true },
        orderBy: { createdAt: "desc" },
        take: ANALYTICS_SNAPSHOT_LIMIT,
      }),
    ]);

    const monthRows = buildMonthlyTrendSkeleton(ANALYTICS_MONTH_WINDOW);
    const monthMap = new Map(monthRows.map((row) => [row.key, row.value]));

    invoices.forEach((invoice) => {
      const row = monthMap.get(monthKey(invoice.createdAt));
      if (row) row.revenue += parseCurrency(invoice.amount);
    });
    clients.forEach((client) => {
      const row = monthMap.get(monthKey(client.createdAt));
      if (row) row.clients += 1;
    });
    projects.forEach((project) => {
      const row = monthMap.get(monthKey(project.createdAt));
      if (row) row.projects += 1;
    });
    candidates.forEach((candidate) => {
      const row = monthMap.get(monthKey(candidate.createdAt));
      if (row) row.candidates += 1;
    });

    const hiredCandidates = candidates.filter((candidate) => candidate.stage === "hired").length;
    const totalCandidates = candidates.length;
    const conversionRate = totalCandidates > 0 ? (hiredCandidates / totalCandidates) * 100 : 0;

    const departmentStats = teamMembers.reduce((acc, member) => {
      if (!acc[member.department]) {
        acc[member.department] = { department: member.department, count: 0, present: 0 };
      }
      acc[member.department].count += 1;
      if (member.attendance === "present") {
        acc[member.department].present += 1;
      }
      return acc;
    }, {} as Record<string, { department: string; count: number; present: number }>);

    const revenueByTier = clients.reduce((acc, client) => {
      const tier = client.tier || "Unknown";
      acc[tier] = (acc[tier] || 0) + parseCurrency(client.revenue || "$0");
      return acc;
    }, {} as Record<string, number>);

    const projectStatusStats = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      monthlyTrends: monthRows.map((row) => row.value),
      conversionRate,
      departmentStats: Object.values(departmentStats),
      revenueByTier,
      projectStatusStats,
      totalStats: {
        clients: clients.length,
        projects: projects.length,
        candidates: candidates.length,
        teamMembers: teamMembers.length,
        totalRevenue: invoices.reduce((sum, invoice) => sum + parseCurrency(invoice.amount), 0),
      },
    };
  },
};
