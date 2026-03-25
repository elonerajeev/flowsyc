import type {
  ActivityItem,
  AttendanceRecord,
  ClientRecord,
  CommandAction,
  ConversationRecord,
  InvoiceRecord,
  KPIMetric,
  MessageRecord,
  ProjectRecord,
  ReportRecord,
  TaskColumn,
  TaskRecord,
  TeamMemberRecord,
  ThemePreview,
} from "@/types/crm";

export const dashboardMetrics: KPIMetric[] = [
  { label: "Revenue Run Rate", value: "$1.82M", change: "+14.8%", direction: "up", detail: "versus last quarter" },
  { label: "Active Clients", value: "128", change: "+9.2%", direction: "up", detail: "12 enterprise accounts" },
  { label: "Pipeline Coverage", value: "3.6x", change: "+0.4x", direction: "up", detail: "against target" },
  { label: "At-Risk Accounts", value: "06", change: "-2", direction: "up", detail: "health score below 70" },
];

export const revenueSeries = [
  { month: "Jan", revenue: 42000, deals: 12, retention: 91 },
  { month: "Feb", revenue: 48000, deals: 15, retention: 92 },
  { month: "Mar", revenue: 57000, deals: 17, retention: 94 },
  { month: "Apr", revenue: 61200, deals: 19, retention: 95 },
  { month: "May", revenue: 69000, deals: 22, retention: 95 },
  { month: "Jun", revenue: 75400, deals: 25, retention: 96 },
];

export const pipelineBreakdown = [
  { name: "Qualified", value: 28, color: "hsl(211 38% 51%)" },
  { name: "Proposal", value: 24, color: "hsl(213 43% 64%)" },
  { name: "Negotiation", value: 18, color: "hsl(202 100% 88%)" },
  { name: "Closed Won", value: 30, color: "hsl(173 58% 39%)" },
];

export const operatingCadence = [
  { name: "Revenue", value: 91 },
  { name: "Delivery", value: 84 },
  { name: "Support", value: 88 },
  { name: "Ops", value: 79 },
  { name: "Hiring", value: 73 },
];

export const clientRecords: ClientRecord[] = [
  { id: 1, name: "Acme Corporation", industry: "Technology", manager: "Sarah Johnson", status: "active", revenue: "$45,000", location: "San Francisco, CA", avatar: "AC", tier: "Enterprise", healthScore: 92, nextAction: "Renewal prep call", segment: "Renewal" },
  { id: 2, name: "GlobalTech Inc", industry: "Finance", manager: "Mike Chen", status: "active", revenue: "$82,000", location: "New York, NY", avatar: "GT", tier: "Strategic", healthScore: 88, nextAction: "Multi-region rollout", segment: "Expansion" },
  { id: 3, name: "StartUp Labs", industry: "Healthcare", manager: "Emily Davis", status: "pending", revenue: "$12,000", location: "Austin, TX", avatar: "SL", tier: "Growth", healthScore: 71, nextAction: "Finalize onboarding docs", segment: "New Business" },
  { id: 4, name: "Digital Wave", industry: "Marketing", manager: "James Wilson", status: "active", revenue: "$28,000", location: "Chicago, IL", avatar: "DW", tier: "Growth", healthScore: 80, nextAction: "Quarterly strategy review", segment: "Expansion" },
  { id: 5, name: "CloudNine Solutions", industry: "Technology", manager: "Lisa Park", status: "pending", revenue: "$55,000", location: "Seattle, WA", avatar: "CS", tier: "Enterprise", healthScore: 76, nextAction: "Security review workshop", segment: "New Business" },
  { id: 6, name: "MetaVerse Corp", industry: "Entertainment", manager: "Sarah Johnson", status: "completed", revenue: "$120,000", location: "Los Angeles, CA", avatar: "MV", tier: "Strategic", healthScore: 96, nextAction: "Executive business review", segment: "Renewal" },
];

export const projectRecords: ProjectRecord[] = [
  { id: 1, name: "CRM Platform v2.0", description: "Complete redesign of the CRM dashboard with new analytics", progress: 78, status: "in-progress", team: ["SJ", "MC", "LP"], dueDate: "Apr 15", tasks: { done: 32, total: 41 }, stage: "Build", budget: "$240K" },
  { id: 2, name: "Mobile App Launch", description: "Native iOS and Android app for client management", progress: 45, status: "in-progress", team: ["MC", "ED"], dueDate: "May 1", tasks: { done: 18, total: 40 }, stage: "Review", budget: "$180K" },
  { id: 3, name: "AI Concierge", description: "Account insights assistant for sales and success teams", progress: 92, status: "active", team: ["MC", "JW"], dueDate: "Mar 28", tasks: { done: 23, total: 25 }, stage: "Launch", budget: "$95K" },
  { id: 4, name: "Executive Reporting", description: "Cross-functional analytics layer for leadership reporting", progress: 30, status: "pending", team: ["ED", "SJ", "LP", "TA"], dueDate: "Jun 10", tasks: { done: 9, total: 30 }, stage: "Discovery", budget: "$75K" },
  { id: 5, name: "Customer Ops Portal", description: "Shared workspace for client requests, billing, and workflows", progress: 100, status: "completed", team: ["LP", "MC"], dueDate: "Mar 15", tasks: { done: 20, total: 20 }, stage: "Launch", budget: "$130K" },
];

export const taskBoard: Record<TaskColumn, TaskRecord[]> = {
  todo: [
    { id: 1, title: "Finalize premium onboarding storyboard", assignee: "Emily Davis", avatar: "ED", priority: "high", dueDate: "Mar 28", tags: ["Design"], valueStream: "Growth" },
    { id: 2, title: "Document API handshake states", assignee: "Mike Chen", avatar: "MC", priority: "medium", dueDate: "Mar 30", tags: ["Platform"], valueStream: "Product" },
    { id: 3, title: "Map expansion signals for tier-1 accounts", assignee: "Sarah Johnson", avatar: "SJ", priority: "low", dueDate: "Apr 2", tags: ["Revenue"], valueStream: "Growth" },
  ],
  "in-progress": [
    { id: 4, title: "Refine executive dashboard hierarchy", assignee: "Lisa Park", avatar: "LP", priority: "high", dueDate: "Mar 26", tags: ["UI", "Analytics"], valueStream: "Product" },
    { id: 5, title: "Automate invoice reminder draft", assignee: "Emily Davis", avatar: "ED", priority: "medium", dueDate: "Mar 29", tags: ["Finance"], valueStream: "Support" },
  ],
  done: [
    { id: 6, title: "Migrate account notes schema", assignee: "Mike Chen", avatar: "MC", priority: "high", dueDate: "Mar 20", tags: ["Platform"], valueStream: "Product" },
    { id: 7, title: "Review churn risk signals", assignee: "James Wilson", avatar: "JW", priority: "low", dueDate: "Mar 22", tags: ["Success"], valueStream: "Support" },
  ],
};

export const activityFeed: ActivityItem[] = [
  { id: 1, text: "Sarah closed a renewal expansion with Acme Corp", time: "5 min ago", type: "completed" },
  { id: 2, text: "New onboarding workflow assigned to Mike", time: "18 min ago", type: "pending" },
  { id: 3, text: "Executive review booked with GlobalTech", time: "42 min ago", type: "active" },
  { id: 4, text: "CRM Platform v2.0 moved into review", time: "2 hours ago", type: "in-progress" },
  { id: 5, text: "New candidate entered final interview loop", time: "3 hours ago", type: "pending" },
];

export const commandActions: CommandAction[] = [
  { id: "open-dashboard", title: "Open Dashboard", description: "Review pipeline, revenue, and team focus", section: "Navigate", route: "/overview" },
  { id: "open-activity", title: "Open Activity", description: "See events, notifications, and updates", section: "Navigate", route: "/overview/activity" },
  { id: "open-clients", title: "Open Clients", description: "View accounts, health scores, and next actions", section: "Navigate", route: "/sales/clients" },
  { id: "open-attendance", title: "Open Attendance", description: "Review check-ins, remote work, and absences", section: "Navigate", route: "/people/attendance" },
  { id: "open-projects", title: "Open Projects", description: "Track delivery progress and budgets", section: "Navigate", route: "/workspace/projects" },
  { id: "open-leads", title: "Open Leads", description: "Review early-stage opportunities", section: "Navigate", route: "/sales/leads" },
  { id: "open-deals", title: "Open Deals", description: "Track pipeline close probability", section: "Navigate", route: "/sales/deals" },
  { id: "open-analytics", title: "Open Analytics", description: "Inspect business trends and growth", section: "Navigate", route: "/insights/analytics" },
  { id: "quick-create", title: "Quick Create", description: "Add a client, project, task, or invoice draft", section: "Actions", shortcut: "Shift+N", intent: "open-quick-create" },
  { id: "open-settings", title: "Open Settings", description: "Adjust workspace, theme, and role preview", section: "Actions", route: "/system/settings" },
];

export const conversations: ConversationRecord[] = [
  { id: 1, name: "Sarah Johnson", avatar: "SJ", lastMessage: "The client approved the proposal.", time: "2m", unread: 2, online: true, team: "Revenue" },
  { id: 2, name: "Mike Chen", avatar: "MC", lastMessage: "API docs are ready for review.", time: "15m", unread: 1, online: true, team: "Platform" },
  { id: 3, name: "Lisa Park", avatar: "LP", lastMessage: "Updated design tokens are in Figma.", time: "1h", unread: 0, online: false, team: "Design" },
  { id: 4, name: "Emily Davis", avatar: "ED", lastMessage: "Meeting notes from yesterday.", time: "3h", unread: 0, online: true, team: "Growth" },
  { id: 5, name: "Team General", avatar: "TG", lastMessage: "Emily: Let's sync tomorrow morning.", time: "6h", unread: 0, online: false, team: "All Hands" },
];

export const messages: MessageRecord[] = [
  { id: 1, chatId: 1, sender: "Sarah Johnson", text: "Hey John, just wrapped the call with Acme.", time: "10:30 AM", isMe: false },
  { id: 2, chatId: 1, sender: "Me", text: "Did they lean toward the multi-year plan?", time: "10:32 AM", isMe: true },
  { id: 3, chatId: 1, sender: "Sarah Johnson", text: "Yes. They want the annual contract with expansion seats in Q3.", time: "10:33 AM", isMe: false },
  { id: 4, chatId: 2, sender: "Mike Chen", text: "I pushed the latest auth flow contract docs.", time: "09:18 AM", isMe: false },
  { id: 5, chatId: 2, sender: "Me", text: "Perfect. I’ll review the payload shapes today.", time: "09:24 AM", isMe: true },
];

export const invoices: InvoiceRecord[] = [
  { id: "INV-1024", client: "Acme Corp", amount: "$12,400", date: "Mar 20, 2026", due: "Apr 20, 2026", status: "pending" },
  { id: "INV-1023", client: "GlobalTech", amount: "$8,200", date: "Mar 15, 2026", due: "Apr 15, 2026", status: "completed" },
  { id: "INV-1022", client: "StartUp Labs", amount: "$3,500", date: "Mar 10, 2026", due: "Apr 10, 2026", status: "active" },
  { id: "INV-1021", client: "Digital Wave", amount: "$6,800", date: "Mar 5, 2026", due: "Apr 5, 2026", status: "completed" },
  { id: "INV-1020", client: "CloudNine", amount: "$15,200", date: "Feb 28, 2026", due: "Mar 28, 2026", status: "rejected" },
];

export const reports: ReportRecord[] = [
  { title: "Monthly Revenue Report", description: "Revenue by segment, plan type, and account owner", date: "Mar 2026", type: "Financial", gradient: "from-success/18 via-success/6 to-transparent" },
  { title: "Team Performance Q1", description: "Operating cadence, delivery pace, and capacity planning", date: "Q1 2026", type: "HR", gradient: "from-primary/18 via-primary/8 to-transparent" },
  { title: "Client Acquisition Report", description: "New logo funnel, source quality, and conversion mix", date: "Mar 2026", type: "Sales", gradient: "from-accent/18 via-accent/8 to-transparent" },
  { title: "Executive Delivery Overview", description: "Program health, blockers, and launch readiness", date: "Mar 2026", type: "Operations", gradient: "from-info/16 via-info/8 to-transparent" },
];

export const teamMembers: TeamMemberRecord[] = [
  { id: 1, name: "Sarah Johnson", email: "sarah@crmpro.com", role: "Admin", status: "active", avatar: "SJ", department: "Sales", attendance: "present", checkIn: "8:42 AM", location: "HQ - Floor 3", workload: 82 },
  { id: 2, name: "Mike Chen", email: "mike@crmpro.com", role: "Manager", status: "active", avatar: "MC", department: "Engineering", attendance: "remote", checkIn: "9:05 AM", location: "Remote", workload: 68 },
  { id: 3, name: "Emily Davis", email: "emily@crmpro.com", role: "Employee", status: "active", avatar: "ED", department: "Marketing", attendance: "late", checkIn: "9:27 AM", location: "HQ - Floor 2", workload: 74 },
  { id: 4, name: "James Wilson", email: "james@crmpro.com", role: "Manager", status: "pending", avatar: "JW", department: "Support", attendance: "present", checkIn: "8:58 AM", location: "HQ - Floor 1", workload: 58 },
  { id: 5, name: "Lisa Park", email: "lisa@crmpro.com", role: "Employee", status: "active", avatar: "LP", department: "Design", attendance: "remote", checkIn: "9:11 AM", location: "Remote", workload: 61 },
  { id: 6, name: "Tom Anderson", email: "tom@crmpro.com", role: "Employee", status: "pending", avatar: "TA", department: "Sales", attendance: "absent", checkIn: "-", location: "No check-in", workload: 39 },
];

export const attendanceRecords: AttendanceRecord[] = teamMembers.map((member) => ({
  id: member.id,
  name: member.name,
  role: member.role,
  department: member.department,
  status: member.attendance,
  checkIn: member.checkIn,
  location: member.location,
  note:
    member.attendance === "absent"
      ? "Needs follow-up"
      : member.attendance === "late"
        ? "Late check-in"
        : member.attendance === "remote"
          ? "Remote today"
          : "On time",
}));

export const themePreviews: Record<string, ThemePreview> = {
  ocean: { label: "Ocean", subtitle: "Professional SaaS blue", vibe: "Best for corporate CRM, sales leadership, and clean data density." },
  midnight: { label: "Midnight", subtitle: "Dark executive mode", vibe: "Best for night users, dense dashboards, and high-contrast workflows." },
  nebula: { label: "Nebula", subtitle: "Startup premium gradient", vibe: "Best for modern product teams and a more expressive brand feel." },
  slate: { label: "Slate", subtitle: "Minimal enterprise", vibe: "Best for conservative corporate environments and long-form work." },
};
