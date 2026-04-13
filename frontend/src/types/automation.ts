export interface AutomationRuleAction {
  type: string;
  config: Record<string, unknown>;
}

export interface AutomationRuleCondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface AutomationRule {
  id: number;
  name: string;
  description?: string;
  trigger: string;
  conditions: AutomationRuleCondition[];
  actions: AutomationRuleAction[];
  cronExpression?: string;
  isActive: boolean;
  status: "active" | "paused" | "archived";
  priority: number;
  maxRunsPerDay?: number;
  runCount: number;
  lastRunAt?: string;
  lastRunError?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationLogAction {
  ruleId: number;
  action: string;
  success: boolean;
  error?: string;
}

export interface AutomationLog {
  id: number;
  ruleId: number;
  rule?: { name: string };
  trigger: string;
  triggerData: Record<string, unknown>;
  actionData: AutomationLogAction[];
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  startedAt: string;
  completedAt?: string;
  error?: string;
  entityType?: string;
  entityId?: number;
  durationMs?: number;
  createdAt: string;
}

export interface ScheduledJob {
  id: number;
  jobType: "email" | "task" | "alert" | "webhook" | "reminder";
  name: string;
  description?: string;
  scheduledFor: string;
  cronExpression?: string;
  payload: Record<string, unknown>;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  isRecurring: boolean;
  nextRunAt?: string;
  runCount: number;
  lastRunAt?: string;
  lastError?: string;
  entityType?: string;
  entityId?: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  type: string;
  severity: "warning" | "critical";
  title: string;
  description: string;
  entityId?: number;
  entityType: string;
  actionUrl?: string;
}

export interface AutomationStats {
  activeRules: number;
  totalLogs: number;
  pendingJobs: number;
  failedToday: number;
  sentToday: number;
  alertsSummary: {
    total: number;
    critical: number;
    warning: number;
    byType: Record<string, number>;
  };
}

export interface GTMOverview {
  summary: {
    totalLeads: number;
    totalContacts: number;
    totalClients: number;
    totalDeals: number;
    pendingFollowups: number;
    pendingAutomations: number;
    churnRiskClients: number;
    staleDeals: number;
  };
  funnels: {
    leads: Record<string, number>;
    deals: Record<string, number>;
  };
  leakage: {
    orphanContacts: number;
    leadsWithoutDeals: number;
    wonLeadsPendingConversion: number;
  };
  hotLeads: Array<{
    id: number;
    name: string;
    company: string;
    score: number;
    status: string;
    assignedTo?: string;
  }>;
  workQueues: {
    pendingTasks: Array<{
      id: number;
      title: string;
      assignee: string;
      dueDate: string;
      tags: string[];
    }>;
    scheduled: Array<{
      id: number;
      name: string;
      jobType: string;
      scheduledFor: string;
      entityType?: string;
      entityId?: number;
    }>;
    churnRiskClients: Array<{
      id: number;
      name: string;
      healthScore: number;
      nextAction: string;
      owner?: string;
    }>;
    staleDeals: Array<{
      id: number;
      title: string;
      stage: string;
      assignedTo?: string;
      updatedAt: string;
    }>;
    orphanContacts: Array<{
      id: number;
      name: string;
      email: string;
      jobTitle?: string;
    }>;
  };
  recentAutomation: AutomationLog[];
  recentActivities: Array<{
    id: number;
    action: string;
    entityType: string;
    entityId: number;
    description?: string;
    performedBy?: string;
    createdAt: string;
  }>;
  alerts: Array<{
    id: number;
    title: string;
    message: string;
    severity: string;
    entityType?: string;
    entityId?: number;
    createdAt: string;
  }>;
  nextActions: Array<{
    type: string;
    title: string;
    owner?: string;
    dueDate: string;
    entityType: string;
    entityId: number;
  }>;
}
