/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Zap, Mail, Bell, Users, Activity, ChevronRight, CheckCircle2, Edit2, Clock, Search, AlertTriangle, Snowflake, Calendar, Calculator, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const triggers = [
  { value: "lead_created", label: "Lead Created", icon: Plus, description: "When a new lead is added", category: "lead" },
  { value: "lead_updated", label: "Lead Updated", icon: Activity, description: "When lead data changes", category: "lead" },
  { value: "lead_scored", label: "Lead Scored", icon: Activity, description: "When lead score changes", category: "lead" },
  { value: "lead_score_above", label: "Score Above X", icon: Activity, description: "When score exceeds threshold", category: "lead" },
  { value: "lead_score_below", label: "Score Below X", icon: Activity, description: "When score drops below threshold", category: "lead" },
  { value: "lead_assigned", label: "Lead Assigned", icon: Users, description: "When lead is assigned", category: "lead" },
  { value: "cold_lead_detected", label: "Cold Lead", icon: Snowflake, description: "When lead goes cold (no activity)", category: "lead" },
  { value: "deal_created", label: "Deal Created", icon: Plus, description: "When a new deal is created", category: "deal" },
  { value: "deal_stage_changed", label: "Deal Stage Changed", icon: ChevronRight, description: "When deal moves stages", category: "deal" },
  { value: "deal_closed", label: "Deal Closed", icon: Activity, description: "When deal is won or lost", category: "deal" },
  { value: "deal_stale", label: "Deal Stale", icon: Clock, description: "When deal has no activity", category: "deal" },
  { value: "task_created", label: "Task Created", icon: Plus, description: "When a task is created", category: "task" },
  { value: "task_completed", label: "Task Completed", icon: CheckCircle2, description: "When a task is completed", category: "task" },
  { value: "task_overdue", label: "Task Overdue", icon: Bell, description: "When a task becomes overdue", category: "task" },
  { value: "client_created", label: "Client Created", icon: Plus, description: "When a client is created", category: "client" },
  { value: "client_health_changed", label: "Health Changed", icon: Activity, description: "When client health changes", category: "client" },
  { value: "client_health_low", label: "Health Low", icon: AlertTriangle, description: "When health score drops", category: "client" },
  { value: "churn_risk", label: "Churn Risk", icon: AlertTriangle, description: "When client at risk of churn", category: "client" },
  { value: "followup_due", label: "Follow-up Due", icon: Bell, description: "When follow-up is due", category: "task" },
  { value: "renewal_due", label: "Renewal Due", icon: Calendar, description: "When contract renewal approaches", category: "client" },
  { value: "invoice_created", label: "Invoice Created", icon: Plus, description: "When an invoice is created", category: "finance" },
  { value: "invoice_overdue", label: "Invoice Overdue", icon: AlertTriangle, description: "When an invoice becomes overdue", category: "finance" },
  { value: "payroll_due", label: "Payroll Due", icon: Clock, description: "When payroll run is due", category: "finance" },
  { value: "project_stalled", label: "Project Stalled", icon: AlertTriangle, description: "When project progress stalls", category: "operations" },
  { value: "custom_schedule", label: "Scheduled", icon: Activity, description: "Run on a schedule (cron)", category: "schedule" },
  { value: "manual", label: "Manual Trigger", icon: Zap, description: "Run manually from automation controls", category: "system" },
];

const triggerCategories = [
  { id: "all", label: "All" },
  { id: "lead", label: "Leads" },
  { id: "deal", label: "Deals" },
  { id: "task", label: "Tasks" },
  { id: "client", label: "Clients" },
  { id: "finance", label: "Finance" },
  { id: "operations", label: "Operations" },
  { id: "schedule", label: "Scheduled" },
  { id: "system", label: "System" },
];

const conditionOperators = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "greater_than", label: "Greater than" },
  { value: "less_than", label: "Less than" },
  { value: "gte", label: "Greater or equal" },
  { value: ">=", label: "Greater or equal (legacy)" },
  { value: "lte", label: "Less or equal" },
  { value: "<=", label: "Less or equal (legacy)" },
  { value: "in", label: "In list" },
  { value: "not_in", label: "Not in list" },
  { value: "is_empty", label: "Is empty" },
  { value: "is_not_empty", label: "Is not empty" },
] as const;

const operatorsWithoutValue = new Set(["is_empty", "is_not_empty"]);

const actions = [
  // Lead Actions
  { value: "send_email", label: "Send Email", icon: Mail, description: "Send an email", category: "lead" },
  { value: "create_task", label: "Create Task", icon: Plus, description: "Create a follow-up task", category: "lead" },
  { value: "assign_lead", label: "Smart Assign", icon: Users, description: "Auto-assign to best rep", category: "lead" },
  { value: "recalculate_score", label: "Recalculate Score", icon: Calculator, description: "Recalculate lead score", category: "lead" },
  { value: "auto_tag", label: "Auto-Tag", icon: Tag, description: "Auto-tag based on score", category: "lead" },
  { value: "create_followup_sequence", label: "Follow-up Sequence", icon: Bell, description: "Create follow-up reminders", category: "lead" },
  { value: "tag_entity", label: "Add Tag", icon: Tag, description: "Add tags to entity", category: "lead" },
  { value: "remove_tag", label: "Remove Tag", icon: Tag, description: "Remove tags from entity", category: "lead" },
  // Deal Actions
  { value: "update_score", label: "Update Score", icon: Activity, description: "Adjust lead score", category: "deal" },
  { value: "move_deal", label: "Move Deal", icon: ChevronRight, description: "Change deal stage", category: "deal" },
  { value: "add_to_pipeline", label: "Add to Pipeline", icon: ChevronRight, description: "Convert lead to deal", category: "deal" },
  // Client Actions
  { value: "check_health_score", label: "Check Health", icon: Activity, description: "Calculate client health", category: "client" },
  { value: "escalate_to_manager", label: "Escalate", icon: AlertTriangle, description: "Escalate to manager", category: "client" },
  // Communication
  { value: "send_notification", label: "Notification", icon: Bell, description: "Send internal notification", category: "communication" },
  { value: "slack_notification", label: "Slack Message", icon: Activity, description: "Send Slack notification", category: "communication" },
  { value: "add_to_campaign", label: "Add to Campaign", icon: Mail, description: "Add to email campaign", category: "communication" },
  // General
  { value: "create_client", label: "Create Client", icon: Plus, description: "Convert lead to client", category: "general" },
  { value: "update_field", label: "Update Field", icon: Edit2, description: "Update any field", category: "general" },
  { value: "webhook", label: "Webhook", icon: Activity, description: "Call external API", category: "integration" },
  { value: "delay", label: "Delay", icon: Clock, description: "Wait before next action", category: "flow" },
];

const actionCategories = [
  { id: "all", label: "All" },
  { id: "lead", label: "Lead Actions" },
  { id: "deal", label: "Deal Actions" },
  { id: "client", label: "Client Actions" },
  { id: "communication", label: "Communication" },
  { id: "integration", label: "Integrations" },
  { id: "flow", label: "Flow Control" },
  { id: "general", label: "General" },
];

interface ActionConfig {
  type: string;
  config: Record<string, string | number | boolean | string[]>;
}

interface AutomationRuleCondition {
  field: string;
  operator: string;
  value?: unknown;
}

interface RuleConditionInput {
  field: string;
  operator: string;
  value: string;
}

interface AutomationRule {
  id: number;
  name: string;
  description?: string;
  trigger: string;
  conditions?: AutomationRuleCondition[];
  actions: ActionConfig[];
  isActive: boolean;
  priority: number;
  cronExpression?: string;
}

function normalizeConditionValue(operator: string, rawValue: string): unknown {
  if (operatorsWithoutValue.has(operator)) return undefined;

  const value = rawValue.trim();
  if (!value) return "";

  if (operator === "in" || operator === "not_in") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (value === "true") return true;
  if (value === "false") return false;
  if (!Number.isNaN(Number(value)) && value !== "") return Number(value);

  return value;
}

interface RuleBuilderProps {
  onSuccess?: () => void;
  editRule?: AutomationRule | null;
}

export default function RuleBuilder({ onSuccess, editRule }: RuleBuilderProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<"trigger" | "actions" | "details">("trigger");
  const [ruleName, setRuleName] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [selectedTrigger, setSelectedTrigger] = useState("");
  const [conditions, setConditions] = useState<RuleConditionInput[]>([]);
  const [selectedActions, setSelectedActions] = useState<ActionConfig[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [priority, setPriority] = useState(0);
  const [cronExpression, setCronExpression] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [triggerSearch, setTriggerSearch] = useState("");
  const [actionSearch, setActionSearch] = useState("");

  const isEditing = !!editRule;

  useEffect(() => {
    if (editRule) {
      setRuleName(editRule.name);
      setRuleDescription(editRule.description || "");
      setSelectedTrigger(editRule.trigger);
      setConditions((editRule.conditions || []).map((condition) => ({
        field: condition.field || "",
        operator: condition.operator || "equals",
        value: Array.isArray(condition.value)
          ? condition.value.join(", ")
          : condition.value === undefined || condition.value === null
          ? ""
          : String(condition.value),
      })));
      setSelectedActions(editRule.actions || []);
      setIsActive(editRule.isActive);
      setPriority(editRule.priority || 0);
      setCronExpression(editRule.cronExpression || "");
      setStep("details");
      return;
    }

    setRuleName("");
    setRuleDescription("");
    setSelectedTrigger("");
    setConditions([]);
    setSelectedActions([]);
    setIsActive(true);
    setPriority(0);
    setCronExpression("");
    setStep("trigger");
  }, [editRule]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/automation/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create rule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Automation rule created!");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create rule");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/automation/rules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update rule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-rules"] });
      toast.success("Automation rule updated!");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update rule");
    },
  });

  const handleAddAction = (actionType: string) => {
    const defaultConfigs: Record<string, Record<string, any>> = {
      send_email: { to: "{{lead.email}}", subject: "Hello from {{company}}", template: "lead_welcome" },
      create_task: { title: "Follow up with {{lead.name}}", dueIn: "24", priority: "medium" },
      assign_lead: { roundRobin: true },
      update_score: { adjustment: 10 },
      recalculate_score: {},
      auto_tag: {},
      create_followup_sequence: { days: [1, 3, 7] },
      move_deal: { stage: "proposal" },
      create_client: {},
      send_notification: { message: "New {{entityType}} requires attention" },
      slack_notification: { webhookUrl: "", message: "New {{entityType}} created!" },
      tag_entity: { tags: ["hot-lead"] },
      remove_tag: { tags: ["cold-lead"] },
      update_field: { field: "status", value: "qualified" },
      webhook: { url: "https://api.example.com/webhook", method: "POST" },
      check_health_score: {},
      escalate_to_manager: { reason: "Needs attention", priority: "high" },
      add_to_campaign: { campaignName: "Welcome Campaign" },
      add_to_pipeline: { stage: "prospecting" },
      delay: { minutes: 30 },
    };

    setSelectedActions([
      ...selectedActions,
      { type: actionType, config: defaultConfigs[actionType] || {} },
    ]);
  };

  const handleUpdateAction = (index: number, config: Record<string, any>) => {
    const updated = [...selectedActions];
    updated[index] = { ...updated[index], config };
    setSelectedActions(updated);
  };

  const handleRemoveAction = (index: number) => {
    setSelectedActions(selectedActions.filter((_, i) => i !== index));
  };

  const handleAddCondition = () => {
    setConditions([...conditions, { field: "", operator: "equals", value: "" }]);
  };

  const handleUpdateCondition = (index: number, update: Partial<RuleConditionInput>) => {
    const next = [...conditions];
    next[index] = { ...next[index], ...update };
    setConditions(next);
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!ruleName || !selectedTrigger || selectedActions.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (selectedTrigger === "custom_schedule" && !cronExpression.trim()) {
      toast.error("Cron expression is required for scheduled rules");
      return;
    }

    const activeConditions = conditions.filter((condition) => condition.field.trim() || condition.value.trim());

    const invalidCondition = activeConditions.find((condition) => {
      if (!condition.field.trim()) return true;
      if (operatorsWithoutValue.has(condition.operator)) return false;
      return !condition.value.trim();
    });

    if (invalidCondition) {
      toast.error("Each condition needs a field and value");
      return;
    }

    const normalizedConditions = activeConditions.map((condition) => {
      const normalized: {
        field: string;
        operator: string;
        value?: unknown;
      } = {
        field: condition.field.trim(),
        operator: condition.operator,
      };
      const normalizedValue = normalizeConditionValue(condition.operator, condition.value);
      if (normalizedValue !== undefined) {
        normalized.value = normalizedValue;
      }
      return normalized;
    });

    const ruleData = {
      name: ruleName,
      description: ruleDescription,
      trigger: selectedTrigger,
      conditions: normalizedConditions,
      actions: selectedActions,
      isActive,
      priority,
      cronExpression: selectedTrigger === "custom_schedule" ? cronExpression : undefined,
    };

    if (isEditing && editRule) {
      updateMutation.mutate({ id: editRule.id, data: ruleData });
    } else {
      createMutation.mutate(ruleData);
    }
  };

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 shrink-0">
        {["trigger", "actions", "details"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                step === s
                  ? "bg-primary text-primary-foreground"
                  : i < ["trigger", "actions", "details"].indexOf(step)
                  ? "bg-success text-white"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {i + 1}
            </div>
            {i < 2 && (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Trigger */}
      {step === "trigger" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Select Trigger</h3>
            <p className="text-xs text-muted-foreground">
              Choose what event starts this automation
            </p>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Input
              value={triggerSearch}
              onChange={(e) => setTriggerSearch(e.target.value)}
              placeholder="Search triggers..."
              className="h-8 pl-8 text-xs"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
          
          {/* Category Filter */}
          <div className="flex flex-wrap gap-1">
            {triggerCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setTriggerFilter(cat.id)}
                className={cn(
                  "px-2 py-1 text-xs rounded-lg transition-colors",
                  triggerFilter === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          
          {/* Triggers Grid */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {triggers
              .filter(t => {
                const matchesFilter = triggerFilter === "all" || t.category === triggerFilter;
                const matchesSearch = !triggerSearch || 
                  t.label.toLowerCase().includes(triggerSearch.toLowerCase()) ||
                  t.description.toLowerCase().includes(triggerSearch.toLowerCase());
                return matchesFilter && matchesSearch;
              })
              .map((trigger) => {
              const Icon = trigger.icon;
              return (
                <button
                  key={trigger.value}
                  onClick={() => setSelectedTrigger(trigger.value)}
                  className={cn(
                    "flex items-start gap-2 sm:gap-3 rounded-xl border p-2 sm:p-3 text-left transition-all hover:border-primary/50",
                    selectedTrigger === trigger.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:bg-secondary/30"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg",
                      selectedTrigger === trigger.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs sm:text-sm">{trigger.label}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">
                      {trigger.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="flex justify-between shrink-0">
            <Button variant="outline" onClick={() => { setTriggerFilter("all"); setTriggerSearch(""); }}>
              Clear Filters
            </Button>
            <Button onClick={() => setStep("actions")} disabled={!selectedTrigger}>
              Next: Add Actions
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Actions */}
      {step === "actions" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Add Actions</h3>
            <p className="text-xs text-muted-foreground">
              Choose what happens when the trigger fires
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Input
              value={actionSearch}
              onChange={(e) => setActionSearch(e.target.value)}
              placeholder="Search actions..."
              className="h-8 pl-8 text-xs"
            />
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          </div>
          
          {/* Category Filter */}
          <div className="flex flex-wrap gap-1">
            {actionCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActionFilter(cat.id)}
                className={cn(
                  "px-2 py-1 text-[10px] sm:text-xs rounded-lg transition-colors",
                  actionFilter === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Selected Actions */}
          {selectedActions.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Configured ({selectedActions.length})</Label>
              {selectedActions.map((action, index) => {
                const actionInfo = actions.find((a) => a.value === action.type);
                const Icon = actionInfo?.icon || Zap;
                return (
                  <Card key={index} className="border-border/60">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">
                            {actionInfo?.label || action.type}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAction(index)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <ActionConfigForm
                        actionType={action.type}
                        config={action.config}
                        onChange={(config) => handleUpdateAction(index, config)}
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Add Action */}
          <div>
            <Label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Available Actions</Label>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {actions
                .filter((a) => {
                  const matchesFilter = actionFilter === "all" || a.category === actionFilter;
                  const matchesSearch = !actionSearch || 
                    a.label.toLowerCase().includes(actionSearch.toLowerCase()) ||
                    a.description.toLowerCase().includes(actionSearch.toLowerCase());
                  return matchesFilter && matchesSearch && !selectedActions.find((s) => s.type === a.value);
                })
                .map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.value}
                      onClick={() => handleAddAction(action.value)}
                      className="flex items-center gap-2 rounded-lg border border-dashed border-border p-2 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs sm:text-sm">{action.label}</span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="flex justify-between shrink-0">
            <Button variant="outline" onClick={() => { setActionFilter("all"); setActionSearch(""); }}>
              Clear Filters
            </Button>
            <Button onClick={() => setStep("details")} disabled={selectedActions.length === 0}>
              Next: Details
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === "details" && (
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Rule Details</h3>
            <p className="text-sm text-muted-foreground">
              Finalize your automation rule
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Rule Name *</Label>
              <Input
                id="name"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                placeholder="e.g., Auto-assign new leads"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority (higher runs first)</Label>
              <Input
                id="priority"
                type="number"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</Label>
            <Input
              id="description"
              value={ruleDescription}
              onChange={(e) => setRuleDescription(e.target.value)}
              placeholder="Optional description"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conditions (optional)</Label>
              <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={handleAddCondition}>
                <Plus className="h-3 w-3" />
                Add Condition
              </Button>
            </div>
            {conditions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/70 bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
                No conditions set. Rule will run for every matching trigger event.
              </div>
            ) : (
              <div className="space-y-2">
                {conditions.map((condition, index) => {
                  const hideValueInput = operatorsWithoutValue.has(condition.operator);
                  return (
                    <div key={index} className="grid gap-2 rounded-lg border border-border/60 bg-card p-2 sm:grid-cols-[1.4fr_1fr_1.2fr_auto]">
                      <Input
                        value={condition.field}
                        onChange={(event) => handleUpdateCondition(index, { field: event.target.value })}
                        placeholder="Field (e.g. score, status)"
                        className="h-8 text-xs"
                      />
                      <select
                        value={condition.operator}
                        onChange={(event) => {
                          const nextOperator = event.target.value;
                          handleUpdateCondition(index, {
                            operator: nextOperator,
                            value: operatorsWithoutValue.has(nextOperator) ? "" : condition.value,
                          });
                        }}
                        className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                      >
                        {conditionOperators.map((operator) => (
                          <option key={operator.value} value={operator.value}>
                            {operator.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        value={condition.value}
                        onChange={(event) => handleUpdateCondition(index, { value: event.target.value })}
                        placeholder={condition.operator === "in" || condition.operator === "not_in" ? "Value list (comma-separated)" : "Expected value"}
                        className="h-8 text-xs"
                        disabled={hideValueInput}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveCondition(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {selectedTrigger === "custom_schedule" && (
            <div className="space-y-2">
              <Label htmlFor="cron" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Cron Expression</Label>
              <Input
                id="cron"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="0 9 * * * (daily at 9am)"
              />
              <p className="text-xs text-muted-foreground">
                Format: minute(0-59) hour(0-23) day(1-31) month(1-12) weekday(0-6)
              </p>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="isActive" className="text-sm">Activate immediately</Label>
          </div>

          {/* Summary */}
          <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 text-sm">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="flex flex-wrap gap-4 text-xs">
              <span>
                <span className="text-muted-foreground">Trigger:</span>{" "}
                {triggers.find((t) => t.value === selectedTrigger)?.label}
              </span>
              <span>
                <span className="text-muted-foreground">Actions:</span>{" "}
                {selectedActions.map((a) => actions.find((ac) => ac.value === a.type)?.label).join(", ")}
              </span>
              <span>
                <span className="text-muted-foreground">Conditions:</span>{" "}
                {conditions.filter((condition) => condition.field.trim() || condition.value.trim()).length}
              </span>
            </div>
          </div>

          <div className="flex justify-between shrink-0">
            <Button variant="outline" onClick={() => setStep("actions")}>
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : createMutation.isPending ? "Creating..." : isEditing ? "Update Rule" : "Create Rule"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionConfigForm({
  actionType,
  config,
  onChange,
}: {
  actionType: string;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}) {
  switch (actionType) {
    case "send_email":
      return (
        <div className="space-y-2 grid gap-2 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">To</Label>
            <Input
              value={config.to || ""}
              onChange={(e) => onChange({ ...config, to: e.target.value })}
              placeholder="{{lead.email}}"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">Subject</Label>
            <Input
              value={config.subject || ""}
              onChange={(e) => onChange({ ...config, subject: e.target.value })}
              placeholder="Email subject"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-[10px] sm:text-xs">Template</Label>
            <select
              value={config.template || ""}
              onChange={(e) => onChange({ ...config, template: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs h-8"
            >
              <option value="lead_welcome">Lead Welcome</option>
              <option value="lead_assigned">Lead Assigned</option>
              <option value="followup_reminder">Follow-up Reminder</option>
              <option value="deal_won">Deal Won</option>
            </select>
          </div>
        </div>
      );

    case "create_task":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">Task Title</Label>
            <Input
              value={config.title || ""}
              onChange={(e) => onChange({ ...config, title: e.target.value })}
              placeholder="Follow up with {{lead.name}}"
              className="h-8 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Due In (hours)</Label>
              <Input
                type="number"
                value={config.dueIn || ""}
                onChange={(e) => onChange({ ...config, dueIn: e.target.value })}
                placeholder="24"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Priority</Label>
              <select
                value={config.priority || "medium"}
                onChange={(e) => onChange({ ...config, priority: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs h-8"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>
      );

    case "assign_lead":
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="roundRobin"
              checked={config.roundRobin || false}
              onChange={(e) => onChange({ ...config, roundRobin: e.target.checked })}
              className="h-4 w-4 rounded border-input"
            />
            <Label htmlFor="roundRobin" className="text-xs">
              Round-robin
            </Label>
          </div>
          {!config.roundRobin && (
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Assign To</Label>
              <Input
                value={config.assignTo || ""}
                onChange={(e) => onChange({ ...config, assignTo: e.target.value })}
                placeholder="rep@company.com"
                className="h-8 text-xs"
              />
            </div>
          )}
        </div>
      );

    case "update_score":
      return (
        <div className="space-y-2">
          <div className="flex gap-4">
            <div className="flex items-center gap-1">
              <input
                type="radio"
                id="scoreAdd"
                name="scoreAction"
                checked={config.adjustment !== undefined && !config.setTo}
                onChange={() => onChange({ ...config, adjustment: 10, setTo: undefined })}
                className="h-3 w-3"
              />
              <Label htmlFor="scoreAdd" className="text-xs">
                Adjust
              </Label>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="radio"
                id="scoreSet"
                name="scoreAction"
                checked={config.setTo !== undefined}
                onChange={() => onChange({ ...config, adjustment: undefined, setTo: 80 })}
                className="h-3 w-3"
              />
              <Label htmlFor="scoreSet" className="text-xs">
                Set
              </Label>
            </div>
          </div>
          <Input
            type="number"
            value={config.adjustment ?? config.setTo ?? ""}
            onChange={(e) =>
              onChange({
                ...config,
                [config.setTo !== undefined ? "setTo" : "adjustment"]: parseInt(e.target.value) || 0,
              })
            }
            placeholder="Score (0-100)"
            className="h-8 text-xs"
          />
        </div>
      );

    case "move_deal":
      return (
        <div className="space-y-1">
          <Label className="text-[10px] sm:text-xs">Move to Stage</Label>
          <select
            value={config.stage || ""}
            onChange={(e) => onChange({ ...config, stage: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs h-8"
          >
            <option value="prospecting">Prospecting</option>
            <option value="qualification">Qualification</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
            <option value="closed_won">Closed Won</option>
            <option value="closed_lost">Closed Lost</option>
          </select>
        </div>
      );

    case "tag_entity":
      return (
        <div className="space-y-1">
          <Label className="text-[10px] sm:text-xs">Tags (comma-separated)</Label>
          <Input
            value={(config.tags || []).join(", ")}
            onChange={(e) =>
              onChange({ ...config, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
            }
            placeholder="hot-lead, enterprise"
            className="h-8 text-xs"
          />
        </div>
      );

    case "remove_tag":
      return (
        <div className="space-y-1">
          <Label className="text-[10px] sm:text-xs">Tags to Remove</Label>
          <Input
            value={(config.tags || []).join(", ")}
            onChange={(e) =>
              onChange({ ...config, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })
            }
            placeholder="cold-lead, unqualified"
            className="h-8 text-xs"
          />
        </div>
      );

    case "update_field":
      return (
        <div className="grid gap-2 grid-cols-2">
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">Field Name</Label>
            <Input
              value={config.field || ""}
              onChange={(e) => onChange({ ...config, field: e.target.value })}
              placeholder="status"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">New Value</Label>
            <Input
              value={config.value || ""}
              onChange={(e) => onChange({ ...config, value: e.target.value })}
              placeholder="qualified"
              className="h-8 text-xs"
            />
          </div>
        </div>
      );

    case "webhook":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">Webhook URL</Label>
            <Input
              value={config.url || ""}
              onChange={(e) => onChange({ ...config, url: e.target.value })}
              placeholder="https://api.example.com/webhook"
              className="h-8 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] sm:text-xs">Method</Label>
              <select
                value={config.method || "POST"}
                onChange={(e) => onChange({ ...config, method: e.target.value })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs h-8"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
          </div>
        </div>
      );

    case "add_to_pipeline":
      return (
        <div className="space-y-1">
          <Label className="text-[10px] sm:text-xs">Initial Stage</Label>
          <select
            value={config.stage || "prospecting"}
            onChange={(e) => onChange({ ...config, stage: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs h-8"
          >
            <option value="prospecting">Prospecting</option>
            <option value="qualification">Qualification</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
          </select>
        </div>
      );

    case "add_to_campaign":
      return (
        <div className="space-y-1">
          <Label className="text-[10px] sm:text-xs">Campaign Name</Label>
          <Input
            value={config.campaignName || ""}
            onChange={(e) => onChange({ ...config, campaignName: e.target.value })}
            placeholder="Welcome Campaign"
            className="h-8 text-xs"
          />
        </div>
      );

    case "slack_notification":
      return (
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">Webhook URL</Label>
            <Input
              value={config.webhookUrl || ""}
              onChange={(e) => onChange({ ...config, webhookUrl: e.target.value })}
              placeholder="https://hooks.slack.com/..."
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] sm:text-xs">Message</Label>
            <Input
              value={config.message || ""}
              onChange={(e) => onChange({ ...config, message: e.target.value })}
              placeholder="New lead: {{lead.name}}"
              className="h-8 text-xs"
            />
          </div>
        </div>
      );

    case "delay":
      return (
        <div className="space-y-1">
          <Label className="text-[10px] sm:text-xs">Wait (minutes)</Label>
          <Input
            type="number"
            value={config.minutes || 30}
            onChange={(e) => onChange({ ...config, minutes: parseInt(e.target.value) || 0 })}
            placeholder="30"
            className="h-8 text-xs"
          />
        </div>
      );

    default:
      return (
        <div className="space-y-1">
          <Label className="text-xs">Configuration</Label>
          <Input
            value={JSON.stringify(config)}
            onChange={(e) => {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                // Invalid JSON, ignore
              }
            }}
            placeholder="{}"
          />
        </div>
      );
  }
}
