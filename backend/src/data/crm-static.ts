export type LeadSource = "website" | "referral" | "social" | "email" | "phone" | "event" | "advertisement" | "other";
export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type DealStage = "prospecting" | "qualification" | "proposal" | "negotiation" | "closed-won" | "closed-lost";
export type CompanySize = "startup" | "small" | "medium" | "large" | "enterprise";
export type SalesMetrics = {
  totalRevenue: number;
  monthlyRevenue: number;
  dealsWon: number;
  dealsLost: number;
  conversionRate: number;
  averageDealSize: number;
  salesCycle: number;
  pipelineValue: number;
  forecastedRevenue: number;
};

export type ContactRecord = {
  id: string;
  companyId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle?: string;
  isPrimary: boolean;
  avatar?: string;
  createdAt: string;
};

export type CompanyRecord = {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: CompanySize;
  phone?: string;
  email?: string;
  status: "active" | "inactive" | "prospect";
  contacts: ContactRecord[];
  deals: Array<Record<string, never>>;
  value: number;
  createdAt: string;
  updatedAt: string;
};

export type LeadRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source: LeadSource;
  status: LeadStatus;
  score: number;
  assignedTo?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  convertedAt?: string;
  convertedToClientId?: string;
};

export type DealRecord = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  expectedCloseDate: string;
  actualCloseDate?: string;
  companyId?: string;
  contactId?: string;
  assignedTo: string;
  description?: string;
  tags: string[];
  activities: [];
  createdAt: string;
  updatedAt: string;
};

export type CommandActionRecord = {
  id: string;
  title: string;
  description: string;
  section: string;
  route?: string;
  shortcut?: string;
  intent?: "open-quick-create" | "open-settings";
};

export type ThemePreviewRecord = {
  label: string;
  subtitle: string;
  vibe: string;
};

export type ConversationSeedRecord = {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  team: string;
};

export type MessageSeedRecord = {
  id: number;
  conversationId: number;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
};

export const commandActions: CommandActionRecord[] = [
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

export const themePreviews: Record<string, ThemePreviewRecord> = {
  ocean: { label: "Ocean", subtitle: "Professional SaaS blue", vibe: "Best for corporate CRM, sales leadership, and clean data density." },
  midnight: { label: "Midnight", subtitle: "Dark executive mode", vibe: "Best for night users, dense dashboards, and high-contrast workflows." },
  nebula: { label: "Nebula", subtitle: "Startup premium gradient", vibe: "Best for modern product teams and a more expressive brand feel." },
  slate: { label: "Slate", subtitle: "Minimal enterprise", vibe: "Best for conservative corporate environments and long-form work." },
};
