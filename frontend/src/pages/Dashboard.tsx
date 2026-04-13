import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CircleDollarSign,
  MoveRight,
  RefreshCw,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import StatCard from "@/components/shared/StatCard";
import ProgressRing from "@/components/shared/ProgressRing";
import StatusBadge from "@/components/shared/StatusBadge";
import { DashboardSkeleton } from "@/components/skeletons";
import ErrorFallback from "@/components/shared/ErrorFallback";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { useRefresh } from "@/hooks/use-refresh";
import { getRefreshMessage, getRefreshSuccessMessage } from "@/lib/refresh-messages";
import PersonalizedFocus from "@/components/dashboard/PersonalizedFocus";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useDashboardData, useProjects } from "@/hooks/use-crm-data";
import { useMonitoring, usePerformanceTrace } from "@/hooks/use-monitoring";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ClientRecord } from "@/types/crm";

const DashboardCharts = lazy(() => import("@/components/dashboard/DashboardCharts"));

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" as const } },
};
const DASHBOARD_ACTIVITY_PAGE_SIZE = 4;
const PORTFOLIO_PAGE_SIZE = 4;

function LazyDashboardChartsSection({
  revenueSeries,
  pipelineBreakdown,
  operatingCadence,
  focusClients,
  atRiskClients,
}: {
  revenueSeries: Array<{ month: string; revenue: number; deals: number; retention: number }>;
  pipelineBreakdown: Array<{ name: string; value: number; color: string }>;
  operatingCadence: Array<{ name: string; value: number }>;
  focusClients: ClientRecord[];
  atRiskClients: ClientRecord[];
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || shouldLoad) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={sectionRef}>
      {shouldLoad ? (
        <Suspense
          fallback={
            <motion.section variants={item} className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
              <div className={cn("h-[420px] border border-border/70 bg-card/80 shadow-card", RADIUS.xl)} />
              <div className={cn("h-[420px] border border-border/70 bg-card/80 shadow-card", RADIUS.xl)} />
            </motion.section>
          }
        >
          <DashboardCharts
            revenueSeries={revenueSeries}
            pipelineBreakdown={pipelineBreakdown}
            operatingCadence={operatingCadence}
            focusClients={focusClients}
            atRiskClients={atRiskClients}
          />
        </Suspense>
      ) : (
        <motion.section variants={item} className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className={cn("h-[420px] border border-border/70 bg-card/80 shadow-card", RADIUS.xl)} />
          <div className={cn("h-[420px] border border-border/70 bg-card/80 shadow-card", RADIUS.xl)} />
        </motion.section>
      )}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { role } = useTheme();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const dashboardQuery = useDashboardData();
  const projectsQuery = useProjects({ enabled: role !== "client" });
  const canSeeCommercialInsights = role === "admin" || role === "manager";
  const canSeeProjectBudget = role !== "employee";
  const { refresh, isRefreshing } = useRefresh();

  const loading = dashboardQuery.isLoading || (role !== "client" && projectsQuery.isLoading);

  const dashboard = dashboardQuery.data;
  const pageError = dashboardQuery.error ?? (role !== "client" ? projectsQuery.error : null);
  const [activityFilter, setActivityFilter] = useState<"all" | "collaboration" | "sales" | "delivery" | "finance" | "hiring" | "system">("all");
  const [visibleActivityCount, setVisibleActivityCount] = useState(4);
  const [visibleProjectCount, setVisibleProjectCount] = useState(4);

  const handleRefresh = async () => {
    await refresh(
      () => Promise.all([
        dashboardQuery.refetch(),
        role !== "client" ? projectsQuery.refetch() : Promise.resolve(),
      ]),
      {
        message: getRefreshMessage("dashboard"),
        successMessage: getRefreshSuccessMessage("dashboard"),
      }
    );
  };

  useEffect(() => {
    setVisibleActivityCount(DASHBOARD_ACTIVITY_PAGE_SIZE);
  }, [activityFilter]);

  const dashboardView = useMemo(() => {
    const projects = role === "client" ? [] : (projectsQuery.data ?? []);
    const revenueSeries = dashboard?.revenueSeries ?? [];
    const focusClients = dashboard?.focusClients ?? [];
    const atRiskClients = dashboard?.atRiskClients ?? [];
    const metricSparklines = [[], [], [], []] as number[][];

    for (const point of revenueSeries) {
      metricSparklines[0].push(point.revenue);
      metricSparklines[1].push(point.deals * 6 + 30);
      metricSparklines[2].push(point.retention * 12);
      metricSparklines[3].push(Math.max(0, 100 - point.deals * 2));
    }

    return {
      focusClients,
      atRiskClients,
      featuredProjects: projects.filter((project) => project.status !== "completed"),
      revenueSeries,
      metricSparklines,
      executionReadiness: dashboard?.executionReadiness ?? 0,
      filteredActivityFeed: (dashboard?.activityFeed ?? []).filter(
        (activity) => activityFilter === "all" || activity.category === activityFilter,
      ),
    };
  }, [activityFilter, dashboard, projectsQuery.data, role]);

  if (pageError) {
    return (
      <div className="space-y-6">
        <ErrorFallback
          title="Dashboard data failed to load"
          error={pageError}
          description="The overview could not fetch its data. Retry to reload the dashboard and project portfolio."
          onRetry={() => Promise.all([dashboardQuery.refetch(), projectsQuery.refetch()])}
          retryLabel="Retry dashboard"
        />
      </div>
    );
  }
  if (loading || !dashboard) {
    return <DashboardSkeleton />;
  }
  const widgetDefinitions = [
    {
      id: "hero",
      title: "Workspace Overview",
      description: "Your business metrics and key actions in one place",
      node: (
        <motion.section variants={item} className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={cn("relative overflow-hidden border border-border/60 bg-card", RADIUS.xl, SPACING.card)}>
            {/* Decorative top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent_5%,hsl(213_55%_52%/0.5)_35%,hsl(173_58%_44%/0.5)_65%,transparent_95%)]" />
            {/* Soft corner glow */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[radial-gradient(circle,hsl(213_55%_52%/0.06),transparent_70%)]" />

            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-foreground">
                  Revenue, delivery,{" "}
                  <span className="bg-[linear-gradient(135deg,hsl(213_55%_52%),hsl(173_58%_44%))] bg-clip-text text-transparent">
                    and client health
                  </span>{" "}
                  in one view.
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">Your business metrics and key actions in one place.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {canUseQuickCreate ? (
                  <button
                    type="button"
                    onClick={() => openQuickCreate()}
                    className={cn("premium-hover inline-flex items-center gap-2 bg-primary font-semibold text-primary-foreground shadow-lg transition hover:brightness-105", RADIUS.lg, SPACING.button, TEXT.body)}
                  >
                    Launch Quick Create
                    <MoveRight className="h-4 w-4" />
                  </button>
                ) : (
                  <div className={cn("inline-flex items-center gap-2 border border-border/70 bg-secondary/30 font-semibold text-muted-foreground", RADIUS.lg, SPACING.button, TEXT.body)}>
                    Limited access
                  </div>
                )}
                <motion.div whileTap={{ scale: 0.94 }} className="inline-block">
                  <Button
                    variant="outline"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className={cn(
                      "premium-hover flex items-center gap-2 border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition",
                      RADIUS.lg, SPACING.button, TEXT.body
                    )}
                  >
                    <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
                    {isRefreshing ? "Refresh Overview" : "Refresh Overview"}
                  </Button>
                </motion.div>
              </div>
            </div>
          </div>

          <PersonalizedFocus />
        </motion.section>
      ),
    },
    {
      id: "stats",
      title: "KPI Strip",
      description: "Live metric cards with sparklines",
      node: (
        <motion.section variants={item} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(dashboard.metrics ?? []).map((metric, index) => (
            <StatCard
              key={metric.label}
              title={metric.label}
              value={metric.value}
              change={`${metric.change} ${metric.detail}`}
              changeType={metric.direction}
              icon={[CircleDollarSign, Building2, Target, BriefcaseBusiness][index]}
              iconColor={[
                "bg-[hsl(213_55%_52%/0.14)] text-[hsl(213_55%_52%)] border border-[hsl(213_55%_52%/0.22)]",
                "bg-[hsl(258_50%_60%/0.14)] text-[hsl(258_50%_60%)] border border-[hsl(258_50%_60%/0.22)]",
                "bg-[hsl(38_88%_52%/0.14)] text-[hsl(38_88%_52%)] border border-[hsl(38_88%_52%/0.22)]",
                "bg-[hsl(173_58%_44%/0.14)] text-[hsl(173_58%_44%)] border border-[hsl(173_58%_44%/0.22)]",
              ][index]}
              accentColor={[
                "hsl(213 55% 52%)",
                "hsl(258 50% 60%)",
                "hsl(38 88% 52%)",
                "hsl(173 58% 44%)",
              ][index]}
              sparkline={dashboardView.metricSparklines[index]}
              sparklineLabel={["Revenue trend", "Client mix", "Retention pulse", "Risk curve"][index]}
            />
          ))}
        </motion.section>
      ),
    },
    {
      id: "charts",
      title: "Analytics",
      description: "Revenue curve, pipeline mix, and operating cadence",
      node: (
        <LazyDashboardChartsSection
          revenueSeries={dashboardView.revenueSeries}
          pipelineBreakdown={dashboard.pipelineBreakdown}
          operatingCadence={dashboard.operatingCadence}
          focusClients={dashboardView.focusClients}
          atRiskClients={dashboardView.atRiskClients}
        />
      ),
    },
    {
      id: "portfolio",
      title: "Delivery Programs",
      description: "Active programs and their progress",
      node: (
        <motion.section variants={item} className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className={cn("border border-border/60 bg-card", RADIUS.xl, SPACING.card)}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Delivery Programs</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Execution portfolio</h2>
              </div>
              <button
                type="button"
                onClick={() => navigate("/projects")}
                className={cn("premium-hover inline-flex items-center gap-1 font-semibold text-primary", TEXT.meta)}
              >
                Open Projects
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-4">
              {dashboardView.featuredProjects.length > 0 ? (
                <>
                  {dashboardView.featuredProjects.slice(0, visibleProjectCount).map((project) => (
                    <div key={project.id} className={cn("border border-border/50 bg-secondary/20 transition-colors hover:bg-secondary/40", RADIUS.lg, SPACING.cardCompact)}>
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="font-display text-lg font-semibold text-foreground">{project.name}</p>
                          <p className={cn("mt-1 text-muted-foreground", TEXT.body)}>{project.description}</p>
                        </div>
                        <StatusBadge status={project.status} />
                      </div>
                      <div className="mb-4 h-2 overflow-hidden rounded-full bg-secondary/60">
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{
                            width: `${project.progress}%`,
                            background: `linear-gradient(90deg, hsl(213 55% 52%), hsl(173 58% 44%))`,
                          }}
                        />
                      </div>
                      <div className="grid gap-3 text-sm md:grid-cols-4">
                        <div>
                          <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Stage</p>
                          <p className="mt-1 font-semibold text-foreground">{project.stage}</p>
                        </div>
                        <div>
                          <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Budget</p>
                          <p className="mt-1 font-semibold text-foreground">{canSeeProjectBudget ? project.budget : "Restricted"}</p>
                        </div>
                        <div>
                          <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Tasks</p>
                          <p className="mt-1 font-semibold text-foreground">
                            {project.tasks.done}/{project.tasks.total}
                          </p>
                        </div>
                        <div>
                          <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Due</p>
                          <p className="mt-1 font-semibold text-foreground">{project.dueDate}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <ShowMoreButton
                    total={dashboardView.featuredProjects.length}
                    visible={visibleProjectCount}
                    pageSize={PORTFOLIO_PAGE_SIZE}
                    onShowMore={() => setVisibleProjectCount(v => Math.min(v + PORTFOLIO_PAGE_SIZE, dashboardView.featuredProjects.length))}
                    onShowLess={() => setVisibleProjectCount(PORTFOLIO_PAGE_SIZE)}
                  />
                </>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 bg-secondary/10 p-8 text-center">
                  <div className="mx-auto w-fit rounded-full bg-muted/30 p-4 mb-4">
                    <BriefcaseBusiness className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">No active projects</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Create projects to track delivery programs and execution progress
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className={cn("border border-border/60 bg-card", RADIUS.xl, SPACING.card)}>
            <div className="mb-6">
              <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Recent Activity</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Live workspace timeline</h2>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { id: "all", label: "All" },
                { id: "collaboration", label: "Collaboration" },
                { id: "sales", label: "Sales" },
                { id: "delivery", label: "Delivery" },
                { id: "finance", label: "Finance" },
                { id: "hiring", label: "Hiring" },
                { id: "system", label: "System" },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setActivityFilter(filter.id as typeof activityFilter)}
                  className={cn(
                    "premium-hover rounded-full border font-semibold uppercase tracking-[0.14em]",
                    SPACING.buttonCompact,
                    TEXT.eyebrow,
                    activityFilter === filter.id
                      ? "border-primary/25 bg-primary/10 text-foreground"
                      : "border-border/70 bg-secondary/30 text-muted-foreground",
                  )}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {dashboardView.filteredActivityFeed.slice(0, visibleActivityCount).map((activity) => (
                <div key={activity.id} className={cn("flex items-start gap-3 border border-border/70 bg-secondary/28", RADIUS.lg, SPACING.inset)}>
                  <div
                    className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        activity.type === "completed" ? "hsl(173 58% 44%)" :
                          activity.type === "active" ? "hsl(213 55% 52%)" :
                            activity.type === "in-progress" ? "hsl(258 50% 60%)" :
                              "hsl(38 88% 52%)",
                      boxShadow:
                        activity.type === "completed" ? "0 0 6px hsl(173 58% 44% / 0.5)" :
                          activity.type === "active" ? "0 0 6px hsl(213 55% 52% / 0.5)" :
                            activity.type === "in-progress" ? "0 0 6px hsl(258 50% 60% / 0.5)" :
                              "0 0 6px hsl(38 88% 52% / 0.5)",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-foreground", TEXT.body)}>{activity.text}</p>
                    <p className={cn("mt-1 text-muted-foreground", TEXT.meta)}>
                      {activity.time}
                      {activity.category ? ` · ${activity.category}` : ""}
                      {activity.source ? ` · ${activity.source}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={activity.type} />
                </div>
              ))}
            </div>
            <div className="mt-4">
              <ShowMoreButton
                total={dashboardView.filteredActivityFeed.length}
                visible={visibleActivityCount}
                pageSize={DASHBOARD_ACTIVITY_PAGE_SIZE}
                onShowMore={() => setVisibleActivityCount((current) => Math.min(current + DASHBOARD_ACTIVITY_PAGE_SIZE, dashboardView.filteredActivityFeed.length))}
                onShowLess={() => setVisibleActivityCount(DASHBOARD_ACTIVITY_PAGE_SIZE)}
              />
            </div>
          </div>
        </motion.section>
      ),
    },
  ];
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {widgetDefinitions
        .filter((widget) => canSeeCommercialInsights || widget.id !== "charts")
        .map((widget) => (
          <div key={widget.id}>{widget.node}</div>
        ))}
    </motion.div>
  );
}
