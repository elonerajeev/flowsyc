/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Zap,
  Bell,
  Clock,
  Plus,
  Search,
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  Edit2,
  Eye,
  ChevronRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Activity,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import RuleBuilder from "@/components/automation/RuleBuilder";
import RuleLogs from "@/components/automation/RuleLogs";
import type { AutomationRule, AutomationLog } from "@/types/automation";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const triggerLabels: Record<string, string> = {
  lead_created: "Lead Created",
  lead_updated: "Lead Updated",
  lead_scored: "Lead Scored",
  lead_assigned: "Lead Assigned",
  lead_score_above: "Score Above X",
  lead_score_below: "Score Below X",
  cold_lead_detected: "Cold Lead Detected",
  deal_created: "Deal Created",
  deal_stage_changed: "Deal Stage Changed",
  deal_closed: "Deal Closed",
  deal_stale: "Deal Stale",
  task_created: "Task Created",
  task_completed: "Task Completed",
  task_overdue: "Task Overdue",
  followup_due: "Follow-up Due",
  client_created: "Client Created",
  client_health_changed: "Client Health Changed",
  client_health_low: "Client Health Low",
  churn_risk: "Churn Risk",
  renewal_due: "Renewal Due",
  invoice_created: "Invoice Created",
  invoice_overdue: "Invoice Overdue",
  payroll_due: "Payroll Due",
  project_stalled: "Project Stalled",
  custom_schedule: "Scheduled",
  manual: "Manual Trigger",
};

const triggerIcons: Record<string, any> = {
  lead_created: Plus,
  lead_updated: Edit2,
  lead_scored: Activity,
  lead_assigned: Bell,
  lead_score_above: Activity,
  lead_score_below: Activity,
  cold_lead_detected: AlertCircle,
  deal_created: Plus,
  deal_stage_changed: ChevronRight,
  deal_closed: CheckCircle2,
  deal_stale: Clock,
  task_created: Plus,
  task_completed: CheckCircle2,
  task_overdue: AlertCircle,
  followup_due: Clock,
  client_created: Plus,
  client_health_changed: Activity,
  client_health_low: AlertCircle,
  churn_risk: AlertCircle,
  renewal_due: Clock,
  invoice_created: Plus,
  invoice_overdue: AlertCircle,
  payroll_due: Clock,
  project_stalled: AlertCircle,
  custom_schedule: Clock,
  manual: Zap,
};

const actionLabels: Record<string, string> = {
  send_email: "Send Email",
  create_task: "Create Task",
  assign_lead: "Assign Lead",
  update_score: "Update Score",
  move_deal: "Move Deal",
  create_client: "Create Client",
  send_notification: "Send Notification",
  tag_entity: "Tag Entity",
  update_field: "Update Field",
  webhook: "Webhook",
};

export default function AutomationRulesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRule, setSelectedRule] = useState<AutomationRule | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: rules = [], isLoading, error } = useQuery({
    queryKey: ["automation-rules"],
    queryFn: async () => {
      const res = await fetch("/api/automation/rules", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch rules");
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["automation-stats"],
    queryFn: async () => {
      const res = await fetch("/api/automation/stats", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      const res = await fetch(`/api/automation/rules/${ruleId}/toggle`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle rule");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Rule updated");
    },
    onError: () => toast.error("Failed to update rule"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      const res = await fetch(`/api/automation/rules/${ruleId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Rule deleted");
    },
    onError: () => toast.error("Failed to delete rule"),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] }),
    ]);
    setIsRefreshing(false);
  };

  const filteredRules = rules.filter((rule: AutomationRule) =>
    rule.name.toLowerCase().includes(search.toLowerCase()) ||
    rule.description?.toLowerCase().includes(search.toLowerCase())
  );

  const activeRules = rules.filter((r: AutomationRule) => r.isActive).length;
  const pausedRules = rules.filter((r: AutomationRule) => !r.isActive).length;

  if (error) return <ErrorFallback error={error as Error} onRetry={() => window.location.reload()} retryLabel="Retry" />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 mb-3">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Automation · Rules</span>
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Automation Rules</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">{rules.length} total</span>
              <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">{activeRules} active</span>
              {rules.length - activeRules > 0 && <span className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">{rules.length - activeRules} inactive</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => setLogsDialogOpen(true)}>
              <Activity className="h-3.5 w-3.5" /> Logs
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setRuleDialogOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New Rule
            </Button>
          </div>
        </div>
      </section>

      {/* Rules List */}
      <motion.section variants={item}>
        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border border-border/60 bg-card"
              />
            ))}
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="relative overflow-hidden rounded-3xl border border-dashed border-border/60 bg-card p-12 text-center">
            <Zap className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
            <h3 className="font-display text-xl font-semibold text-foreground">
              No automation rules yet
            </h3>
            <p className="mt-2 text-muted-foreground">
              Create your first rule to start automating your workflow.
            </p>
            <Button
              className="mt-4 gap-2"
              onClick={() => setRuleDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create First Rule
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {filteredRules.map((rule: AutomationRule) => {
              const TriggerIcon = triggerIcons[rule.trigger] || Zap;
              const actions = rule.actions as any[] || [];

              return (
                <motion.article
                  key={rule.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-card p-5 shadow-card transition-all hover:border-border hover:shadow-lg",
                    rule.isActive ? "border-border/60" : "border-border/30 opacity-60"
                  )}
                >
                  <div
                    className={cn(
                      "absolute left-0 top-0 h-0.5 w-full transition-all duration-300",
                      rule.isActive
                        ? "bg-gradient-to-r from-success to-success/60"
                        : "bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10"
                    )}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                          rule.isActive
                            ? "bg-gradient-to-br from-success/20 to-success/10 text-success"
                            : "bg-secondary text-muted-foreground"
                        )}
                      >
                        <TriggerIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-base font-semibold text-foreground">
                          {rule.name}
                        </h3>
                        {rule.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {rule.description}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs",
                              rule.isActive
                                ? "border-success/30 bg-success/10 text-success"
                                : "border-muted-foreground/30 bg-secondary text-muted-foreground"
                            )}
                          >
                            {rule.isActive ? (
                              <Play className="mr-1 h-3 w-3" />
                            ) : (
                              <Pause className="mr-1 h-3 w-3" />
                            )}
                            {rule.isActive ? "Active" : "Paused"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {triggerLabels[rule.trigger] || rule.trigger}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 rounded-lg"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedRule(rule);
                            setLogsDialogOpen(true);
                          }}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Logs
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleMutation.mutate(rule.id)}
                        >
                          {rule.isActive ? (
                            <>
                              <Pause className="mr-2 h-4 w-4" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="mr-2 h-4 w-4" />
                              Activate
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedRule(rule);
                            setRuleDialogOpen(true);
                          }}
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Delete this rule?")) {
                              deleteMutation.mutate(rule.id);
                            }
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 rounded-xl border border-border/40 bg-secondary/20 p-3">
                    <p className={cn("mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground", TEXT.eyebrow)}>
                      Actions ({actions.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {actions.slice(0, 3).map((action: any, idx: number) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="text-xs bg-background/50"
                        >
                          {actionLabels[action.type] || action.type}
                        </Badge>
                      ))}
                      {actions.length > 3 && (
                        <Badge variant="outline" className="text-xs bg-background/50">
                          +{actions.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Run count: <span className="font-semibold">{rule.runCount}</span>
                    </span>
                    {rule.lastRunAt && (
                      <span>
                        Last run: {new Date(rule.lastRunAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </motion.section>

      {/* Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rule Execution Logs</DialogTitle>
            <DialogDescription>
              {selectedRule?.name} - Recent execution history
            </DialogDescription>
          </DialogHeader>
          {selectedRule && <RuleLogs ruleId={selectedRule.id} />}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Rule Dialog */}
      <Dialog open={ruleDialogOpen} onOpenChange={open => { setRuleDialogOpen(open); if (!open) setSelectedRule(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{selectedRule ? "Edit Automation Rule" : "Create Automation Rule"}</DialogTitle>
            <DialogDescription>
              {selectedRule ? "Modify your automation rule settings." : "Set up a trigger and actions to automate your workflow."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <RuleBuilder onSuccess={() => { setRuleDialogOpen(false); setSelectedRule(null); }} editRule={selectedRule} />
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
