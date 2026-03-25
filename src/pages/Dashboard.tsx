import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  GripVertical,
  MoveRight,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";

import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import PageLoader from "@/components/shared/PageLoader";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useClients, useDashboardData, useProjects } from "@/hooks/use-crm-data";
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";

const DashboardCharts = lazy(() => import("@/components/dashboard/DashboardCharts"));

type FocusItem = {
  id: string;
  text: string;
  source: "default" | "custom";
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};

export default function Dashboard() {
  const { role, color } = useTheme();
  const { openQuickCreate, openCommandPalette, canUseQuickCreate } = useWorkspace();
  const dashboardQuery = useDashboardData();
  const clientsQuery = useClients();
  const projectsQuery = useProjects();
  const dailyFocusKey = `crm-today-focus-${role}`;
  const dailyFocusOrderKey = `crm-today-focus-order-${role}`;

  const loading = dashboardQuery.isLoading || clientsQuery.isLoading || projectsQuery.isLoading;

  const dashboard = dashboardQuery.data;
  const clients = clientsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const [focusItems, setFocusItems] = useState<FocusItem[]>([]);
  const [focusDraft, setFocusDraft] = useState("");
  const [showFocusInput, setShowFocusInput] = useState(false);
  const [draggedFocusId, setDraggedFocusId] = useState<string | null>(null);
  const executionReadiness = dashboard?.executionReadiness ?? 0;

  useEffect(() => {
    if (!dashboard) return;
    const dayKey = new Date().toISOString().slice(0, 10);
    const customItems = readStoredJSON<Record<string, string[]>>(dailyFocusKey, {});
    const orderItems = readStoredJSON<Record<string, string[]>>(dailyFocusOrderKey, {});
    const defaults = (dashboard.todayFocus ?? []).map((text, index) => ({
      id: `default-${index}`,
      text,
      source: "default" as const,
    }));
    const custom = (customItems[dayKey] ?? []).map((text, index) => ({
      id: `custom-${dayKey}-${index}`,
      text,
      source: "custom" as const,
    }));
    const combined = [...defaults, ...custom];
    const savedOrder = orderItems[dayKey];

    if (savedOrder?.length) {
      const ordered = savedOrder
        .map((id) => combined.find((item) => item.id === id))
        .filter((item): item is FocusItem => Boolean(item));
      const remaining = combined.filter((item) => !savedOrder.includes(item.id));
      setFocusItems([...ordered, ...remaining]);
    } else {
      setFocusItems(combined);
    }
  }, [dashboard, dailyFocusKey, dailyFocusOrderKey]);

  const addFocusItem = () => {
    const trimmed = focusDraft.trim();
    if (!trimmed) return;

    const dayKey = new Date().toISOString().slice(0, 10);
    const nextId = `custom-${dayKey}-${Date.now().toString(36)}`;
    const parsed = readStoredJSON<Record<string, string[]>>(dailyFocusKey, {});
    const nextCustom = { ...parsed, [dayKey]: [...(parsed[dayKey] ?? []), trimmed] };
    writeStoredJSON(dailyFocusKey, nextCustom);
    const nextItem = { id: nextId, text: trimmed, source: "custom" as const };
    const nextItems = [...focusItems, nextItem];
    persistFocusOrder(nextItems);
    setFocusDraft("");
    setShowFocusInput(false);
  };

  const persistFocusOrder = (nextItems: FocusItem[]) => {
    const dayKey = new Date().toISOString().slice(0, 10);
    const parsed = readStoredJSON<Record<string, string[]>>(dailyFocusOrderKey, {});
    writeStoredJSON(dailyFocusOrderKey, { ...parsed, [dayKey]: nextItems.map((item) => item.id) });
    setFocusItems(nextItems);
  };

  const moveFocusItem = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromIndex = focusItems.findIndex((item) => item.id === fromId);
    const toIndex = focusItems.findIndex((item) => item.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const next = [...focusItems];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    persistFocusOrder(next);
  };

  const focusClients = useMemo(
    () => [...clients].sort((a, b) => b.healthScore - a.healthScore).slice(0, 3),
    [clients],
  );
  const atRiskClients = useMemo(
    () => [...clients].sort((a, b) => a.healthScore - b.healthScore).slice(0, 3),
    [clients],
  );
  const featuredProjects = useMemo(
    () => projects.filter((project) => project.status !== "completed").slice(0, 3),
    [projects],
  );

  if (loading || !dashboard) {
    return <PageLoader />;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section
        variants={item}
        className="rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)_/_0.98),hsl(var(--card)_/_0.9))] p-6 shadow-card"
      >
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              Workspace Overview
            </div>
            <div className="space-y-3">
              <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-foreground">
                Revenue, delivery, and client health in one view.
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Clean hierarchy, faster scanning, and a frontend structure that stays ready for backend integration later.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {canUseQuickCreate ? (
                <button
                  type="button"
                  onClick={openQuickCreate}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:translate-y-[-1px]"
                >
                  Launch Quick Create
                  <MoveRight className="h-4 w-4" />
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-secondary/30 px-5 py-3 text-sm font-semibold text-muted-foreground">
                  Limited access
                </div>
              )}
              <button
                type="button"
                onClick={openCommandPalette}
                className="inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-secondary/35 px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary/55"
              >
                Open Command Center
                <span className="rounded-lg border border-border/70 bg-background/60 px-2 py-1 text-[10px] tracking-[0.18em] text-muted-foreground">CMD/CTRL K</span>
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "Role Context", value: role.toUpperCase(), icon: ShieldCheck },
                { label: "Theme Profile", value: color.toUpperCase(), icon: Sparkles },
                { label: "System Health", value: "Stable", icon: Activity },
              ].map((entry) => (
                <div key={entry.label} className="rounded-[1.25rem] border border-border/70 bg-secondary/25 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <entry.icon className="h-5 w-5" />
                  </div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{entry.label}</p>
                  <p className="mt-1 text-base font-semibold text-foreground">{entry.value}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-secondary/20 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Smart Brief</p>
                <p className="mt-1 font-display text-xl font-semibold text-foreground">Today’s focus</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFocusInput((current) => !current)}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-background/60 text-primary transition hover:border-border"
                  aria-label="Add focus item"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Bot className="h-5 w-5" />
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {focusItems.map((point) => (
                <div
                  key={point.id}
                  draggable
                  onDragStart={() => setDraggedFocusId(point.id)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => {
                    if (draggedFocusId) moveFocusItem(draggedFocusId, point.id);
                    setDraggedFocusId(null);
                  }}
                  onDragEnd={() => setDraggedFocusId(null)}
                  className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/45 px-4 py-3 text-sm leading-6 text-muted-foreground transition hover:border-border"
                >
                  <button
                    type="button"
                    onClick={() => moveFocusItem(point.id, focusItems[Math.max(0, focusItems.indexOf(point) - 1)]?.id ?? point.id)}
                    className="mt-0.5 rounded-lg border border-border/70 bg-card/80 p-1 text-muted-foreground transition hover:text-foreground"
                    aria-label="Move focus item"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <div className="flex-1">
                    <p className="text-foreground">{point.text}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{point.source}</p>
                  </div>
                </div>
              ))}
            </div>
            {showFocusInput && (
              <div className="mt-4 space-y-3 rounded-[1.25rem] border border-border/70 bg-background/45 p-4">
                <input
                  value={focusDraft}
                  onChange={(event) => setFocusDraft(event.target.value)}
                  placeholder="Add a new focus item..."
                  className="h-11 w-full rounded-2xl border border-border/70 bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFocusInput(false)}
                    className="rounded-2xl border border-border/70 bg-secondary/35 px-4 py-2 text-sm font-semibold text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={addFocusItem}
                    className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
            <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-background/45 p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Execution readiness</span>
                <span className="font-semibold text-foreground">{executionReadiness}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-[linear-gradient(90deg,#C1E8FF,#7DA0CA,#5483B3)]"
                  style={{ width: `${executionReadiness}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric, index) => (
          <StatCard
            key={metric.label}
            title={metric.label}
            value={metric.value}
            change={`${metric.change} ${metric.detail}`}
            changeType={metric.direction}
            icon={[CircleDollarSign, Building2, Target, BriefcaseBusiness][index]}
            iconColor={[
              "bg-primary/15 text-primary",
              "bg-info/22 text-info-foreground",
              "bg-accent/18 text-accent-foreground",
              "bg-success/15 text-success",
            ][index]}
          />
        ))}
      </motion.section>

      <Suspense
        fallback={
          <motion.section variants={item} className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="h-[420px] rounded-[1.75rem] border border-border/70 bg-card/80 shadow-card" />
            <div className="h-[420px] rounded-[1.75rem] border border-border/70 bg-card/80 shadow-card" />
          </motion.section>
        }
      >
        <DashboardCharts
          revenueSeries={dashboard.revenueSeries}
          pipelineBreakdown={dashboard.pipelineBreakdown}
          operatingCadence={dashboard.operatingCadence}
          focusClients={focusClients}
          atRiskClients={atRiskClients}
        />
      </Suspense>

      <motion.section variants={item} className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Delivery Programs</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Execution portfolio</h2>
            </div>
            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Open Projects
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-4">
            {featuredProjects.map((project) => (
              <div key={project.id} className="rounded-[1.25rem] border border-border/70 bg-secondary/28 p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">{project.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <div className="mb-4 h-2 rounded-full bg-secondary">
                  <div className="h-2 rounded-full bg-[linear-gradient(90deg,#5483B3,#7DA0CA,#C1E8FF)]" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="grid gap-3 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Stage</p>
                    <p className="mt-1 font-semibold text-foreground">{project.stage}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Budget</p>
                    <p className="mt-1 font-semibold text-foreground">{project.budget}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tasks</p>
                    <p className="mt-1 font-semibold text-foreground">{project.tasks.done}/{project.tasks.total}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Due</p>
                    <p className="mt-1 font-semibold text-foreground">{project.dueDate}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Recent Activity</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Live workspace timeline</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This section refreshes from the current day snapshot, so the feed and focus area shift without backend data.
            </p>
          </div>
          <div className="space-y-3">
            {dashboard.activityFeed.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 rounded-[1.25rem] border border-border/70 bg-secondary/28 p-4">
                <div className="mt-1 h-3 w-3 rounded-full bg-primary" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{activity.time}</p>
                </div>
                <StatusBadge status={activity.type} />
              </div>
            ))}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
