import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, CheckCircle2, ChevronRight, Clock3, FolderKanban, MessageSquare, Sparkles, TrendingUp, Users, Zap, RefreshCw, ArrowRight, Video, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

import { ActivitySkeleton } from "@/components/skeletons";
import ErrorFallback from "@/components/shared/ErrorFallback";
import ProgressRing from "@/components/shared/ProgressRing";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import StatusBadge from "@/components/shared/StatusBadge";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuditLogs, useDashboardData } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import type { MeetingRecord } from "@/types/crm";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { useRefresh } from "@/hooks/use-refresh";
import { getRefreshMessage, getRefreshSuccessMessage } from "@/lib/refresh-messages";

type FilterId = "all" | "collaboration" | "sales" | "delivery" | "finance" | "hiring" | "system";

const filterConfig: Record<FilterId, { label: string; color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
  all:           { label: "All",           color: "text-foreground", bgColor: "bg-secondary/40 border-border/60",              icon: Activity },
  collaboration: { label: "Collab",        color: "text-primary",    bgColor: "bg-primary/10 border-primary/20",              icon: Users },
  sales:         { label: "Sales",         color: "text-blue-500",  bgColor: "bg-blue-500/10 border-blue-500/20",           icon: TrendingUp },
  delivery:      { label: "Delivery",      color: "text-violet-500",bgColor: "bg-violet-500/10 border-violet-500/20",     icon: FolderKanban },
  finance:       { label: "Finance",       color: "text-emerald-500",bgColor: "bg-emerald-500/10 border-emerald-500/20",  icon: Sparkles },
  hiring:        { label: "Hiring",        color: "text-orange-500",bgColor: "bg-orange-500/10 border-orange-500/20",     icon: Users },
  system:        { label: "System",        color: "text-muted-foreground",bgColor: "bg-secondary/30 border-border/50",     icon: Zap },
};

const eventDot: Record<string, string> = {
  completed:   "bg-success shadow-[0_0_8px_hsl(173,58%,44%,0.5)]",
  active:      "bg-primary shadow-[0_0_8px_hsl(213,55%,52%,0.5)]",
  "in-progress": "bg-info shadow-[0_0_8px_hsl(258,50%,60%,0.5)]",
  pending:     "bg-warning shadow-[0_0_8px_hsl(38,88%,52%,0.5)]",
  rejected:    "bg-destructive shadow-[0_0_8px_hsl(0,72%,51%,0.5)]",
};

const heatColors = [
  "bg-secondary/20 border-border/40",
  "bg-info/20 border-info/30",
  "bg-primary/20 border-primary/30",
  "bg-primary/40 border-primary/40",
  "bg-primary/60 border-primary/50",
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const AUDIT_PAGE_SIZE = 4;
const ACTIVITY_PAGE_SIZE = 5;
const TEAM_PAGE_SIZE = 5;

const auditActionTone: Record<string, string> = {
  create: "text-success bg-success/10 border-success/20",
  update: "text-info bg-info/10 border-info/20",
  delete: "text-destructive bg-destructive/10 border-destructive/20",
  login: "text-primary bg-primary/10 border-primary/20",
  logout: "text-muted-foreground bg-secondary/30 border-border/50",
  stage_change: "text-warning bg-warning/10 border-warning/20",
  email_sent: "text-primary bg-primary/10 border-primary/20",
};

function formatTime(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return value;
  return timestamp.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatCategoryLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ActivityPage() {
  const { role } = useTheme();
  const canSeeAuditTrail = role === "admin" || role === "manager";
  const { data: dashboard, isLoading, error: dashboardError, refetch } = useDashboardData();
  const { data: auditLogs = [] } = useAuditLogs(4, { enabled: canSeeAuditTrail });
  const { data: upcomingMeetings = [] } = useQuery({
    queryKey: ["upcoming-meetings"],
    queryFn: () => crmService.getUpcomingMeetings(5),
    refetchInterval: 60000,
  });

  const { refresh, isRefreshing } = useRefresh();

  const handleRefresh = async () => {
    await refresh(() => refetch(), {
      message: getRefreshMessage("activity"),
      successMessage: getRefreshSuccessMessage("activity"),
    });
  };

  const [selectedHeatCell, setSelectedHeatCell] = useState<number | null>(null);
  const [activityFilter, setActivityFilter] = useState<FilterId>("all");
  const [visibleAuditCount, setVisibleAuditCount] = useState(AUDIT_PAGE_SIZE);
  const [visibleActivityCount, setVisibleActivityCount] = useState(ACTIVITY_PAGE_SIZE);
  const [visibleTeamCount, setVisibleTeamCount] = useState(TEAM_PAGE_SIZE);
  const [visibleFocusCount, setVisibleFocusCount] = useState(3);
  const FOCUS_PAGE_SIZE = 3;

  const heatmap = useMemo(() => {
    const raw = dashboard?.activityHeatmap ?? [];
    const maxCount = Math.max(...raw.map(d => d.count), 1);
    return raw.map((cell, index) => ({
      index, date: cell.date, count: cell.count,
      intensity: cell.count === 0 ? 0 : Math.min(4, Math.ceil((cell.count / maxCount) * 4)),
    }));
  }, [dashboard?.activityHeatmap]);

  const visibleActivity = useMemo(
    () => (dashboard?.activityFeed ?? []).filter(i => activityFilter === "all" || i.category === activityFilter),
    [activityFilter, dashboard?.activityFeed],
  );

  useEffect(() => {
    setVisibleActivityCount(ACTIVITY_PAGE_SIZE);
  }, [activityFilter]);

  const filterCounts = useMemo(() => {
    const feed = dashboard?.activityFeed ?? [];
    return (Object.keys(filterConfig) as FilterId[]).reduce<Record<FilterId, number>>((acc, key) => {
      acc[key] = key === "all" ? feed.length : feed.filter((item) => item.category === key).length;
      return acc;
    }, { all: 0, collaboration: 0, sales: 0, delivery: 0, finance: 0, hiring: 0, system: 0 });
  }, [dashboard?.activityFeed]);

  if (dashboardError) return <ErrorFallback title="Activity failed to load" error={dashboardError} onRetry={() => refetch()} retryLabel="Retry" />;
  if (isLoading || !dashboard) return <ActivitySkeleton />;

  const executionReadiness = dashboard.executionReadiness ?? 0;
  const unreadMessages = dashboard.unreadMessages ?? 0;
  const collaborators = dashboard.collaborators ?? [];
  const focusPoints = dashboard.todayFocus ?? [];
  const hasHeatmapData = heatmap.some(c => c.count > 0);
  const selectedHeat = selectedHeatCell !== null ? heatmap[selectedHeatCell] ?? null : null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Hero Section */}
      <motion.section variants={item} className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-info to-success" />
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-primary/5 to-info/5 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-gradient-to-tr from-success/5 to-primary/5 blur-3xl" />

        <div className={cn("relative", SPACING.card)}>
          <div className="mb-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Overview
              </div>
              <h1 className="font-display text-4xl font-semibold text-foreground">
                Live Activity <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">& Signals</span>
              </h1>
              <p className={cn("max-w-xl text-muted-foreground", TEXT.bodyRelaxed)}>
                Review workspace activity, focus areas, and audit trails in one unified view.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn("gap-2 font-semibold", RADIUS.lg)}
            >
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          {/* Stats & Content Grid */}
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            {/* Left: Stats & Filters */}
            <div className="space-y-5">
              {/* KPI Cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Events", value: visibleActivity.length, note: "Workspace pulse", icon: Activity, gradient: "from-primary to-primary/60" },
                  { label: "Unread", value: unreadMessages, note: unreadMessages > 0 ? "Needs attention" : "Inbox clear", icon: MessageSquare, gradient: "from-info to-info/60" },
                  { label: "Present", value: collaborators.length, note: "Team members", icon: Users, gradient: "from-success to-success/60" },
                ].map((stat) => (
                  <div key={stat.label} className="relative overflow-hidden rounded-2xl border border-border/60 bg-secondary/20 p-5 group hover:bg-secondary/30 transition-colors">
                    <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", stat.gradient)} />
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br border", stat.gradient, "text-white border-transparent")}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                        <p className={cn("text-muted-foreground", TEXT.meta)}>{stat.label}</p>
                      </div>
                    </div>
                    <p className={cn("mt-3 text-xs text-muted-foreground", TEXT.meta)}>{stat.note}</p>
                  </div>
                ))}
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap gap-2">
                {(Object.keys(filterConfig) as FilterId[]).map((id) => {
                  const cfg = filterConfig[id];
                  const Icon = cfg.icon;
                  const isActive = activityFilter === id;
                  return (
                    <button
                      key={id}
                      onClick={() => setActivityFilter(id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                        isActive
                          ? `${cfg.bgColor} shadow-sm scale-[1.02]`
                          : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-border hover:bg-secondary/50",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                      <span className={cn("ml-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs", isActive ? "text-inherit" : "text-muted-foreground")}>
                        {filterCounts[id]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Execution & Focus */}
            <div className="space-y-4">
              {/* Execution Readiness */}
              <div className={cn("overflow-hidden rounded-2xl border border-border/60 bg-secondary/20 p-5", RADIUS.xl)}>
                <div className="flex items-center gap-4">
                  <ProgressRing value={executionReadiness} size={72} strokeWidth={6} label="" sublabel="" />
                  <div>
                    <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Execution Readiness</p>
                    <p className="text-3xl font-display font-bold text-foreground">{executionReadiness}%</p>
                    <p className={cn("text-xs text-muted-foreground", TEXT.meta)}>Live workspace metrics</p>
                  </div>
                </div>
              </div>

              {/* Today's Focus */}
              <div className={cn("overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-5", RADIUS.xl)}>
                <p className={cn("mb-4 flex items-center gap-2 text-muted-foreground", TEXT.eyebrow)}>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  Today's Focus
                </p>
                <div className="space-y-3">
                  {focusPoints.length > 0 ? (
                    <>
                      {focusPoints.slice(0, visibleFocusCount).map((point, i) => (
                        <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/80 p-3">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-success shrink-0" />
                          <p className={cn("text-sm text-foreground", TEXT.body)}>{point}</p>
                        </div>
                      ))}
                      {focusPoints.length > visibleFocusCount && (
                        <button
                          onClick={() => setVisibleFocusCount(v => Math.min(v + FOCUS_PAGE_SIZE, focusPoints.length))}
                          className="w-full text-center text-sm text-primary hover:underline"
                        >
                          Show more ({focusPoints.length - visibleFocusCount})
                        </button>
                      )}
                    </>
                  ) : (
                    <p className={cn("text-center text-muted-foreground py-4", TEXT.body)}>No focus points yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Main Content Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Activity Timeline */}
          <motion.section variants={item} className={cn("overflow-hidden border border-border/60 bg-card shadow-card", RADIUS.xl)}>
            <div className={cn("border-b border-border/60 bg-secondary/20 px-6 py-4", SPACING.cardCompact)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Live Timeline</p>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    {activityFilter === "all" ? "Everything happening now" : `${formatCategoryLabel(activityFilter)} activity`}
                  </h2>
                </div>
                <StatusBadge status={activityFilter} />
              </div>
            </div>

            <div className={cn("p-6", SPACING.card)}>
              <AnimatePresence mode="wait">
                <motion.div key={activityFilter} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-0">
                  {visibleActivity.length > 0 ? (
                    <>
                      {visibleActivity.slice(0, visibleActivityCount).map((event, i) => {
                        const dot = eventDot[event.type] ?? "bg-muted-foreground/40";
                        const catCfg = filterConfig[event.category as FilterId] ?? filterConfig.system;
                        const CatIcon = catCfg.icon;
                        const slicedLen = Math.min(visibleActivityCount, visibleActivity.length);
                        return (
                          <motion.article
                            key={event.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className={cn("group relative py-5", i !== slicedLen - 1 && "border-b border-border/40")}
                          >
                            <div className="absolute left-[11px] top-0 bottom-0 w-px bg-gradient-to-b from-border via-border/50 to-transparent" />
                            <div className="relative flex items-start gap-4">
                              <div className={cn("relative z-10 mt-1.5 h-3 w-3 rounded-full", dot)} />
                              <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", catCfg.bgColor)}>
                                    <CatIcon className="h-3 w-3" />
                                    {formatCategoryLabel(event.category)}
                                  </span>
                                  {event.source && (
                                    <span className="text-xs text-muted-foreground">{event.source}</span>
                                  )}
                                </div>
                                <p className={cn("font-medium text-foreground", TEXT.body)}>{event.text}</p>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="rounded-full border border-border/60 bg-secondary/40 px-2.5 py-1">
                                  {event.time}
                                </span>
                                <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                              </div>
                            </div>
                          </motion.article>
                        );
                      })}
                      <div className="mt-4 flex justify-center">
                        <ShowMoreButton
                          total={visibleActivity.length}
                          visible={visibleActivityCount}
                          pageSize={ACTIVITY_PAGE_SIZE}
                          onShowMore={() => setVisibleActivityCount(v => Math.min(v + ACTIVITY_PAGE_SIZE, visibleActivity.length))}
                          onShowLess={() => setVisibleActivityCount(ACTIVITY_PAGE_SIZE)}
                        />
                      </div>
                    </>
                  ) : (
                    <div className={cn("border border-dashed border-border/60 bg-secondary/10 rounded-2xl p-12 text-center", RADIUS.xl)}>
                      <Activity className="mx-auto h-10 w-10 text-muted-foreground/30 mb-4" />
                      <h3 className="font-display text-lg font-semibold text-foreground">No activity yet</h3>
                      <p className={cn("mt-2 text-muted-foreground max-w-sm mx-auto", TEXT.body)}>
                        Start creating records to see live activity here.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.section>

          {/* Activity Heatmap */}
          <motion.section variants={item} className={cn("border border-border/60 bg-card shadow-card", RADIUS.xl, SPACING.card)}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Activity Density</p>
                <h2 className="font-display text-xl font-semibold text-foreground">Last 28 days</h2>
              </div>
              <span className="rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {selectedHeat ? `${selectedHeat.count} events` : hasHeatmapData ? "Tap a day" : "No data"}
              </span>
            </div>

            {hasHeatmapData ? (
              <>
                <div className="grid grid-cols-7 gap-2">
                  {heatmap.map(cell => (
                    <button
                      key={cell.index}
                      onClick={() => setSelectedHeatCell(cell.index === selectedHeatCell ? null : cell.index)}
                      title={`${cell.date}: ${cell.count} events`}
                      className={cn(
                        "aspect-square rounded-xl border transition-all duration-200 hover:scale-110 hover:-translate-y-0.5",
                        heatColors[cell.intensity],
                        selectedHeatCell === cell.index && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background scale-110",
                      )}
                    />
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span>Less</span>
                    <div className="flex gap-1">
                      {heatColors.map((c, i) => <div key={i} className={cn("h-2.5 w-2.5 rounded-sm border", c)} />)}
                    </div>
                    <span>More</span>
                  </div>
                  <p className={cn("text-muted-foreground", TEXT.meta)}>
                    {selectedHeat ? `${selectedHeat.date}: ${selectedHeat.count} events` : "Click a day for details"}
                  </p>
                </div>
              </>
            ) : (
              <div className={cn("border border-dashed border-border/60 bg-secondary/10 rounded-2xl p-8 text-center", RADIUS.lg)}>
                <Activity className="mx-auto h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="font-semibold text-foreground">No activity data yet</p>
                <p className={cn("mt-1 text-muted-foreground", TEXT.body)}>Activity will appear as you use the workspace.</p>
              </div>
            )}
          </motion.section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Team Present */}
          <motion.section variants={item} className={cn("border border-border/60 bg-card shadow-card", RADIUS.xl, SPACING.card)}>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success border border-success/20">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Team Present</p>
                  <p className={cn("text-muted-foreground", TEXT.meta)}>{collaborators.length} in attendance</p>
                </div>
              </div>
            </div>

            {collaborators.length > 0 ? (
              <div className="space-y-3">
                {collaborators.slice(0, visibleTeamCount).map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/20 p-3 transition-colors hover:bg-secondary/30">
                    <div className="relative">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-primary to-info text-sm font-bold text-white">
                        {c.avatar}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn("text-xs text-muted-foreground capitalize", TEXT.meta)}>{c.role}</span>
                        <StatusBadge status={c.status} />
                      </div>
                    </div>
                  </div>
                ))}
                {collaborators.length > visibleTeamCount && (
                  <button
                    onClick={() => setVisibleTeamCount(v => Math.min(v + TEAM_PAGE_SIZE, collaborators.length))}
                    className="w-full text-center text-sm text-primary hover:underline"
                  >
                    Show more ({collaborators.length - visibleTeamCount})
                  </button>
                )}
              </div>
            ) : (
              <div className={cn("border border-dashed border-border/60 bg-secondary/10 rounded-xl p-6 text-center", RADIUS.lg)}>
                <Users className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className={cn("text-muted-foreground", TEXT.body)}>No team members present</p>
              </div>
            )}
          </motion.section>

          {/* Audit Trail */}
          {canSeeAuditTrail && (
            <motion.section variants={item} className={cn("border border-border/60 bg-card shadow-card", RADIUS.xl, SPACING.card)}>
              <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Audit Trail</p>
                    <p className={cn("text-muted-foreground", TEXT.meta)}>Recent changes</p>
                  </div>
                </div>
              </div>

              {auditLogs.length > 0 ? (
                <div className="space-y-0">
                  {auditLogs.slice(0, visibleAuditCount).map((log, index) => (
                    <div key={log.id} className={cn("py-4", index !== Math.min(visibleAuditCount, auditLogs.length) - 1 && "border-b border-border/40")}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={cn("font-medium text-foreground", TEXT.body)}>
                            {log.userName} <span className="text-muted-foreground">{log.action.replace("_", " ")}</span> {log.entity}
                          </p>
                          <p className={cn("mt-0.5 text-muted-foreground", TEXT.meta)}>{log.detail ?? "No details"}</p>
                        </div>
                        <span className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase", auditActionTone[log.action] ?? "border-border/50 bg-secondary/30 text-muted-foreground")}>
                          {log.action.replace("_", " ")}
                        </span>
                      </div>
                      <p className={cn("mt-1 text-xs text-muted-foreground", TEXT.meta)}>{formatTime(log.createdAt)}</p>
                    </div>
                  ))}
                  <div className="mt-3">
                    <ShowMoreButton
                      total={auditLogs.length}
                      visible={visibleAuditCount}
                      pageSize={AUDIT_PAGE_SIZE}
                      onShowMore={() => setVisibleAuditCount(v => Math.min(v + AUDIT_PAGE_SIZE, auditLogs.length))}
                      onShowLess={() => setVisibleAuditCount(AUDIT_PAGE_SIZE)}
                    />
                  </div>
                </div>
              ) : (
                <div className={cn("border border-dashed border-border/60 bg-secondary/10 rounded-xl p-6 text-center", RADIUS.lg)}>
                  <Zap className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className={cn("text-muted-foreground", TEXT.body)}>No audit entries yet</p>
                </div>
              )}
            </motion.section>
          )}
        </div>
      </div>

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <motion.section variants={item} className="rounded-2xl border border-border/60 bg-card shadow-card overflow-hidden">
          <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-primary to-info" />
          <div className={cn("p-5", SPACING.section)}>
            <div className="flex items-center gap-2 mb-4">
              <Video className="h-4 w-4 text-primary" />
              <h3 className={cn("font-semibold text-foreground", TEXT.heading)}>Upcoming Meetings</h3>
              <span className="ml-auto text-xs text-muted-foreground">{upcomingMeetings.length} scheduled</span>
            </div>
            <div className="space-y-2">
              {upcomingMeetings.map((meeting: MeetingRecord) => (
                <div key={meeting.id} className="flex items-center justify-between rounded-xl border border-border/40 bg-secondary/20 px-4 py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Video className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{meeting.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(meeting.scheduledAt).toLocaleString()} · {meeting.duration}min · {meeting.inviteeName}
                      </p>
                    </div>
                  </div>
                  {meeting.meetingUrl && (
                    <a
                      href={meeting.meetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Join
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}
