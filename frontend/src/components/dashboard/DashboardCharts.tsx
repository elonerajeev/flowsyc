import { useMemo, useState } from "react";

import { ArrowUpRight, Clock3, Zap, Check } from "lucide-react";
import { motion } from "framer-motion";

import StatusBadge from "@/components/shared/StatusBadge";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { SimpleBarChart, SimpleSparkline } from "@/components/shared/SimpleCharts";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { ClientRecord } from "@/types/crm";

const ACCOUNTS_PAGE_SIZE = 4;
const CADENCE_PAGE_SIZE = 4;

type DashboardChartsProps = {
  revenueSeries: Array<{ month: string; revenue: number; deals: number; retention: number }>;
  pipelineBreakdown: Array<{ name: string; value: number; color: string }>;
  operatingCadence: Array<{ name: string; value: number }>;
  focusClients: ClientRecord[];
  atRiskClients: ClientRecord[];
};

export default function DashboardCharts({
  revenueSeries,
  pipelineBreakdown,
  operatingCadence,
  focusClients,
  atRiskClients,
}: DashboardChartsProps) {
  const [selectedStage, setSelectedStage] = useState(pipelineBreakdown[0] ?? null);
  const [visibleFocusCount, setVisibleFocusCount] = useState(4);
  const [visibleRiskCount, setVisibleRiskCount] = useState(4);
  const [visibleCadenceCount, setVisibleCadenceCount] = useState(CADENCE_PAGE_SIZE);

  const totalPipeline = useMemo(
    () => pipelineBreakdown.reduce((sum, stage) => sum + stage.value, 0),
    [pipelineBreakdown],
  );
  const totalRevenue = revenueSeries.reduce((sum, p) => sum + p.revenue, 0);
  const firstRevenue = revenueSeries[0]?.revenue ?? 0;
  const lastRevenue = revenueSeries[revenueSeries.length - 1]?.revenue ?? 0;
  const revenueGrowth = firstRevenue > 0 ? Math.round(((lastRevenue - firstRevenue) / firstRevenue) * 100) : 0;
  const avgRetention = revenueSeries.length > 0
    ? Math.round(revenueSeries.reduce((sum, p) => sum + p.retention, 0) / revenueSeries.length)
    : 0;
  const totalDeals = revenueSeries.reduce((sum, point) => sum + point.deals, 0);
  const hasRevenueData = totalRevenue > 0 || totalDeals > 0;

  const pipelineItems = pipelineBreakdown.map((stage) => ({
    label: stage.name,
    value: Math.round((stage.value / totalPipeline) * 100),
  }));
  const pipelineIndex = selectedStage ? pipelineBreakdown.findIndex((stage) => stage.name === selectedStage.name) : 0;
  const revenueSparkData = revenueSeries.map((point) => point.revenue);
  const dealsSparkData = revenueSeries.map((point) => point.deals);

  return (
    <>
      <motion.section variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className={cn("border border-border/60 bg-card overflow-hidden flex flex-col", RADIUS.xl)}>
          <div className={cn(SPACING.card, "flex flex-col flex-1")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Growth Curve</p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">Revenue and cadence</h2>
              </div>
              <div className={cn("inline-flex items-center gap-2 border border-primary/25 bg-primary/8 font-medium text-primary", RADIUS.pill, SPACING.buttonCompact, TEXT.meta)}>
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Quarter to date
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {hasRevenueData ? (
                <>
                  <div className="rounded-2xl border border-border/50 bg-secondary/20 p-4">
                    <p className={cn("text-muted-foreground", TEXT.meta)}>Revenue</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-foreground">${(totalRevenue / 1000).toFixed(0)}k</p>
                    <p className="text-sm text-muted-foreground">Growth: {revenueGrowth >= 0 ? "+" : ""}{revenueGrowth}%</p>
                    <div className="mt-3">
                      <SimpleSparkline data={revenueSparkData} />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-secondary/20 p-4">
                    <p className={cn("text-muted-foreground", TEXT.meta)}>Deals</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-foreground">{totalDeals}</p>
                    <p className="text-sm text-muted-foreground">Avg retention: {avgRetention}%</p>
                    <div className="mt-3">
                      <SimpleSparkline data={dealsSparkData} stroke="hsl(var(--accent))" fill="hsl(var(--accent) / 0.35)" accentFill="hsl(var(--accent) / 0.18)" />
                    </div>
                  </div>
                </>
              ) : (
                <div className="md:col-span-2 rounded-2xl border border-dashed border-border/60 bg-secondary/10 p-8 text-center">
                  <div className="mx-auto w-fit rounded-full bg-muted/30 p-4 mb-4">
                    <ArrowUpRight className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">No revenue data yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                    Start tracking your revenue by creating invoices. Your growth curve will appear here once you have invoice data.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                    <span className="px-3 py-1 rounded-full bg-secondary/40 border border-border/50">Create invoices</span>
                    <span className="px-3 py-1 rounded-full bg-secondary/40 border border-border/50">Add clients</span>
                    <span className="px-3 py-1 rounded-full bg-secondary/40 border border-border/50">Track deals</span>
                  </div>
                </div>
              )}
            </div>

            {/* Monthly breakdown - real invoice data per month */}
            {hasRevenueData && (
              <div className="mt-4 flex-1 rounded-2xl border border-border/50 bg-secondary/10 dark:bg-white/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Monthly breakdown</p>
                  <span className="text-[10px] text-muted-foreground">from invoices</span>
                </div>
                {revenueSeries.every(p => p.revenue === 0) ? (
                  <div className="flex h-28 items-center justify-center text-center">
                    <div>
                      <p className="text-xs font-semibold text-foreground">No monthly data yet</p>
                      <p className="text-[10px] text-muted-foreground mt-1">Invoice data will populate this chart</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-28 items-end gap-2 pt-2">
                    {revenueSeries.map((point, i) => {
                      const max = Math.max(...revenueSeries.map(p => p.revenue), 1);
                      const heightPx = Math.round((point.revenue / max) * 88);
                      const hasData = point.revenue > 0;
                      const barColors = [
                        "bg-blue-500", "bg-indigo-500", "bg-violet-500",
                        "bg-cyan-500", "bg-emerald-500", "bg-teal-500",
                      ];
                      return (
                        <div key={i} className="group relative flex flex-1 flex-col items-center gap-1">
                          {hasData && (
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded bg-foreground px-1.5 py-0.5 text-[9px] text-background z-10">
                              ${(point.revenue / 1000).toFixed(1)}k
                            </div>
                          )}
                          <div
                            className={cn(
                              "w-full rounded-t-md transition-all duration-700",
                              hasData ? barColors[i % barColors.length] : "bg-border/30"
                            )}
                            style={{ height: hasData ? `${heightPx}px` : "4px" }}
                          />
                          <span className={cn(
                            "text-[9px] font-medium",
                            hasData ? "text-foreground" : "text-muted-foreground/40"
                          )}>
                            {point.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pipeline Mix */}
        <div className={cn("border border-border/60 bg-card/90", RADIUS.xl, SPACING.card)}>
          <div className="mb-6">
            <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Pipeline Mix</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">Weighted by stage</h2>
          </div>
          {totalPipeline > 0 ? (
            <>
              <SimpleBarChart
                items={pipelineItems}
                selectedIndex={pipelineIndex}
                onSelect={(index) => setSelectedStage(pipelineBreakdown[index] ?? pipelineBreakdown[0] ?? null)}
              />
              {selectedStage ? (
                <div className={cn("mt-4 border border-border/60 bg-secondary/15", RADIUS.lg, SPACING.inset)}>
                  <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Stage Details</p>
                  <div className="mt-1 flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{selectedStage.name}</p>
                    <span className={cn("border border-border/60 bg-background/60 font-semibold text-foreground", RADIUS.pill, SPACING.buttonCompact, TEXT.meta)}>
                      {Math.round((selectedStage.value / totalPipeline) * 100)}% of pipeline
                    </span>
                  </div>
                  <p className={cn("mt-2 text-muted-foreground", TEXT.bodyRelaxed)}>
                    {selectedStage.value} {selectedStage.value === 1 ? 'item' : 'items'} in this stage
                  </p>
                </div>
              ) : null}
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
              <div className="mx-auto w-fit rounded-full bg-muted/30 p-3 mb-3">
                <Zap className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1 text-sm">No pipeline data</h3>
              <p className="text-xs text-muted-foreground">
                Add clients and projects to see your pipeline breakdown
              </p>
            </div>
          )}
        </div>
      </motion.section>

      <motion.section variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr]">
        {/* Operating Cadence */}
        <div className={cn("border border-border/60 bg-card/90 flex flex-col", RADIUS.xl, SPACING.card)}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Operating Cadence</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Cross-team performance</h2>
            </div>
            <Zap className="h-5 w-5 text-primary" />
          </div>
          {operatingCadence.length > 0 ? (
            <div className="space-y-3">
              {operatingCadence.slice(0, visibleCadenceCount).map((item) => (
                <div key={item.name} className={cn("border border-border/60 bg-secondary/15", RADIUS.lg, SPACING.inset)}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{item.name}</p>
                    <p className={cn("font-semibold text-foreground", TEXT.body)}>{item.value}%</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--accent)))]"
                      style={{ width: `${item.value}%` }}
                    />
                  </div>
                </div>
              ))}
              <ShowMoreButton
                total={operatingCadence.length}
                visible={visibleCadenceCount}
                pageSize={CADENCE_PAGE_SIZE}
                onShowMore={() => setVisibleCadenceCount(v => Math.min(v + CADENCE_PAGE_SIZE, operatingCadence.length))}
                onShowLess={() => setVisibleCadenceCount(CADENCE_PAGE_SIZE)}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
              <div>
                <Clock3 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">No teams available</p>
                <p className="mt-1 text-xs text-muted-foreground">Create teams to track cross-team cadence</p>
              </div>
            </div>
          )}
        </div>

        {/* Priority Accounts */}
        <div className={cn("border border-border/60 bg-card/90 flex flex-col", RADIUS.xl, SPACING.card)}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Priority Accounts</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Account radar</h2>
            </div>
            <button type="button" className={cn("premium-hover inline-flex items-center gap-1 font-semibold text-primary", TEXT.meta)}>
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {focusClients.length > 0 ? (
            <div className="space-y-2">
              {focusClients.slice(0, visibleFocusCount).map((client) => (
                <div key={client.id} className={cn("border border-border/60 bg-secondary/15 flex items-center justify-between gap-3", RADIUS.lg, SPACING.inset)}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("flex h-9 w-9 flex-shrink-0 items-center justify-center bg-primary/10 font-semibold text-foreground text-xs", RADIUS.lg)}>
                      {client.avatar}
                    </div>
                    <div className="min-w-0">
                      <TruncatedText
                        text={client.name}
                        maxLength={25}
                        className="text-sm font-semibold text-foreground"
                      />
                      <TruncatedText
                        text={client.industry}
                        maxLength={25}
                        className={cn("text-muted-foreground", TEXT.meta)}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs font-bold text-foreground">{client.healthScore}/100</p>
                    <StatusBadge status={client.status} />
                  </div>
                </div>
              ))}
              <ShowMoreButton
                total={focusClients.length}
                visible={visibleFocusCount}
                pageSize={ACCOUNTS_PAGE_SIZE}
                onShowMore={() => setVisibleFocusCount(v => Math.min(v + ACCOUNTS_PAGE_SIZE, focusClients.length))}
                onShowLess={() => setVisibleFocusCount(ACCOUNTS_PAGE_SIZE)}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
              <div>
                <Clock3 className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">No priority accounts</p>
                <p className="mt-1 text-xs text-muted-foreground">Add clients to track accounts</p>
              </div>
            </div>
          )}
        </div>

        {/* Risk Monitor */}
        <div className={cn("border border-border/60 bg-card/90 flex flex-col", RADIUS.xl, SPACING.card)}>
          <div className="mb-4">
            <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Risk Monitor</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Needs intervention</h2>
          </div>
          {atRiskClients.length > 0 ? (
            <>
              <div className="space-y-2">
                {atRiskClients.slice(0, visibleRiskCount).map((client) => (
                  <div key={client.id} className={cn("border border-border/60 bg-secondary/15 flex items-center justify-between gap-3", RADIUS.lg, SPACING.inset)}>
                    <div className="min-w-0">
                      <TruncatedText
                        text={client.name}
                        maxLength={25}
                        className="text-sm font-semibold text-foreground"
                      />
                      <TruncatedText
                        text={client.nextAction}
                        maxLength={30}
                        className={cn("text-muted-foreground", TEXT.meta)}
                      />
                    </div>
                    <span className={cn("flex-shrink-0 bg-warning/12 font-semibold text-warning", RADIUS.pill, SPACING.buttonCompact, TEXT.meta)}>
                      {client.healthScore}/100
                    </span>
                  </div>
                ))}
                <ShowMoreButton
                  total={atRiskClients.length}
                  visible={visibleRiskCount}
                  pageSize={ACCOUNTS_PAGE_SIZE}
                  onShowMore={() => setVisibleRiskCount(v => Math.min(v + ACCOUNTS_PAGE_SIZE, atRiskClients.length))}
                  onShowLess={() => setVisibleRiskCount(ACCOUNTS_PAGE_SIZE)}
                />
              </div>
              <div className={cn("mt-4 border border-warning/20 bg-warning/5", RADIUS.lg, SPACING.inset)}>
                <p className={cn("font-semibold text-warning", TEXT.body)}>
                  {atRiskClients.length} account{atRiskClients.length > 1 ? "s" : ""} need attention
                </p>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center rounded-2xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
              <div>
                <Check className="mx-auto mb-2 h-6 w-6 text-success" />
                <p className="text-sm font-semibold text-foreground">All accounts healthy</p>
                <p className="mt-1 text-xs text-muted-foreground">No at-risk accounts</p>
              </div>
            </div>
          )}
        </div>
      </motion.section>
    </>
  );
}
