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
  deal_created: "Deal Created",
  deal_stage_changed: "Deal Stage Changed",
  deal_closed: "Deal Closed",
  task_created: "Task Created",
  task_completed: "Task Completed",
  task_overdue: "Task Overdue",
  client_created: "Client Created",
  client_health_changed: "Client Health Changed",
  invoice_created: "Invoice Created",
  invoice_overdue: "Invoice Overdue",
  payroll_due: "Payroll Due",
  project_stalled: "Project Stalled",
  custom_schedule: "Scheduled",
};

const triggerIcons: Record<string, any> = {
  lead_created: Plus,
  lead_updated: Edit2,
  lead_scored: Activity,
  lead_assigned: Bell,
  deal_created: Plus,
  deal_stage_changed: ChevronRight,
  deal_closed: CheckCircle2,
  task_created: Plus,
  task_completed: CheckCircle2,
  task_overdue: AlertCircle,
  client_created: Plus,
  client_health_changed: Activity,
  invoice_created: Plus,
  invoice_overdue: AlertCircle,
  payroll_due: Clock,
  project_stalled: AlertCircle,
  custom_schedule: Clock,
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

  const { data: rules = [], isLoading } = useQuery({
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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero Section */}
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card"
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-info to-success" />
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-primary/5 to-info/5 blur-3xl" />

        <div className={cn("relative", SPACING.card)}>
          <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-primary" />
                Automation
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
                  Automation
                </span>{" "}
                Rules
              </h1>
              <p className={cn("max-w-xl text-muted-foreground", TEXT.bodyRelaxed)}>
                Create rules to automate your GTM workflow. Triggers fire actions automatically.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
              <Dialog open={ruleDialogOpen} onOpenChange={open => { setRuleDialogOpen(open); if (!open) setSelectedRule(null); }}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Create Rule
                  </Button>
                </DialogTrigger>
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
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Total Rules", value: rules.length, icon: Zap, gradient: "from-primary to-primary/60" },
              { label: "Active", value: activeRules, icon: Play, gradient: "from-success to-success/60" },
              { label: "Paused", value: pausedRules, icon: Pause, gradient: "from-warning to-warning/60" },
              { label: "Executions", value: stats?.totalLogs || 0, icon: Activity, gradient: "from-info to-info/60" },
            ].map((stat) => (
              <div
                key={stat.label}
                className={cn(
                  "relative overflow-hidden rounded-xl border border-border/40 bg-secondary/20 p-3",
                  RADIUS.md
                )}
              >
                <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", stat.gradient)} />
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br border",
                      stat.gradient,
                      "text-white border-transparent"
                    )}
                  >
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

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search rules..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-10 rounded-xl border border-border/40 bg-background/70 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>
          </div>
        </div>
      </motion.section>

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
    </motion.div>
  );
}
