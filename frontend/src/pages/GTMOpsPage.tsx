import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  RefreshCw,
  Target,
  TrendingUp,
  TrendingDown,
  Users,
  Video,
  Workflow,
  XCircle,
  Zap,
  Bell,
  Phone,
  Mail,
  MessageSquare,
  Flame,
  BarChart3,
  Timer,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
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

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return "Just now";
}

function getHealthColor(grade: string) {
  switch (grade) {
    case "A+":
    case "A":
      return "text-success bg-success/10 border-success/30";
    case "B":
      return "text-info bg-info/10 border-info/30";
    case "C":
      return "text-warning bg-warning/10 border-warning/30";
    default:
      return "text-destructive bg-destructive/10 border-destructive/30";
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "active":
    case "scheduled":
    case "completed":
    case "qualified":
    case "won":
      return "bg-success/10 text-success border-success/30";
    case "pending":
    case "contacted":
      return "bg-warning/10 text-warning border-warning/30";
    case "lost":
    case "cancelled":
    case "critical":
    case "high_risk":
      return "bg-destructive/10 text-destructive border-destructive/30";
    default:
      return "bg-secondary/20 text-muted-foreground border-border/30";
  }
}

export default function GTMOpsPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["gtm-overview"],
    queryFn: crmService.getGTMOverview,
    refetchInterval: 30000,
    staleTime: 20000,
    refetchOnWindowFocus: true,
  });

  const [showAllHotLeads, setShowAllHotLeads] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [showAllActions, setShowAllActions] = useState(false);

  const recalculateMutation = useMutation({
    mutationFn: () => crmService.bulkRecalculateScores(),
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) return <PageLoader />;
  if (error || !data) {
    return (
      <ErrorFallback
        title="Dashboard failed to load"
        error={error}
        description="The sales dashboard could not be loaded. Please try again."
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  const leadStages = [
    { key: "new", label: "New", icon: Target, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-500/10", textColor: "text-blue-500", borderColor: "border-blue-500/30" },
    { key: "contacted", label: "Contacted", icon: Phone, color: "from-yellow-500 to-yellow-600", bgColor: "bg-yellow-500/10", textColor: "text-yellow-500", borderColor: "border-yellow-500/30" },
    { key: "qualified", label: "Qualified", icon: CheckCircle2, color: "from-green-500 to-green-600", bgColor: "bg-green-500/10", textColor: "text-green-500", borderColor: "border-green-500/30" },
    { key: "proposal", label: "Proposal", icon: Mail, color: "from-purple-500 to-purple-600", bgColor: "bg-purple-500/10", textColor: "text-purple-500", borderColor: "border-purple-500/30" },
    { key: "negotiation", label: "Negotiation", icon: MessageSquare, color: "from-orange-500 to-orange-600", bgColor: "bg-orange-500/10", textColor: "text-orange-500", borderColor: "border-orange-500/30" },
    { key: "closed_won", label: "Won", icon: TrendingUp, color: "from-emerald-500 to-emerald-600", bgColor: "bg-emerald-500/10", textColor: "text-emerald-500", borderColor: "border-emerald-500/30" },
  ];

  const dealStages = [
    { key: "prospecting", label: "Prospecting", color: "bg-blue-500" },
    { key: "qualification", label: "Qualification", color: "bg-purple-500" },
    { key: "proposal", label: "Proposal", color: "bg-orange-500" },
    { key: "negotiation", label: "Negotiation", color: "bg-yellow-500" },
    { key: "closed_won", label: "Won", color: "bg-green-500" },
  ];

  const leadCounts = {
    new: data.funnels.leads.new ?? 0,
    contacted: data.funnels.leads.contacted ?? 0,
    qualified: data.funnels.leads.qualified ?? 0,
    proposal: data.funnels.leads.proposal ?? 0,
    negotiation: data.funnels.leads.negotiation ?? 0,
    closed_won: data.funnels.leads.closed_won ?? 0,
  };

  const totalLeads = Object.values(leadCounts).reduce((a, b) => a + b, 0);
  const wonRate = totalLeads > 0 ? ((leadCounts.closed_won / totalLeads) * 100).toFixed(1) : "0";
  const qualifiedRate = totalLeads > 0 ? ((leadCounts.qualified / totalLeads) * 100).toFixed(1) : "0";

  const getConversionRate = (from: string, to: string) => {
    const fromCount = leadCounts[from as keyof typeof leadCounts] ?? 0;
    const toCount = leadCounts[to as keyof typeof leadCounts] ?? 0;
    if (fromCount === 0) return 0;
    return Math.round((toCount / fromCount) * 100);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 mb-3">
              <Activity className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Automation · GTM Center</span>
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Sales Dashboard</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Track your pipeline, manage leads, monitor client health, and stay on top of follow-ups.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
              <Target className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium">{data.summary.totalLeads} leads</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-4 py-2">
              <span className="text-sm font-medium text-info">{data.summary.totalDeals} deals</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2">
              <span className="text-sm font-medium text-success">{wonRate}% win rate</span>
            </div>
            {data.summary.pendingFollowups > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2">
                <span className="text-sm font-medium text-warning">{data.summary.pendingFollowups} follow-ups due</span>
              </div>
            )}
            {data.summary.churnRiskClients > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/10 px-4 py-2">
                <span className="text-sm font-medium text-destructive">{data.summary.churnRiskClients} at risk</span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-1">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={() => recalculateMutation.mutate()} disabled={recalculateMutation.isPending || totalLeads === 0} className="gap-2">
                <Zap className={cn("h-3.5 w-3.5", recalculateMutation.isPending && "animate-pulse")} />
                {recalculateMutation.isPending ? "Recalculating..." : "Recalculate"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Lead & Deal Funnels */}
        <div className="space-y-6 lg:col-span-2">
          {/* Lead Funnel - Enhanced */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-card overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Lead Pipeline
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{totalLeads} Total</Badge>
                    <Link to="/sales/leads">
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        View All <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">Track leads through each stage of your sales process</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pipeline Visualization */}
                <div className="relative">
                  <div className="flex items-end gap-1">
                    {leadStages.map((stage, idx) => {
                      const value = leadCounts[stage.key as keyof typeof leadCounts] ?? 0;
                      const maxVal = Math.max(...Object.values(leadCounts), 1);
                      const height = Math.max((value / maxVal) * 80, 4);
                      const conversionRate = idx > 0 ? getConversionRate(leadStages[idx - 1].key, stage.key) : 100;

                      return (
                        <div key={stage.key} className="flex-1 flex flex-col items-center">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${height}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className={cn(
                              "w-full rounded-t-lg bg-gradient-to-t relative group cursor-pointer",
                              stage.bgColor,
                              `border-t-2 border-x-2 ${stage.borderColor}`
                            )}
                          >
                            <div className={cn("absolute inset-0 bg-gradient-to-t opacity-0 group-hover:opacity-100 transition-opacity", stage.bgColor)} />
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className={cn("px-2 py-1 rounded-md text-xs font-bold", stage.bgColor, stage.textColor)}>
                                {value}
                              </div>
                            </div>
                            {idx > 0 && (
                              <div className="absolute -left-3 top-1/2 -translate-y-1/2 bg-background border border-border/40 rounded-full px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground z-10">
                                {conversionRate}%
                              </div>
                            )}
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stage Labels */}
                <div className="grid grid-cols-6 gap-1">
                  {leadStages.map((stage) => {
                    const value = leadCounts[stage.key as keyof typeof leadCounts] ?? 0;
                    const percentage = totalLeads > 0 ? ((value / totalLeads) * 100).toFixed(0) : "0";
                    return (
                      <div key={stage.key} className="text-center">
                        <div className={cn("flex items-center justify-center gap-1 text-xs font-medium", stage.textColor)}>
                          <stage.icon className="h-3 w-3" />
                          <span>{stage.label}</span>
                        </div>
                        <p className="text-lg font-bold text-foreground">{value}</p>
                        <p className="text-[10px] text-muted-foreground">{percentage}%</p>
                      </div>
                    );
                  })}
                </div>

                {/* Conversion Funnel Bar */}
                <div className="relative pt-2">
                  <div className="flex items-center gap-1">
                    {leadStages.map((stage, idx) => {
                      const value = leadCounts[stage.key as keyof typeof leadCounts] ?? 0;
                      const width = totalLeads > 0 ? (value / totalLeads) * 100 : 0;
                      return (
                        <motion.div
                          key={stage.key}
                          initial={{ width: 0 }}
                          animate={{ width: `${width}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.05 }}
                          className={cn("h-6 rounded-l-sm bg-gradient-to-r", stage.color, idx === leadStages.length - 1 && "rounded-r-sm")}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Leak Points & Actions */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/40">
                  <div className="space-y-2">
                    <p className={cn("text-xs uppercase tracking-wider text-muted-foreground", TEXT.eyebrow)}>Attention Needed</p>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Orphan", value: data.leakage.orphanContacts, icon: Users, color: "text-orange-500" },
                        { label: "No Deals", value: data.leakage.leadsWithoutDeals, icon: Workflow, color: "text-purple-500" },
                        { label: "Pending", value: data.leakage.wonLeadsPendingConversion, icon: Building2, color: "text-blue-500" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg border border-border/40 bg-secondary/20 p-2 text-center">
                          <item.icon className={cn("mx-auto h-3 w-3 mb-1", item.color)} />
                          <p className={cn("text-sm font-bold", item.color)}>{item.value}</p>
                          <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className={cn("text-xs uppercase tracking-wider text-muted-foreground", TEXT.eyebrow)}>Pipeline Health</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Lead-to-Opportunity</span>
                        <span className="text-xs font-medium text-success">{data.summary.totalDeals > 0 ? "Active" : "No Deals"}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Client Conversion</span>
                        <span className="text-xs font-medium text-primary">{wonRate}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Pipeline Value</span>
                        <span className="text-xs font-medium text-warning">
                          ${(data.summary.pipelineValue ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Hot Leads - Enhanced */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Zap className="h-5 w-5 text-warning" />
                    Hot Leads
                    <Badge className="bg-warning/10 text-warning border-warning/30 ml-1">{data.hotLeads.length}</Badge>
                  </CardTitle>
                  <Link to="/sales/leads?filter=hot">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      View All <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {data.hotLeads.length > 0 ? (
                  <div className="space-y-2">
                    {data.hotLeads.slice(0, showAllHotLeads ? undefined : 4).map((lead) => (
                      <Link
                        key={lead.id}
                        to="/sales/leads"
                        className="group flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 p-3 transition-all hover:border-warning/30 hover:bg-warning/5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-warning to-orange-500 text-white text-xs font-bold">
                              {lead.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                            </div>
                            <div className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-warning text-[8px] font-bold text-white">
                              {lead.score}
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-foreground group-hover:text-warning transition-colors">{lead.name}</p>
                            <p className={cn("text-xs text-muted-foreground", TEXT.meta)}>
                              {lead.company} · {lead.assignedTo || "Unassigned"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1">
                            <Flame className="h-3 w-3 text-primary" />
                            <span className="text-xs font-medium text-primary">{lead.score}</span>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-warning group-hover:translate-x-1 transition-all" />
                        </div>
                      </Link>
                    ))}
                    {data.hotLeads.length > 4 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllHotLeads(!showAllHotLeads)}
                        className="w-full mt-2 text-xs"
                      >
                        {showAllHotLeads ? (
                          <><ChevronUp className="h-4 w-4 mr-1" /> Show Less</>
                        ) : (
                          <><ChevronDown className="h-4 w-4 mr-1" /> Show {data.hotLeads.length - 4} More</>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No hot leads yet</p>
                    <p className={cn("text-xs", TEXT.meta)}>Leads with score 80+ will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Deal Pipeline Summary */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-info" />
                    Deal Pipeline
                  </CardTitle>
                  <Badge variant="outline">{data.summary.totalDeals} Deals</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dealStages.map((stage, idx) => {
                    const value = data.funnels.deals[stage.key as keyof typeof data.funnels.deals] ?? 0;
                    const maxVal = Math.max(...Object.values(data.funnels.deals), 1);
                    const width = (value / maxVal) * 100;

                    return (
                      <div key={stage.key} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-muted-foreground">{stage.label}</div>
                        <div className="flex-1 h-6 bg-secondary/20 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${width}%` }}
                            transition={{ duration: 0.5, delay: idx * 0.1 }}
                            className={cn("h-full rounded-full flex items-center justify-end pr-2", stage.color)}
                          >
                            {value > 0 && <span className="text-xs font-bold text-white">{value}</span>}
                          </motion.div>
                        </div>
                        <div className="w-8 text-xs font-medium text-foreground text-right">{value}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Next Actions */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Clock className="h-5 w-5 text-info" />
                    Upcoming Actions
                  </CardTitle>
                  <Badge className="bg-info/10 text-info border-info/30">{data.nextActions.length} pending</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {data.nextActions.length > 0 ? (
                  <div className="space-y-2">
                    {data.nextActions.slice(0, showAllActions ? undefined : 4).map((action, idx) => (
                      <Link
                        key={`${action.entityType}-${action.entityId}-${idx}`}
                        to={`/sales/${action.entityType?.toLowerCase()}s`}
                        className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 p-3 transition hover:bg-secondary/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg",
                            action.entityType === "Task" ? "bg-info/10 text-info" :
                            action.entityType === "Deal" ? "bg-warning/10 text-warning" :
                            "bg-primary/10 text-primary"
                          )}>
                            {action.entityType === "Task" ? <CheckCircle2 className="h-4 w-4" /> :
                             action.entityType === "Deal" ? <DollarSign className="h-4 w-4" /> :
                             <Target className="h-4 w-4" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{action.title}</p>
                            <p className={cn("text-xs text-muted-foreground", TEXT.meta)}>
                              {action.owner || "Unassigned"} · Due {formatDate(action.dueDate)}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    ))}
                    {data.nextActions.length > 4 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllActions(!showAllActions)}
                        className="w-full mt-2 text-xs"
                      >
                        {showAllActions ? (
                          <><ChevronUp className="h-4 w-4 mr-1" /> Show Less</>
                        ) : (
                          <><ChevronDown className="h-4 w-4 mr-1" /> Show {data.nextActions.length - 4} More</>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="mx-auto h-8 w-8 mb-2 opacity-50 text-success" />
                    <p className="text-sm">All caught up!</p>
                    <p className={cn("text-xs", TEXT.meta)}>No urgent follow-ups right now</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Right Column - Alerts, Meetings, Activities */}
        <div className="space-y-6">
          {/* Alerts */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Bell className="h-5 w-5 text-destructive" />
                    Alerts
                    {data.alerts.length > 0 && <Badge className="bg-destructive/10 text-destructive border-destructive/30 ml-1">{data.alerts.length}</Badge>}
                  </CardTitle>
                  <Link to="/automation/alerts">
                    <Button variant="ghost" size="sm" className="gap-1 text-xs">
                      View All <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {data.alerts.length > 0 ? (
                  <div className="space-y-2">
                    {data.alerts.slice(0, showAllAlerts ? undefined : 3).map((alert) => (
                      <div
                        key={alert.id}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-3",
                          alert.severity === "critical"
                            ? "border-destructive/30 bg-destructive/5"
                            : "border-warning/30 bg-warning/5"
                        )}
                      >
                        <AlertTriangle className={cn(
                          "mt-0.5 h-4 w-4 flex-shrink-0",
                          alert.severity === "critical" ? "text-destructive" : "text-warning"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{alert.title}</p>
                          <p className={cn("text-xs text-muted-foreground mt-1", TEXT.meta)}>{alert.message}</p>
                        </div>
                      </div>
                    ))}
                    {data.alerts.length > 3 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllAlerts(!showAllAlerts)}
                        className="w-full mt-2 text-xs"
                      >
                        {showAllAlerts ? (
                          <><ChevronUp className="h-4 w-4 mr-1" /> Show Less</>
                        ) : (
                          <><ChevronDown className="h-4 w-4 mr-1" /> Show {data.alerts.length - 3} More</>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Bell className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    <p className="text-sm">No alerts</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Activity className="h-5 w-5 text-info" />
                    Recent Activity
                  </CardTitle>
                  <Badge variant="outline">{data.recentActivities.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {data.recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {data.recentActivities.slice(0, showAllActivities ? undefined : 5).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs">
                          <Activity className="h-3 w-3 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground">{activity.description || `${activity.action} ${activity.entityType}`}</p>
                          <p className={cn("text-xs text-muted-foreground mt-1", TEXT.meta)}>
                            {activity.performedBy || "system"} · {getRelativeTime(activity.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {data.recentActivities.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAllActivities(!showAllActivities)}
                        className="w-full mt-2 text-xs"
                      >
                        {showAllActivities ? (
                          <><ChevronUp className="h-4 w-4 mr-1" /> Show Less</>
                        ) : (
                          <><ChevronDown className="h-4 w-4 mr-1" /> Show {data.recentActivities.length - 5} More</>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Activity className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    <p className="text-sm">No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Automation Queue */}
          <motion.div variants={item}>
            <Card className="border-border/60 shadow-card">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    Automation Queue
                  </CardTitle>
                  <Badge className="bg-primary/10 text-primary border-primary/30">
                    {data.summary.pendingAutomations}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {data.workQueues.scheduled.length > 0 ? (
                  <div className="space-y-2">
                    {data.workQueues.scheduled.slice(0, 4).map((job) => (
                      <div key={job.id} className="flex items-center justify-between rounded-lg border border-border/40 bg-secondary/20 p-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium text-foreground">{job.name}</p>
                            <p className={cn("text-xs text-muted-foreground", TEXT.meta)}>
                              {job.jobType} · {formatDate(job.scheduledFor)}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">{job.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <Zap className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    <p className="text-sm">No pending automations</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
