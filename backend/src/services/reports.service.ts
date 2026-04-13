import { prisma } from "../config/prisma";

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

function formatMonthRange(dates: Date[]) {
  if (!dates.length) return "No activity yet";
  const first = dates[0];
  const last = dates[dates.length - 1];
  const firstLabel = first.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  const lastLabel = last.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return firstLabel === lastLabel ? firstLabel : `${firstLabel} to ${lastLabel}`;
}

export const reportsService = {
  async list() {
    const [invoices, clients, projects, teamMembers] = await Promise.all([
      prisma.invoice.findMany({ where: { deletedAt: null }, select: { amount: true, createdAt: true, client: true, status: true, due: true } }),
      prisma.client.findMany({ where: { deletedAt: null }, select: { name: true, status: true, tier: true, healthScore: true, revenue: true, industry: true } }),
      prisma.project.findMany({ where: { deletedAt: null }, select: { name: true, status: true, progress: true, stage: true, budget: true } }),
      prisma.teamMember.findMany({ where: { deletedAt: null }, select: { name: true, attendance: true, department: true, role: true, designation: true } }),
    ]);

    const totalInvoiceAmount = invoices.reduce((sum, inv) => {
      const n = Number(String(inv.amount).replace(/[^0-9.]/g, ""));
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);

    const activeClients = clients.filter(c => c.status === "active");
    const enterpriseClients = clients.filter(c => c.tier === "Enterprise").length;
    const growthClients = clients.filter(c => c.tier === "Growth").length;
    const strategicClients = clients.filter(c => c.tier === "Strategic").length;
    const activeProjects = projects.filter(p => p.status === "active" || p.status === "in_progress").length;
    const completedProjects = projects.filter(p => p.status === "completed").length;
    const presentMembers = teamMembers.filter(m => m.attendance === "present").length;
    const remoteMembers = teamMembers.filter(m => m.attendance === "remote").length;
    const absentMembers = teamMembers.filter(m => m.attendance === "absent").length;
    const lateMembers = teamMembers.filter(m => m.attendance === "late").length;

    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
    const invoiceDates = invoices.map(i => i.createdAt).sort((a, b) => a.getTime() - b.getTime());
    const completedInvoices = invoices.filter(i => i.status === "completed");
    const pendingInvoices = invoices.filter(i => i.status === "pending");
    const avgHealth = clients.length ? Math.round(clients.reduce((s, c) => s + (c.healthScore ?? 0), 0) / clients.length) : 0;

    const reports: ReportRecord[] = [
      {
        title: "Revenue Summary",
        description: `Total invoiced revenue is $${Math.round(totalInvoiceAmount).toLocaleString()} across ${invoices.length} invoices.`,
        date: formatMonthRange(invoiceDates),
        type: "Financial",
        gradient: "from-success/18 via-success/6 to-transparent",
        details: {
          metrics: [
            { label: "Total Revenue", value: `$${Math.round(totalInvoiceAmount).toLocaleString()}`, sub: "All invoices" },
            { label: "Collected", value: `$${completedInvoices.reduce((s, i) => s + Number(String(i.amount).replace(/[^0-9.]/g, "")), 0).toLocaleString()}`, sub: `${completedInvoices.length} paid` },
            { label: "Outstanding", value: `$${pendingInvoices.reduce((s, i) => s + Number(String(i.amount).replace(/[^0-9.]/g, "")), 0).toLocaleString()}`, sub: `${pendingInvoices.length} pending` },
            { label: "Total Invoices", value: String(invoices.length), sub: "All time" },
          ],
          rows: invoices.slice(0, 8).map(i => ({
            label: i.client,
            value: `$${Number(String(i.amount).replace(/[^0-9.]/g, "")).toLocaleString()}`,
            badge: i.status,
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
            { label: "Total Clients", value: String(clients.length), sub: "All accounts" },
            { label: "Active", value: String(activeClients.length), sub: "Currently active" },
            { label: "Avg Health Score", value: `${avgHealth}%`, sub: "Portfolio health" },
            { label: "Enterprise", value: String(enterpriseClients), sub: "Top tier" },
          ],
          rows: clients.slice(0, 8).map(c => ({
            label: c.name,
            value: c.revenue ?? "$0",
            badge: c.status,
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
            { label: "Total Projects", value: String(projects.length), sub: "All time" },
            { label: "Active", value: String(activeProjects), sub: "In progress" },
            { label: "Completed", value: String(completedProjects), sub: "Delivered" },
            { label: "Avg Progress", value: projects.length ? `${Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)}%` : "0%", sub: "Across all" },
          ],
          rows: projects.slice(0, 8).map(p => ({
            label: p.name,
            value: `${p.progress}%`,
            badge: p.stage,
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
            { label: "Total Members", value: String(teamMembers.length), sub: "Active team" },
            { label: "Present", value: String(presentMembers), sub: "In office" },
            { label: "Remote", value: String(remoteMembers), sub: "Working remote" },
            { label: "Absent / Late", value: String(absentMembers + lateMembers), sub: "Needs follow-up" },
          ],
          rows: teamMembers.slice(0, 8).map(m => ({
            label: m.name,
            value: m.designation,
            badge: m.attendance,
          })),
        },
      },
    ];

    return reports;
  },

  async getAnalytics() {
    const [invoices, clients, projects, candidates, teamMembers, payroll] = await Promise.all([
      prisma.invoice.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } }),
      prisma.client.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } }),
      prisma.project.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } }),
      prisma.candidate.findMany({ where: { deletedAt: null }, orderBy: { createdAt: "asc" } }),
      prisma.teamMember.findMany({ where: { deletedAt: null } }),
      prisma.payroll.findMany({ where: { deletedAt: null }, orderBy: { period: "asc" } }),
    ]);

    // Monthly revenue and growth
    const months: Record<string, { month: string; revenue: number; clients: number; projects: number; candidates: number }> = {};
    invoices.forEach((inv) => {
      const m = inv.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!months[m]) months[m] = { month: m, revenue: 0, clients: 0, projects: 0, candidates: 0 };
      const n = Number(String(inv.amount).replace(/[^0-9.]/g, ""));
      months[m].revenue += Number.isFinite(n) ? n : 0;
    });
    clients.forEach((c) => {
      const m = c.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!months[m]) months[m] = { month: m, revenue: 0, clients: 0, projects: 0, candidates: 0 };
      months[m].clients += 1;
    });
    projects.forEach((p) => {
      const m = p.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!months[m]) months[m] = { month: m, revenue: 0, clients: 0, projects: 0, candidates: 0 };
      months[m].projects += 1;
    });
    candidates.forEach((ca) => {
      const m = ca.createdAt.toLocaleDateString("en-US", { month: "short", year: "numeric" });
      if (!months[m]) months[m] = { month: m, revenue: 0, clients: 0, projects: 0, candidates: 0 };
      months[m].candidates += 1;
    });

    // Conversion rates
    const hiredCandidates = candidates.filter(c => c.stage === "hired").length;
    const totalCandidates = candidates.length;
    const conversionRate = totalCandidates > 0 ? (hiredCandidates / totalCandidates) * 100 : 0;

    // Team performance
    const departmentStats = teamMembers.reduce((acc, member) => {
      if (!acc[member.department]) {
        acc[member.department] = { department: member.department, count: 0, present: 0 };
      }
      acc[member.department].count += 1;
      if (member.attendance === "present") acc[member.department].present += 1;
      return acc;
    }, {} as Record<string, { department: string; count: number; present: number }>);

    // Revenue by client tier
    const revenueByTier = clients.reduce((acc, client) => {
      const tier = client.tier || "Unknown";
      const revenue = Number(String(client.revenue || "$0").replace(/[^0-9.]/g, "")) || 0;
      acc[tier] = (acc[tier] || 0) + revenue;
      return acc;
    }, {} as Record<string, number>);

    // Project completion trends
    const projectStatusStats = projects.reduce((acc, project) => {
      acc[project.status] = (acc[project.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      monthlyTrends: Object.values(months),
      conversionRate,
      departmentStats: Object.values(departmentStats),
      revenueByTier,
      projectStatusStats,
      totalStats: {
        clients: clients.length,
        projects: projects.length,
        candidates: candidates.length,
        teamMembers: teamMembers.length,
        totalRevenue: invoices.reduce((sum, inv) => sum + Number(String(inv.amount).replace(/[^0-9.]/g, "")), 0),
      },
    };
  },
};
