import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, CheckCircle2, ChevronRight, Clock3, FolderKanban, MessageSquare, Sparkles, TrendingUp, Users, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import ProgressRing from "@/components/shared/ProgressRing";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuditLogs, useDashboardData } from "@/hooks/use-crm-data";
import { cn } from "@/lib/utils";

type FilterId = "all" | "collaboration" | "sales" | "delivery" | "finance" | "hiring" | "system";

const filterConfig: Record<FilterId, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  all:           { label: "All",           color: "text-foreground bg-secondary/40 border-border/60",          icon: Activity },
  collaboration: { label: "Collab",        color: "text-primary bg-primary/10 border-primary/20",              icon: Users },
  sales:         { label: "Sales",         color: "text-blue-500 bg-blue-500/10 border-blue-500/20",           icon: TrendingUp },
  delivery:      { label: "Delivery",      color: "text-violet-500 bg-violet-500/10 border-violet-500/20",     icon: FolderKanban },
  finance:       { label: "Finance",       color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",  icon: Sparkles },
  hiring:        { label: "Hiring",        color: "text-orange-500 bg-orange-500/10 border-orange-500/20",     icon: Users },
  system:        { label: "System",        color: "text-muted-foreground bg-secondary/30 border-border/50",    icon: Zap },
};

const eventDot: Record<string, string> = {
  completed:   "bg-success",
  active:      "bg-primary",
  "in-progress": "bg-info",
  pending:     "bg-warning",
  rejected:    "bg-destructive",
};

const heatColors = [
  "bg-secondary/20 border-border/40",
  "bg-info/20 border-info/20",
  "bg-primary/25 border-primary/20",
  "bg-primary/45 border-primary/30",
  "bg-primary/70 border-primary/50",
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } };
const AUDIT_PAGE_SIZE = 4;
const ACTIVITY_PAGE_SIZE = 4;
const TEAM_PAGE_SIZE = 4;
const auditActionTone: Record<string, string> = {
  create: "text-success bg-success/10 border-success/20",
  update: "text-info bg-info/10 border-info/20",
  delete: "text-destructive bg-destructive/10 border-destructive/20",
  login: "text-primary bg-primary/10 border-primary/20",
  logout: "text-muted-foreground bg-secondary/30 border-border/50",
  stage_change: "text-warning bg-warning/10 border-warning/20",
  email_sent: "text-primary bg-primary/10 border-primary/20",
};
const attendanceTone: Record<string, string> = {
  present: "border-success/20 bg-success/10 text-success",
  remote: "border-info/25 bg-info/15 text-foreground",
  late: "border-warning/20 bg-warning/10 text-warning",
  absent: "border-destructive/20 bg-destructive/10 text-destructive",
};

function formatAuditTime(value: string) {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatCategoryLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function ActivityPage() {
  const { role } = useTheme();
  const canSeeAuditTrail = role === "admin" || role === "manager";
  const { data: dashboard, isLoading, error: dashboardError, refetch } = useDashboardData();
  const { data: auditLogs = [] } = useAuditLogs(4, { enabled: canSeeAuditTrail });

  const handleRefresh = async () => {
    const start = Date.now();
    await Promise.all([refetch()]);
    const duration = Date.now() - start;
    if (duration < 600) await new Promise(r => setTimeout(r, 600 - duration));
  };
  const [selectedHeatCell, setSelectedHeatCell] = useState<number | null>(null);
  const [activityFilter, setActivityFilter] = useState<FilterId>("all");
  const [visibleAuditCount, setVisibleAuditCount] = useState(AUDIT_PAGE_SIZE);
  const [visibleActivityCount, setVisibleActivityCount] = useState(ACTIVITY_PAGE_SIZE);
  const [visibleTeamCount, setVisibleTeamCount] = useState(TEAM_PAGE_SIZE);
  const [visibleFocusCount, setVisibleFocusCount] = useState(4);
  const FOCUS_PAGE_SIZE = 4;

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

  // Reset activity pagination when filter changes
  useEffect(() => {
    setVisibleActivityCount(ACTIVITY_PAGE_SIZE);
  }, [activityFilter]);
  const filterCounts = useMemo(() => {
    const feed = dashboard?.activityFeed ?? [];
    return (Object.keys(filterConfig) as FilterId[]).reduce<Record<FilterId, number>>((acc, key) => {
      acc[key] = key === "all" ? feed.length : feed.filter((item) => item.category === key).length;
      return acc;
    }, {
      all: 0,
      collaboration: 0,
      sales: 0,
      delivery: 0,
      finance: 0,
      hiring: 0,
      system: 0,
    });
  }, [dashboard?.activityFeed]);

  if (dashboardError) return <ErrorFallback title="Activity failed to load" error={dashboardError} onRetry={() => refetch()} retryLabel="Retry" />;
  if (isLoading || !dashboard) return <PageLoader />;

  const executionReadiness = dashboard.executionReadiness ?? 0;
  const unreadMessages = dashboard.unreadMessages ?? 0;
  const collaborators = dashboard.collaborators ?? [];
  const focusPoints = dashboard.todayFocus ?? [];
  const hasHeatmapData = heatmap.some(c => c.count > 0);
  const selectedHeat = selectedHeatCell !== null ? heatmap[selectedHeatCell] ?? null : null;
  const activityStats = [
    {
      label: "Events in feed",
      value: String(visibleActivity.length),
      note: activityFilter === "all" ? "Current workspace pulse" : `${formatCategoryLabel(activityFilter)} stream`,
      icon: Activity,
      tone: "border-primary/15 bg-primary/10 text-primary",
    },
    {
      label: "Unread threads",
      value: String(unreadMessages),
      note: unreadMessages > 0 ? "Needs follow-up" : "Inbox is clear",
      icon: MessageSquare,
      tone: "border-info/25 bg-info/15 text-foreground",
    },
    {
      label: "Team present",
      value: String(collaborators.length),
      note: collaborators.length > 0 ? "Attendance-backed presence" : "No present or remote members",
      icon: Users,
      tone: "border-success/20 bg-success/10 text-success",
    },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(140deg,hsl(var(--card))_0%,hsl(var(--card))_52%,hsl(var(--secondary)/0.95)_100%)] p-6 shadow-card"
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_42%),radial-gradient(circle_at_top_right,hsl(var(--success)/0.14),transparent_36%)]" />
        <div className="relative grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Workspace Pulse
              </div>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h1 className="max-w-3xl font-display text-4xl font-semibold tracking-[-0.05em] text-foreground">
                  One clean view for flow, signals, and execution momentum.
                </h1>
                <motion.div whileTap={{ scale: 0.94 }}>
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border-border/70 bg-background/50 px-4 font-semibold text-foreground backdrop-blur-sm transition"
                  >
                    <RefreshCw className={cn("h-4 w-4 text-primary", isLoading && "animate-spin")} />
                    {isLoading ? "Refreshing..." : "Refresh Pulse"}
                  </Button>
                </motion.div>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Review live activity, focus areas, and audit movement without jumping between modules.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {activityStats.map(({ label, value, note, icon: Icon, tone }) => (
                <div key={label} className="rounded-[1.35rem] border border-border/70 bg-background/72 p-4 backdrop-blur-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
                      <p className="mt-2 font-display text-3xl font-semibold text-foreground">{value}</p>
                    </div>
                    <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border", tone)}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{note}</p>
                </div>
              ))}
            </div>

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
                      "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
                      isActive
                        ? `${cfg.color} shadow-sm`
                        : "border-border/70 bg-background/70 text-muted-foreground hover:border-border hover:bg-background hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                    <span className="rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px] font-semibold text-inherit">
                      {filterCounts[id]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-[1.6rem] border border-border/70 bg-background/78 p-5 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <ProgressRing value={executionReadiness} size={64} strokeWidth={6} label="" sublabel="" />
                <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Execution Readiness</p>
                  <p className="mt-1 font-display text-3xl font-semibold text-foreground">{executionReadiness}%</p>
                  <p className="mt-1 text-xs text-muted-foreground">Calculated from live workspace records.</p>
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[1.6rem] border border-primary/15 bg-[linear-gradient(160deg,hsl(var(--primary)/0.12),hsl(var(--card))_38%,hsl(var(--secondary)/0.85)_100%)] p-5 shadow-lg">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_34%),radial-gradient(circle_at_bottom_left,hsl(var(--success)/0.1),transparent_32%)]" />
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Today’s Focus</p>
                <div className="mt-4 space-y-3">
                  {focusPoints.length > 0 ? (
                    <>
                    {focusPoints.slice(0, visibleFocusCount).map((point, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-2xl border border-border/70 bg-background/65 px-3 py-2.5 backdrop-blur-sm">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" />
                        <p className="text-sm text-foreground">{point}</p>
                      </div>
                    ))}
                    <ShowMoreButton
                      total={focusPoints.length}
                      visible={visibleFocusCount}
                      pageSize={FOCUS_PAGE_SIZE}
                      onShowMore={() => setVisibleFocusCount(v => Math.min(v + FOCUS_PAGE_SIZE, focusPoints.length))}
                      onShowLess={() => setVisibleFocusCount(FOCUS_PAGE_SIZE)}
                      className="mt-2"
                    />
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No focus prompts yet. Add more operational data to generate the daily brief.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">

        <div className="space-y-5">
          <motion.section variants={item} className="overflow-hidden rounded-[1.85rem] border border-border/70 bg-card/90 shadow-card">
            <div className="border-b border-border/60 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.35),transparent)] px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Live Timeline</p>
                  <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">
                    {activityFilter === "all" ? "Everything happening now" : `${formatCategoryLabel(activityFilter)} activity`}
                  </h2>
                </div>
                <div className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {visibleActivity.length} visible events
                </div>
              </div>
            </div>

            <div className="p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activityFilter}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-0"
                >
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
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className={cn(
                            "group relative grid gap-3 py-4 md:grid-cols-[36px_1fr_auto]",
                            i !== slicedLen - 1 && "border-b border-border/50",
                          )}
                        >
                          <div className="relative flex items-start justify-center">
                            <span className={cn("relative z-10 mt-1.5 h-3 w-3 rounded-full ring-4 ring-background", dot)} />
                            {i !== slicedLen - 1 && (
                              <span className="absolute top-5 h-[calc(100%+0.75rem)] w-px bg-border/70" />
                            )}
                          </div>

                          <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]", catCfg.color)}>
                                <CatIcon className="h-3 w-3" />
                                {formatCategoryLabel(event.category)}
                              </span>
                              {event.source && (
                                <span className="text-[11px] font-medium text-muted-foreground">{event.source}</span>
                              )}
                            </div>
                            <p className="max-w-2xl text-sm font-medium leading-6 text-foreground">{event.text}</p>
                          </div>

                          <div className="flex items-start md:justify-end">
                            <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-secondary/25 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                              {event.time}
                              <ChevronRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                            </div>
                          </div>
                        </motion.article>
                      );
                    })}
                    <ShowMoreButton
                      total={visibleActivity.length}
                      visible={visibleActivityCount}
                      pageSize={ACTIVITY_PAGE_SIZE}
                      onShowMore={() => setVisibleActivityCount(v => Math.min(v + ACTIVITY_PAGE_SIZE, visibleActivity.length))}
                      onShowLess={() => setVisibleActivityCount(ACTIVITY_PAGE_SIZE)}
                      className="mt-2"
                    />
                    </>
                  ) : (
                    <div className="rounded-[1.6rem] border border-dashed border-border/60 bg-secondary/10 p-12 text-center">
                      <Activity className="mx-auto mb-4 h-9 w-9 text-muted-foreground/35" />
                      <p className="font-display text-xl font-semibold text-foreground">
                        No {activityFilter === "all" ? "" : `${activityFilter} `}activity yet
                      </p>
                      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                        Add clients, projects, tasks, or messages to start filling this timeline with real operating signals.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.section>

          <motion.section variants={item} className="rounded-[1.7rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Activity Density</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Last 28 days</h2>
              </div>
              <div className="rounded-full border border-border/70 bg-secondary/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {selectedHeat ? `${selectedHeat.count} events` : hasHeatmapData ? "Tap a day" : "No data"}
              </div>
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
                        "group aspect-square rounded-xl border transition duration-200 hover:-translate-y-0.5",
                        heatColors[cell.intensity],
                        selectedHeatCell === cell.index && "ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
                      )}
                    >
                      <span className="sr-only">{cell.date}: {cell.count} events</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Less</span>
                    <div className="flex gap-1">
                      {heatColors.map((c, i) => <div key={i} className={cn("h-2.5 w-2.5 rounded-sm border", c)} />)}
                    </div>
                    <span>More</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedHeat ? `${selectedHeat.date} recorded ${selectedHeat.count} events.` : "Activity is derived from recent records across tasks, clients, projects, and invoices."}
                  </p>
                </div>
              </>
            ) : (
              <div className="rounded-[1.4rem] border border-dashed border-border/60 bg-secondary/10 p-8 text-center">
                <Activity className="mx-auto mb-3 h-7 w-7 text-muted-foreground/35" />
                <p className="font-semibold text-foreground">No recent activity density yet</p>
                <p className="mt-1 text-sm text-muted-foreground">Once the workspace starts generating records, the heatmap will show where activity clusters over time.</p>
              </div>
            )}
          </motion.section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <motion.section variants={item} className="rounded-[1.7rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Team present</p>
                <p className="text-xs text-muted-foreground">Members marked present, remote, or late in attendance.</p>
              </div>
              <span className="ml-auto rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-success">
                {collaborators.length} in attendance
              </span>
            </div>
            {collaborators.length > 0 ? (
              <div className="space-y-2.5">
                {collaborators.slice(0, visibleTeamCount).map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-[1.15rem] border border-border/60 bg-secondary/10 px-3.5 py-3">
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-foreground">
                        {c.avatar}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{c.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <p className="text-[11px] text-muted-foreground">{c.role}</p>
                        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]", attendanceTone[c.status] ?? "border-border/50 bg-secondary/30 text-muted-foreground")}>
                          {formatCategoryLabel(c.status)}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">Updated {formatAuditTime(c.lastSeen)}</p>
                    </div>
                  </div>
                ))}
                <ShowMoreButton
                  total={collaborators.length}
                  visible={visibleTeamCount}
                  pageSize={TEAM_PAGE_SIZE}
                  onShowMore={() => setVisibleTeamCount(v => Math.min(v + TEAM_PAGE_SIZE, collaborators.length))}
                  onShowLess={() => setVisibleTeamCount(TEAM_PAGE_SIZE)}
                />
              </div>
            ) : (
              <div className="rounded-[1.3rem] border border-dashed border-border/60 bg-secondary/10 p-5 text-sm text-muted-foreground">
                No team members are marked present, remote, or late yet.
              </div>
            )}
          </motion.section>

          <motion.section variants={item} className="rounded-[1.7rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-warning" />
              <div>
                <p className="text-sm font-semibold text-foreground">Priority focus</p>
                <p className="text-xs text-muted-foreground">What deserves attention from the current workspace state.</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {focusPoints.length > 0 ? focusPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2.5 rounded-[1.15rem] border border-border/60 bg-secondary/10 px-3.5 py-3">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" />
                  <p className="text-sm leading-6 text-foreground">{point}</p>
                </div>
              )) : (
                <div className="rounded-[1.3rem] border border-dashed border-border/60 bg-secondary/10 p-5 text-sm text-muted-foreground">
                  Add clients and projects to generate a stronger daily brief here.
                </div>
              )}
            </div>
          </motion.section>

          {canSeeAuditTrail ? (
            <motion.section variants={item} className="rounded-[1.7rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Audit trail</p>
                <p className="text-xs text-muted-foreground">Recent record changes and security-sensitive actions.</p>
              </div>
            </div>
            {auditLogs.length > 0 ? (
              <>
                <div className="space-y-0">
                  {auditLogs.slice(0, visibleAuditCount).map((log, index) => (
                    <div
                      key={log.id}
                      className={cn(
                        "space-y-2 py-3",
                        index !== Math.min(visibleAuditCount, auditLogs.length) - 1 && "border-b border-border/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-6 text-foreground">
                            {log.userName} {log.action.replace("_", " ")} {log.entity}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {log.detail ?? "No additional detail"}
                          </p>
                        </div>
                        <span className={cn(
                          "rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]",
                          auditActionTone[log.action] ?? "text-muted-foreground bg-secondary/30 border-border/50",
                        )}>
                          {log.action.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{formatAuditTime(log.createdAt)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <ShowMoreButton
                    total={auditLogs.length}
                    visible={visibleAuditCount}
                    pageSize={Math.max(auditLogs.length - AUDIT_PAGE_SIZE, 1)}
                    onShowMore={() => setVisibleAuditCount(auditLogs.length)}
                    onShowLess={() => setVisibleAuditCount(AUDIT_PAGE_SIZE)}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-[1.3rem] border border-dashed border-border/60 bg-secondary/10 p-5 text-sm text-muted-foreground">
                No audit entries yet. Create, update, or delete records to start tracking changes here.
              </div>
            )}
            </motion.section>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
