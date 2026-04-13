import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock,
  RefreshCw,
  Target,
  UserRound,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function formatWhen(value: string) {
  return new Date(value).toLocaleString();
}

function entityLink(entityType?: string, entityId?: number) {
  if (!entityType || !entityId) return "/automation/gtm";
  switch (entityType) {
    case "Lead":
      return "/sales/leads";
    case "Deal":
      return "/sales/pipelines";
    case "Client":
      return "/sales/clients";
    case "Contact":
      return "/sales/contacts";
    case "Task":
      return "/workspace/tasks";
    default:
      return "/automation/gtm";
  }
}

export default function GTMOpsPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["gtm-overview"],
    queryFn: crmService.getGTMOverview,
    refetchInterval: 60000,
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) {
    return (
      <ErrorFallback
        title="GTM control center failed to load"
        error={error}
        description="The GTM overview could not be loaded. Retry to refresh lifecycle automation, follow-up queues, and risk signals."
        onRetry={() => refetch()}
        retryLabel="Retry GTM"
      />
    );
  }

  const leadFunnel = [
    ["New", data.funnels.leads.new ?? 0],
    ["Contacted", data.funnels.leads.contacted ?? 0],
    ["Qualified", data.funnels.leads.qualified ?? 0],
    ["Proposal", data.funnels.leads.proposal ?? 0],
    ["Negotiation", data.funnels.leads.negotiation ?? 0],
    ["Won", data.funnels.leads.closed_won ?? 0],
  ];

  const dealFunnel = [
    ["Prospecting", data.funnels.deals.prospecting ?? 0],
    ["Qualification", data.funnels.deals.qualification ?? 0],
    ["Proposal", data.funnels.deals.proposal ?? 0],
    ["Negotiation", data.funnels.deals.negotiation ?? 0],
    ["Won", data.funnels.deals.closed_won ?? 0],
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-info to-success" />
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-primary/5 to-info/5 blur-3xl" />

        <div className={cn("relative", SPACING.card)}>
          <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Workflow className="h-3.5 w-3.5 text-primary" />
                GTM Control Center
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">GTM</span> Automation
              </h1>
              <p className={cn("max-w-2xl text-muted-foreground", TEXT.bodyRelaxed)}>
                One operational view of what got created automatically, what is stuck, what is at risk, and what should happen next across leads, contacts, deals, and clients.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/sales/leads">
                <Button variant="outline" size="sm" className="gap-2">
                  <Target className="h-4 w-4" />
                  Leads
                </Button>
              </Link>
              <Link to="/sales/pipelines">
                <Button variant="outline" size="sm" className="gap-2">
                  <Workflow className="h-4 w-4" />
                  Pipelines
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Leads", value: data.summary.totalLeads, icon: Target, gradient: "from-primary to-primary/60" },
              { label: "Contacts", value: data.summary.totalContacts, icon: Users, gradient: "from-info to-info/60" },
              { label: "Clients", value: data.summary.totalClients, icon: Building2, gradient: "from-success to-success/60" },
              { label: "Deals", value: data.summary.totalDeals, icon: Workflow, gradient: "from-warning to-warning/60" },
              { label: "Pending Follow-ups", value: data.summary.pendingFollowups, icon: Clock, gradient: "from-info to-info/60" },
              { label: "Pending Automations", value: data.summary.pendingAutomations, icon: Zap, gradient: "from-primary to-primary/60" },
              { label: "Churn Risk", value: data.summary.churnRiskClients, icon: AlertTriangle, gradient: "from-destructive to-destructive/60" },
              { label: "Stale Deals", value: data.summary.staleDeals, icon: Activity, gradient: "from-warning to-warning/60" },
            ].map((stat) => (
              <div key={stat.label} className={cn("relative overflow-hidden rounded-xl border border-border/40 bg-secondary/20 p-3", RADIUS.md)}>
                <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", stat.gradient)} />
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br border", stat.gradient, "text-white border-transparent")}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className={cn("text-muted-foreground", TEXT.meta)}>{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <motion.div variants={item} className="space-y-4">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-xl">Lifecycle Funnel</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-3">
                <p className={cn("uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>Lead Journey</p>
                {leadFunnel.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
                    <span className="text-sm text-foreground">{label}</span>
                    <Badge variant="outline">{value}</Badge>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <p className={cn("uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>Pipeline</p>
                {dealFunnel.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 px-4 py-3">
                    <span className="text-sm text-foreground">{label}</span>
                    <Badge variant="outline">{value}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-xl">Leak Points</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Orphan Contacts", value: data.leakage.orphanContacts, helper: "Contacts not attached to any client yet" },
                { label: "Qualified Leads Without Deals", value: data.leakage.leadsWithoutDeals, helper: "Revenue motion exists but pipeline object is missing" },
                { label: "Won Leads Pending Conversion", value: data.leakage.wonLeadsPendingConversion, helper: "Closed leads still not reflected as clients" },
              ].map((metric) => (
                <div key={metric.label} className="rounded-xl border border-border/40 bg-secondary/20 p-4">
                  <p className={cn("text-muted-foreground", TEXT.meta)}>{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-foreground">{metric.value}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{metric.helper}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-xl">Next Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.nextActions.length > 0 ? data.nextActions.map((action) => (
                <Link key={`${action.entityType}-${action.entityId}-${action.title}`} to={entityLink(action.entityType, action.entityId)} className="block rounded-xl border border-border/40 bg-secondary/20 p-4 transition hover:bg-secondary/30">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{action.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {action.owner || "Unassigned"} · {formatWhen(action.dueDate)}
                      </p>
                    </div>
                    <ArrowRight className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              )) : (
                <p className="text-sm text-muted-foreground">No urgent next actions right now.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.aside variants={item} className="space-y-4">
          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-xl">Hot Leads</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.hotLeads.map((lead) => (
                <Link key={lead.id} to="/sales/leads" className="block rounded-xl border border-border/40 bg-secondary/20 p-4 transition hover:bg-secondary/30">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{lead.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{lead.company} · {lead.status}</p>
                    </div>
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{lead.score}</Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-xl">Work Queues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className={cn("mb-2 uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>Pending Follow-ups</p>
                <div className="space-y-2">
                  {data.workQueues.pendingTasks.slice(0, 4).map((task) => (
                    <div key={task.id} className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2">
                      <p className="text-sm text-foreground">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{task.assignee} · {task.dueDate}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className={cn("mb-2 uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>Scheduled Automations</p>
                <div className="space-y-2">
                  {data.workQueues.scheduled.slice(0, 4).map((job) => (
                    <div key={job.id} className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2">
                      <p className="text-sm text-foreground">{job.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{job.jobType} · {formatWhen(job.scheduledFor)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-xl">Recent Automation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.recentAutomation.slice(0, 6).map((log) => (
                <div key={log.id} className="rounded-xl border border-border/40 bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{log.rule?.name || log.trigger}</p>
                    <Badge variant="outline">{log.status}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{log.entityType || "Unknown"} · {formatWhen(log.startedAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/60 shadow-card">
            <CardHeader>
              <CardTitle className="font-display text-xl">Risk & Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="rounded-xl border border-border/40 bg-secondary/20 p-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={cn("h-4 w-4", alert.severity === "critical" ? "text-destructive" : "text-warning")} />
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{alert.message}</p>
                </div>
              ))}

              {data.recentActivities.slice(0, 4).map((activity) => (
                <div key={activity.id} className="rounded-xl border border-border/40 bg-secondary/20 p-3">
                  <div className="flex items-start gap-2">
                    <UserRound className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-foreground">{activity.description || `${activity.action} ${activity.entityType}`}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{activity.performedBy || "system"} · {formatWhen(activity.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.aside>
      </section>
    </motion.div>
  );
}
