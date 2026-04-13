// Refresh message configurations for different contexts
const REFRESH_MESSAGES = {
  // Page-specific messages
  analytics: "🔄 Analyzing business metrics...",
  dashboard: "📊 Updating dashboard data...",
  clients: "👥 Refreshing client portfolio...",
  projects: "📁 Syncing project data...",
  tasks: "✅ Updating task board...",
  team: "👨‍👩‍👧‍👨 Refreshing team roster...",
  invoices: "💰 Recalculating billing data...",
  payroll: "💸 Updating salary information...",
  candidates: "🎯 Refreshing candidate pipeline...",
  attendance: "⏰ Checking attendance records...",
  notes: "📝 Syncing notes...",
  activity: "📈 Loading activity feed...",
  hiring: "🎯 Refreshing job postings...",
  sales: "📈 Updating sales pipeline...",
  audit: "🔍 Scanning audit logs...",
  calendar: "📅 Syncing calendar events...",
  messages: "💬 Refreshing conversations...",
  reports: "📊 Generating fresh reports...",
  settings: "⚙️ Updating preferences...",
  billing: "💳 Checking billing status...",

  // Generic fallback
  default: "🔄 Refreshing data...",
} as const;

type PageContext = keyof typeof REFRESH_MESSAGES;

export function getRefreshMessage(context: string): string {
  const normalizedContext = context.toLowerCase().replace(/page$/, '') as PageContext;
  return REFRESH_MESSAGES[normalizedContext] || REFRESH_MESSAGES.default;
}

export function getRefreshSuccessMessage(context: string): string {
  const contextMap: Record<string, string> = {
    analytics: "Analytics refreshed with latest data",
    dashboard: "Dashboard updated",
    clients: "Client portfolio refreshed",
    projects: "Project data synchronized",
    tasks: "Task board updated",
    team: "Team roster refreshed",
    invoices: "Billing data recalculated",
    payroll: "Salary information updated",
    candidates: "Candidate pipeline refreshed",
    attendance: "Attendance records updated",
    notes: "Notes synchronized",
    activity: "Activity feed loaded",
    hiring: "Job postings refreshed",
    sales: "Sales pipeline updated",
    audit: "Audit logs scanned",
    calendar: "Calendar events synchronized",
    messages: "Conversations refreshed",
    reports: "Reports generated",
    settings: "Preferences updated",
    billing: "Billing status checked",
  };

  const normalizedContext = context.toLowerCase().replace(/page$/, '');
  return contextMap[normalizedContext] || "Data refreshed successfully";
}