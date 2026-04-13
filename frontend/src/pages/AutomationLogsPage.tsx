/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  RefreshCw,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  AlertCircle,
  Zap,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const INITIAL_SHOW_COUNT = 10;

const statusConfig = {
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-secondary" },
  running: { icon: Play, color: "text-info", bg: "bg-info/10" },
  completed: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  cancelled: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
};

export default function AutomationLogsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["automation-logs"],
    queryFn: async () => {
      const res = await fetch("/api/automation/logs?limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const logs = data?.logs || [];
  const filteredLogs = statusFilter === "all" ? logs : logs.filter((l: any) => l.status === statusFilter);
  const displayedLogs = showAllLogs ? filteredLogs : filteredLogs.slice(0, INITIAL_SHOW_COUNT);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  const stats = {
    total: data?.total || filteredLogs.length,
    completed: logs.filter((l: any) => l.status === "completed").length,
    failed: logs.filter((l: any) => l.status === "failed").length,
    today: logs.filter((l: any) => {
      const today = new Date().toDateString();
      return new Date(l.startedAt).toDateString() === today;
    }).length,
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-success via-info to-primary" />
        <div className={cn("relative", SPACING.card)}>
          <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Automation
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                <span className="bg-gradient-to-r from-success to-info bg-clip-text text-transparent">
                  Activity Logs
                </span>
              </h1>
              <p className={cn("max-w-xl text-muted-foreground", TEXT.bodyRelaxed)}>
                Execution history of all automation rules.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-border/40 bg-background/70 px-4 text-sm outline-none transition-colors focus:border-primary/50"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="pending">Pending</option>
              </select>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total Executions", value: stats.total, icon: Activity, gradient: "from-primary to-primary/60" },
              { label: "Completed", value: stats.completed, icon: CheckCircle2, gradient: "from-success to-success/60" },
              { label: "Failed", value: stats.failed, icon: XCircle, gradient: "from-destructive to-destructive/60" },
              { label: "Today", value: stats.today, icon: Clock, gradient: "from-info to-info/60" },
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

      <motion.section variants={item} className="space-y-3">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-card" />
            ))}
          </>
        ) : filteredLogs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Activity className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="font-display text-xl font-semibold text-foreground">No logs found</h3>
              <p className="mt-2 text-muted-foreground">
                {statusFilter === "all" ? "No automation has run yet." : `No ${statusFilter} logs found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {displayedLogs.map((log: any, index: number) => {
              const config = statusConfig[log.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const isExpanded = expandedLog === log.id;
              const hasDetails = log.error || (log.actionData && log.actionData.length > 0) || log.triggerData;

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", config.bg)}>
                            <StatusIcon className={cn("h-5 w-5", config.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-foreground">
                                {log.rule?.name || `Rule #${log.ruleId}`}
                              </h3>
                              <Badge variant="outline" className={cn("text-xs", config.color, config.bg)}>
                                {log.status}
                              </Badge>
                              {log.actionData?.length > 0 && (
                                <Badge variant="outline" className="text-xs bg-secondary">
                                  {log.actionData.length} actions
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              <span className="font-medium">{log.trigger}</span>
                              {log.entityType && (
                                <>
                                  {" "}• <span className="font-medium">{log.entityType}</span>
                                  {log.entityId && <span> #{log.entityId}</span>}
                                </>
                              )}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(log.startedAt).toLocaleString()}
                              </span>
                              {log.completedAt && (
                                <span className="flex items-center gap-1">
                                  <Activity className="h-3 w-3" />
                                  {Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)}s
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        {hasDetails && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                            className="gap-1 shrink-0"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Less
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                More
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      {isExpanded && (
                        <div className="mt-4 space-y-3 border-t border-border/40 pt-4">
                          {log.triggerData && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Trigger Data</p>
                              <pre className="text-xs bg-secondary/50 p-2 rounded-lg overflow-x-auto">
                                {JSON.stringify(log.triggerData, null, 2)}
                              </pre>
                            </div>
                          )}
                          {log.actionData && log.actionData.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Actions Executed</p>
                              <div className="space-y-1">
                                {log.actionData.map((action: any, idx: number) => (
                                  <div key={idx} className="text-xs bg-secondary/50 p-2 rounded-lg">
                                    <span className="font-medium">{action.type}</span>
                                    {action.status && (
                                      <Badge variant="outline" className={cn("ml-2 text-xs", action.status === "success" ? "text-success" : "text-destructive")}>
                                        {action.status}
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {log.error && (
                            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                              <p className="text-xs font-medium text-destructive mb-1">Error</p>
                              <p className="text-sm text-destructive">{log.error}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            {filteredLogs.length > INITIAL_SHOW_COUNT && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAllLogs(!showAllLogs)}
                  className="gap-2"
                >
                  {showAllLogs ? (
                    <>
                      <ChevronDown className="h-4 w-4 rotate-180" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show {filteredLogs.length - INITIAL_SHOW_COUNT} More Logs
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
