import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, CheckCircle2, Clock3, FolderKanban, MessageSquare, Sparkles, TrendingUp, Users, Zap } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import ProgressRing from "@/components/shared/ProgressRing";
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
const auditActionTone: Record<string, string> = {
  create: "text-success bg-success/10 border-success/20",
  update: "text-info bg-info/10 border-info/20",
  delete: "text-destructive bg-destructive/10 border-destructive/20",
  login: "text-primary bg-primary/10 border-primary/20",
  logout: "text-muted-foreground bg-secondary/30 border-border/50",
  stage_change: "text-warning bg-warning/10 border-warning/20",
  email_sent: "text-primary bg-primary/10 border-primary/20",
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

export default function ActivityPage() {
  const { data: dashboard, isLoading, error: dashboardError, refetch } = useDashboardData();
  const { data: auditLogs = [] } = useAuditLogs(8);
  const [selectedHeatCell, setSelectedHeatCell] = useState<number | null>(null);
  const [activityFilter, setActivityFilter] = useState<FilterId>("all");

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

  if (dashboardError) return <ErrorFallback title="Activity failed to load" error={dashboardError} onRetry={() => refetch()} retryLabel="Retry" />;
  if (isLoading || !dashboard) return <PageLoader />;

  const executionReadiness = dashboard.executionReadiness ?? 0;
  const unreadMessages = dashboard.unreadMessages ?? 0;
  const collaborators = dashboard.collaborators ?? [];
  const focusPoints = dashboard.todayFocus ?? [];
  const hasHeatmapData = heatmap.some(c => c.count > 0);
  const selectedHeat = selectedHeatCell !== null ? heatmap[selectedHeatCell] ?? null : null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">

      {/* Header + stats */}
      <motion.section variants={item} className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Overview
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Activity</h1>
            <p className="text-sm text-muted-foreground">Live workspace events, team presence, and execution readiness.</p>
          </div>

          {/* Execution ring */}
          <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-secondary/20 px-5 py-3">
            <ProgressRing value={executionReadiness} size={56} strokeWidth={6} label="" sublabel="" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Execution</p>
              <p className="font-display text-2xl font-bold text-foreground">{executionReadiness}%</p>
              <p className="text-[10px] text-muted-foreground">from live DB records</p>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Events today", value: dashboard.activityFeed.length || "—", icon: Activity, color: "text-primary bg-primary/10" },
            { label: "Unread messages", value: unreadMessages || "—", icon: MessageSquare, color: "text-info bg-info/10" },
            { label: "Team online", value: collaborators.length || "—", icon: Users, color: "text-success bg-success/10" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/10 px-4 py-3">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0", color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="font-display text-xl font-bold text-foreground">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">

        {/* Activity feed */}
        <motion.div variants={item} className="space-y-3">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(filterConfig) as FilterId[]).map(id => {
              const cfg = filterConfig[id];
              const Icon = cfg.icon;
              const isActive = activityFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => setActivityFilter(id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                    isActive ? cfg.color : "border-border/60 bg-secondary/20 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Feed items */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activityFilter}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2"
            >
              {visibleActivity.length > 0 ? (
                visibleActivity.map((event, i) => {
                  const dot = eventDot[event.type] ?? "bg-muted-foreground/40";
                  const catCfg = filterConfig[event.category as FilterId] ?? filterConfig.system;
                  const CatIcon = catCfg.icon;
                  return (
                    <motion.article
                      key={event.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-start gap-3 rounded-[1.25rem] border border-border/60 bg-card/90 p-4 shadow-card"
                    >
                      <div className={cn("mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full", dot)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{event.text}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{event.time}</span>
                          {event.category && (
                            <>
                              <span>·</span>
                              <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-semibold", catCfg.color)}>
                                <CatIcon className="h-2.5 w-2.5" />
                                {event.category}
                              </span>
                            </>
                          )}
                          {event.source && <><span>·</span><span>{event.source}</span></>}
                        </div>
                      </div>
                    </motion.article>
                  );
                })
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-secondary/10 p-10 text-center">
                  <Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                  <p className="font-semibold text-foreground">No {activityFilter === "all" ? "" : activityFilter + " "}activity yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Add clients, projects, or tasks to see events here.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Collaborators */}
          <motion.div variants={item} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Team online</p>
              <span className="ml-auto rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">{collaborators.length} active</span>
            </div>
            {collaborators.length > 0 ? (
              <div className="space-y-2">
                {collaborators.map(c => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-secondary/10 px-3 py-2">
                    <div className="relative">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-foreground">{c.avatar}</div>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No team members yet. Add at People → Team.</p>
            )}
          </motion.div>

          {/* Today's focus */}
          <motion.div variants={item} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-warning" />
              <p className="text-sm font-semibold text-foreground">Today's focus</p>
            </div>
            <div className="space-y-2">
              {focusPoints.length > 0 ? focusPoints.map((point, i) => (
                <div key={i} className="flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/10 px-3 py-2.5">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-success" />
                  <p className="text-xs text-foreground">{point}</p>
                </div>
              )) : (
                <p className="text-xs text-muted-foreground">Add clients and projects to generate your daily brief.</p>
              )}
            </div>
          </motion.div>

          {/* Heatmap */}
          <motion.div variants={item} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">28-day activity</p>
              </div>
              {selectedHeat && (
                <span className="text-[10px] text-muted-foreground">{selectedHeat.date} · {selectedHeat.count} events</span>
              )}
            </div>

            {hasHeatmapData ? (
              <div className="grid grid-cols-7 gap-1.5">
                {heatmap.map(cell => (
                  <button
                    key={cell.index}
                    onClick={() => setSelectedHeatCell(cell.index === selectedHeatCell ? null : cell.index)}
                    title={`${cell.date}: ${cell.count} events`}
                    className={cn(
                      "aspect-square rounded-lg border transition hover:scale-110",
                      heatColors[cell.intensity],
                      selectedHeatCell === cell.index && "ring-2 ring-primary/50 ring-offset-1"
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5 opacity-20 pointer-events-none">
                {Array.from({ length: 28 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-lg border border-border/40 bg-secondary/20" />
                ))}
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-[9px] text-muted-foreground">
              <span>Less</span>
              <div className="flex gap-1">
                {heatColors.map((c, i) => <div key={i} className={cn("h-2.5 w-2.5 rounded-sm border", c)} />)}
              </div>
              <span>More</span>
            </div>
          </motion.div>

          <motion.div variants={item} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Audit trail</p>
            </div>
            {auditLogs.length > 0 ? (
              <div className="space-y-2.5">
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-border/60 bg-secondary/10 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {log.userName} {log.action.replace("_", " ")} {log.entity}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{log.detail ?? "No additional detail"}</p>
                      </div>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", auditActionTone[log.action] ?? "text-muted-foreground bg-secondary/30 border-border/50")}>
                        {log.action.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">{formatAuditTime(log.createdAt)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No audit entries yet. Create, update, or delete records to start tracking changes here.</p>
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
