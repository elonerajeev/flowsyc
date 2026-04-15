/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  DollarSign,
  Clock,
  Users,
  FolderKanban,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { useQuery } from "@tanstack/react-query";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const INITIAL_SHOW_COUNT = 5;

const alertIcons: Record<string, any> = {
  invoice_overdue: DollarSign,
  payroll_due: Users,
  task_overdue: Clock,
  project_stalled: FolderKanban,
};

const alertColors: Record<string, { bg: string; border: string; icon: string }> = {
  invoice_overdue: { bg: "bg-destructive/10", border: "border-destructive/30", icon: "text-destructive" },
  payroll_due: { bg: "bg-warning/10", border: "border-warning/30", icon: "text-warning" },
  task_overdue: { bg: "bg-warning/10", border: "border-warning/30", icon: "text-warning" },
  project_stalled: { bg: "bg-info/10", border: "border-info/30", icon: "text-info" },
};

export default function AutomationAlertsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllAlerts, setShowAllAlerts] = useState(false);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<number>>(new Set());

  const { data: alerts = [], isLoading, error, refetch } = useQuery({
    queryKey: ["automation-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/automation/alerts", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
  });

  const { data: summary } = useQuery({
    queryKey: ["automation-alerts-summary"],
    queryFn: async () => {
      const res = await fetch("/api/automation/alerts/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const criticalAlerts = alerts.filter((a: any) => a.severity === "critical");
  const warningAlerts = alerts.filter((a: any) => a.severity === "warning");
  const resolvedToday = summary?.resolvedToday || 0;

  const displayedAlerts = showAllAlerts ? alerts : alerts.slice(0, INITIAL_SHOW_COUNT);

  const toggleExpanded = (index: number) => {
    setExpandedAlerts(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (error) return <ErrorFallback error={error as Error} onRetry={refetch} retryLabel="Retry alerts" />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-destructive via-warning to-info" />
        <div className={cn("relative", SPACING.card)}>
          <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Bell className="h-3.5 w-3.5 text-primary" />
                Automation
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                <span className="bg-gradient-to-r from-destructive to-warning bg-clip-text text-transparent">
                  Alerts
                </span>
              </h1>
              <p className={cn("max-w-xl text-muted-foreground", TEXT.bodyRelaxed)}>
                System alerts and notifications from automated checks.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total Alerts", value: alerts.length, icon: Bell, gradient: "from-primary to-primary/60" },
              { label: "Critical", value: criticalAlerts.length, icon: AlertCircle, gradient: "from-destructive to-destructive/60" },
              { label: "Warnings", value: warningAlerts.length, icon: AlertTriangle, gradient: "from-warning to-warning/60" },
              { label: "Resolved Today", value: resolvedToday, icon: CheckCircle2, gradient: "from-success to-success/60" },
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

      <motion.section variants={item} className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Bell className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="font-display text-xl font-semibold text-foreground">No alerts</h3>
              <p className="mt-2 text-muted-foreground">Everything looks good! No issues detected.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {displayedAlerts.map((alert: any, index: number) => {
              const Icon = alertIcons[alert.type] || Bell;
              const colors = alertColors[alert.type] || { bg: "bg-secondary/20", border: "border-border/40", icon: "text-muted-foreground" };
              const isLongDescription = alert.description && alert.description.length > 120;
              const isExpanded = expandedAlerts.has(index);

              return (
                <motion.div key={`${alert.title}-${index}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className={cn("border", colors.border)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", colors.bg)}>
                          <Icon className={cn("h-6 w-6", colors.icon)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-foreground">{alert.title}</h3>
                            <Badge variant="outline" className={cn("text-xs", alert.severity === "critical" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-warning/30 bg-warning/10 text-warning")}>
                              {alert.severity}
                            </Badge>
                            {alert.count && alert.count > 1 && (
                              <Badge variant="outline" className="text-xs bg-secondary">
                                {alert.count} items
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1">
                            {isLongDescription ? (
                              <div>
                                <p className={cn("text-sm text-muted-foreground", !isExpanded && "line-clamp-2")}>
                                  {alert.description}
                                </p>
                                <button
                                  onClick={() => toggleExpanded(index)}
                                  className="mt-1 text-xs text-primary hover:underline"
                                >
                                  {isExpanded ? "Show less" : "Show more"}
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">{alert.description}</p>
                            )}
                          </div>
                        </div>
                        {alert.actionUrl && (
                          <Button variant="ghost" size="sm" asChild className="gap-1 shrink-0">
                            <a href={alert.actionUrl}>
                              View <ChevronRight className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            {alerts.length > INITIAL_SHOW_COUNT && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAllAlerts(!showAllAlerts)}
                  className="gap-2"
                >
                  {showAllAlerts ? (
                    <>
                      <ChevronDown className="h-4 w-4 rotate-180" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show {alerts.length - INITIAL_SHOW_COUNT} More Alerts
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </motion.section>
    </motion.div>
  );
}
