import { useMemo } from "react";
import {
  TrendingUp, Users, DollarSign, FolderOpen, RefreshCw,
  Activity, BarChart2, Target, Briefcase, HeartPulse, ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar,
} from "recharts";

import { AnalyticsSkeleton } from "@/components/skeletons";
import ErrorFallback from "@/components/shared/ErrorFallback";
import AdminOnly from "@/components/shared/AdminOnly";
import { useClients, useProjects, useInvoices, useTeamMembers } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import { TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { useRefresh } from "@/hooks/use-refresh";
import { getRefreshMessage, getRefreshSuccessMessage } from "@/lib/refresh-messages";

const PIE_COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };

function parseAmount(raw: unknown): number {
  const n = Number(String(raw ?? "0").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function AnalyticsPage() {
  return <AdminOnly><AnalyticsPageInner /></AdminOnly>;
}

function AnalyticsPageInner() {
  const { data: clients = [], isLoading: clientsLoading, error: clientsError, refetch: refetchClients } = useClients();
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: invoices = [], isLoading: invoicesLoading, refetch: refetchInvoices } = useInvoices();
  const { data: teamMembers = [], isLoading: teamLoading, refetch: refetchTeam } = useTeamMembers();

  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: crmService.getAnalytics,
  });

  const { refresh, isRefreshing } = useRefresh();

  const isLoading = clientsLoading || projectsLoading || invoicesLoading || teamLoading || analyticsLoading;

  const handleRefresh = async () => {
    await refresh(
      () => Promise.all([refetchClients(), refetchProjects(), refetchInvoices(), refetchTeam(), refetchAnalytics()]),
      {
        message: getRefreshMessage("analytics"),
        successMessage: getRefreshSuccessMessage("analytics"),
      }
    );
  };

  // ── Derived stats from local data (always available) ──
  const kpis = useMemo(() => {
    const totalRevenue = invoices.reduce((s, inv) => s + parseAmount(inv.amount), 0);
    const collected = invoices.filter(i => i.status === "completed").reduce((s, i) => s + parseAmount(i.amount), 0);
    const outstanding = invoices.filter(i => i.status === "pending").reduce((s, i) => s + parseAmount(i.amount), 0);
    const activeClients = clients.filter(c => c.status === "active").length;
    const activeProjects = projects.filter(p => p.status === "active" || p.status === "in-progress").length;
    const avgHealth = clients.length
      ? Math.round(clients.reduce((s, c) => s + (c.healthScore ?? 0), 0) / clients.length)
      : 0;
    const present = teamMembers.filter(m => m.attendance === "present").length;
    const attendanceRate = teamMembers.length ? Math.round((present / teamMembers.length) * 100) : 0;
    return { totalRevenue, collected, outstanding, activeClients, activeProjects, avgHealth, attendanceRate };
  }, [clients, projects, invoices, teamMembers]);

  // ── Project status breakdown ──
  const projectStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    projects.forEach(p => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [projects]);

  // ── Top clients by health score ──
  const topClients = useMemo(
    () => [...clients].sort((a, b) => b.healthScore - a.healthScore).slice(0, 6),
    [clients],
  );

  // ── Invoice status breakdown ──
  const invoiceStatusData = useMemo(() => {
    const counts: Record<string, number> = {};
    invoices.forEach(i => { counts[i.status] = (counts[i.status] ?? 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: status, value: count }));
  }, [invoices]);

  if (isLoading) return <AnalyticsSkeleton />;

  if (clientsError) {
    return (
      <ErrorFallback
        title="Analytics failed to load"
        error={clientsError}
        onRetry={handleRefresh}
        retryLabel="Retry"
      />
    );
  }

  const monthlyTrends = analytics?.monthlyTrends ?? [];
  const departmentStats = analytics?.departmentStats ?? [];
  const revenueByTier = Object.entries(analytics?.revenueByTier ?? {}).map(([name, value]) => ({ name, value }));
  const conversionRate = analytics?.conversionRate ?? 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* ── Header ── */}
      <motion.section variants={item} className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-5">
          <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
            <BarChart2 className="h-3.5 w-3.5 text-primary" />
            Business Intelligence
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="font-display text-3xl font-semibold text-foreground">Analytics</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Live snapshot of revenue, clients, projects, and team performance.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex h-11 w-fit items-center gap-2 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm font-semibold text-foreground backdrop-blur-sm transition hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
              "Refresh"
            </button>
          </div>

          {/* KPI stat cards */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total Revenue",    value: `$${kpis.totalRevenue.toLocaleString()}`,  sub: `$${kpis.collected.toLocaleString()} collected`,   icon: DollarSign },
              { label: "Active Clients",   value: String(kpis.activeClients),                sub: `${clients.length} total accounts`,                icon: Users },
              { label: "Active Projects",  value: String(kpis.activeProjects),               sub: `${projects.length} total projects`,               icon: FolderOpen },
              { label: "Attendance Rate",  value: `${kpis.attendanceRate}%`,                 sub: `${teamMembers.length} team members`,              icon: Activity },
            ].map(s => (
              <div key={s.label} className="rounded-[1.25rem] border border-border/70 bg-secondary/22 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className={cn("uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>{s.label}</p>
                <p className="mt-1 font-display text-2xl font-semibold text-foreground">{s.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── Secondary KPIs ── */}
      <motion.div variants={item} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Outstanding",       value: `$${kpis.outstanding.toLocaleString()}`, icon: DollarSign,  tone: "bg-warning/10 border-warning/20 text-warning" },
          { label: "Avg Client Health", value: `${kpis.avgHealth}%`,                    icon: HeartPulse,  tone: "bg-success/10 border-success/20 text-success" },
          { label: "Hiring Conversion", value: `${conversionRate.toFixed(1)}%`,          icon: Target,      tone: "bg-primary/10 border-primary/20 text-primary" },
          { label: "Total Invoices",    value: String(invoices.length),                  icon: Briefcase,   tone: "bg-info/10 border-info/20 text-info" },
        ].map(s => (
          <div key={s.label} className={cn("rounded-[1.25rem] border p-4", s.tone)}>
            <s.icon className="h-5 w-5 mb-2" />
            <p className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </motion.div>

      {/* ── Revenue & Growth Trend ── */}
      {monthlyTrends.length > 0 && (
        <motion.section variants={item} className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" />
            Revenue & Growth Trends
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line yAxisId="left"  type="monotone" dataKey="revenue"    stroke="#2563eb" strokeWidth={2} dot={false} name="Revenue ($)" />
                <Line yAxisId="right" type="monotone" dataKey="clients"    stroke="#10b981" strokeWidth={2} dot={false} name="New Clients" />
                <Line yAxisId="right" type="monotone" dataKey="projects"   stroke="#f59e0b" strokeWidth={2} dot={false} name="New Projects" />
                <Line yAxisId="right" type="monotone" dataKey="candidates" stroke="#8b5cf6" strokeWidth={2} dot={false} name="Candidates" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.section>
      )}

      {/* ── Two-column: Department + Revenue by Tier ── */}
      <motion.div variants={item} className="grid gap-5 lg:grid-cols-2">

        {/* Department performance */}
        {departmentStats.length > 0 && (
          <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
            <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Users className="h-5 w-5 text-primary" />
              Team by Department
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-10" />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count"   fill="#2563eb" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="present" fill="#10b981" name="Present" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* Revenue by client tier */}
        {revenueByTier.length > 0 && (
          <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
            <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Revenue by Client Tier
            </h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByTier}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {revenueByTier.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </motion.div>

      {/* ── Two-column: Invoice status + Project status ── */}
      <motion.div variants={item} className="grid gap-5 lg:grid-cols-2">

        {/* Invoice breakdown */}
        {invoiceStatusData.length > 0 && (
          <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <DollarSign className="h-5 w-5 text-primary" />
              Invoice Status
            </h2>
            <div className="space-y-3">
              {invoiceStatusData.map(({ name, value }) => (
                <div key={name} className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/22 px-4 py-3">
                  <span className="text-sm font-medium capitalize text-foreground">{name}</span>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                    {value} invoice{value !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Project breakdown */}
        {projectStatusData.length > 0 && (
          <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <FolderOpen className="h-5 w-5 text-primary" />
              Project Status
            </h2>
            <div className="space-y-3">
              {projectStatusData.map(({ status, count }) => {
                const total = projects.length;
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium capitalize text-foreground">{status.replace("-", " ")}</span>
                      <span className="text-muted-foreground">{count} / {total}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </motion.div>

      {/* ── Top clients by health score ── */}
      {topClients.length > 0 && (
        <motion.section variants={item} className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
          <h2 className="mb-5 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <HeartPulse className="h-5 w-5 text-primary" />
            Top Clients by Health Score
          </h2>
          <div className="space-y-2">
            {topClients.map((client, i) => (
              <div key={client.id} className="flex items-center gap-4 rounded-xl border border-border/70 bg-secondary/22 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                    <span className="ml-3 shrink-0 text-sm font-bold text-primary">{client.healthScore}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all"
                      style={{ width: `${client.healthScore}%` }}
                    />
                  </div>
                </div>
                <span className={cn(
                  "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                  client.status === "active" ? "border-success/20 bg-success/10 text-success" : "border-border/60 bg-secondary/30 text-muted-foreground",
                )}>
                  {client.status}
                </span>
              </div>
            ))}
          </div>
        </motion.section>
      )}

    </motion.div>
  );
}
