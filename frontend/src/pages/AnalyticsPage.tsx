import { useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Users, DollarSign, FolderOpen, BarChart2 } from "lucide-react";
import { SimpleSparkline } from "@/components/shared/SimpleCharts";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import AdminOnly from "@/components/shared/AdminOnly";
import { useClients, useProjects, useInvoices, useTeamMembers } from "@/hooks/use-crm-data";

function parseAmount(raw: string): number {
  const numeric = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AnalyticsPage() {
  return <AdminOnly><AnalyticsPageInner /></AdminOnly>;
}

function AnalyticsPageInner() {
  const { data: clients = [], isLoading: clientsLoading, error: clientsError, refetch: refetchClients } = useClients();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: teamMembers = [], isLoading: teamLoading } = useTeamMembers();

  const isLoading = clientsLoading || projectsLoading || invoicesLoading || teamLoading;

  const stats = useMemo(() => {
    const activeClients = clients.filter((c) => c.status === "active").length;
    const activeProjects = projects.filter((p) => p.status === "active").length;
    const totalInvoiceValue = invoices.reduce((sum, inv) => sum + parseAmount(inv.amount), 0);
    const teamSize = teamMembers.length;
    return { activeClients, activeProjects, totalInvoiceValue, teamSize };
  }, [clients, projects, invoices, teamMembers]);

  // Sparklines from real data
  const invoiceSparkline = useMemo(
    () => invoices.slice(-8).map((inv) => parseAmount(inv.amount)),
    [invoices],
  );

  const healthSparkline = useMemo(
    () =>
      clients
        .filter((c) => c.status === "active")
        .slice(-8)
        .map((c) => c.healthScore),
    [clients],
  );

  // Top clients by health score
  const topClients = useMemo(
    () =>
      [...clients]
        .sort((a, b) => b.healthScore - a.healthScore)
        .slice(0, 4),
    [clients],
  );

  if (isLoading) return <PageLoader />;

  if (clientsError) {
    return (
      <ErrorFallback
        title="Analytics data failed to load"
        error={clientsError}
        onRetry={() => refetchClients()}
        retryLabel="Retry"
      />
    );
  }

  const kpiCards = [
    {
      label: "Active Clients",
      value: stats.activeClients > 0 ? String(stats.activeClients) : "0",
      sub: `${clients.length} total`,
      icon: Users,
    },
    {
      label: "Active Projects",
      value: stats.activeProjects > 0 ? String(stats.activeProjects) : "0",
      sub: `${projects.length} total`,
      icon: FolderOpen,
    },
    {
      label: "Invoice Value",
      value: stats.totalInvoiceValue > 0 ? `$${stats.totalInvoiceValue.toLocaleString()}` : "$0",
      sub: `${invoices.length} invoice${invoices.length !== 1 ? "s" : ""}`,
      icon: DollarSign,
    },
    {
      label: "Team Size",
      value: stats.teamSize > 0 ? String(stats.teamSize) : "0",
      sub: "active members",
      icon: TrendingUp,
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-display font-bold text-foreground">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">Live snapshot of your business performance</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-card card-hover">
            <div className="flex items-start justify-between">
              <m.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-2xl font-display font-bold text-foreground mt-3">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">{m.sub}</p>
          </div>
        ))}
      </motion.div>

      {/* Charts */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-card backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Invoice Value Trend</h3>
              <p className="text-sm text-muted-foreground">Most recent invoices by amount</p>
            </div>
            <span className="rounded-full border border-border/60 bg-secondary/25 px-3 py-1 text-xs font-medium text-muted-foreground">
              USD
            </span>
          </div>
          {invoiceSparkline.length > 0 ? (
            <SimpleSparkline data={invoiceSparkline} className="mt-2" />
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
              <BarChart2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No invoice data yet</p>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-card backdrop-blur-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground">Client Health Scores</h3>
              <p className="text-sm text-muted-foreground">Active clients sorted by health score</p>
            </div>
            <span className="rounded-full border border-border/60 bg-secondary/25 px-3 py-1 text-xs font-medium text-muted-foreground">
              Active
            </span>
          </div>
          {healthSparkline.length > 0 ? (
            <SimpleSparkline
              data={healthSparkline}
              stroke="hsl(var(--accent))"
              fill="hsl(var(--accent) / 0.3)"
              accentFill="hsl(var(--accent) / 0.15)"
              className="mt-2"
            />
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
              <BarChart2 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">No active clients yet</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Top Clients */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Top Clients by Health Score</h3>
        {topClients.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {topClients.map((client, i) => (
              <div key={client.id} className="rounded-xl border border-border bg-secondary/30 p-4 text-center card-hover">
                <div className="relative mx-auto w-fit mb-3">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-bold text-foreground">
                    {client.avatar || client.name.slice(0, 2).toUpperCase()}
                  </div>
                  {i === 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center text-[10px] font-bold text-accent">
                      1
                    </span>
                  )}
                </div>
                <p className="font-semibold text-sm text-foreground">{client.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{client.industry} · {client.tier}</p>
                <p className="text-xs text-success font-medium mt-1">Health {client.healthScore}%</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-8 text-center">
            <Users className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm font-semibold text-foreground">No clients yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add clients to see analytics data here.
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
