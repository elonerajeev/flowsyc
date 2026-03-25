export type CRMStatus = "active" | "pending" | "completed" | "rejected" | "in-progress";
export type TaskPriority = "high" | "medium" | "low";
export type ProjectStage = "Discovery" | "Build" | "Review" | "Launch";
export type PipelineStage = "Qualified" | "Proposal" | "Negotiation" | "Closed Won";
export type TeamRole = "Revenue" | "Delivery" | "Operations" | "Support";
export type AttendanceStatus = "present" | "late" | "remote" | "absent";

export interface KPIMetric {
  label: string;
  value: string;
  change: string;
  direction: "up" | "down";
  detail: string;
}

export interface ActivityItem {
  id: number;
  text: string;
  time: string;
  type: CRMStatus | TaskPriority;
}

export interface ClientRecord {
  id: number;
  name: string;
  industry: string;
  manager: string;
  status: CRMStatus;
  revenue: string;
  location: string;
  avatar: string;
  tier: "Enterprise" | "Growth" | "Strategic";
  healthScore: number;
  nextAction: string;
  segment: "Expansion" | "Renewal" | "New Business";
}

export interface ProjectRecord {
  id: number;
  name: string;
  description: string;
  progress: number;
  status: CRMStatus;
  team: string[];
  dueDate: string;
  tasks: { done: number; total: number };
  stage: ProjectStage;
  budget: string;
}

export interface TaskRecord {
  id: number;
  title: string;
  assignee: string;
  avatar: string;
  priority: TaskPriority;
  dueDate: string;
  tags: string[];
  valueStream: "Growth" | "Product" | "Support";
}

export type TaskColumn = "todo" | "in-progress" | "done";

export interface ConversationRecord {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  team: string;
}

export interface MessageRecord {
  id: number;
  chatId: number;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}

export interface InvoiceRecord {
  id: string;
  client: string;
  amount: string;
  date: string;
  due: string;
  status: CRMStatus;
}

export interface ReportRecord {
  title: string;
  description: string;
  date: string;
  type: string;
  gradient: string;
}

export interface CommandAction {
  id: string;
  title: string;
  description: string;
  section: string;
  route?: string;
  shortcut?: string;
  intent?: "open-quick-create" | "open-settings";
}

export interface ThemePreview {
  label: string;
  subtitle: string;
  vibe: string;
}

export interface TeamMemberRecord {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Employee";
  status: CRMStatus;
  avatar: string;
  department: string;
  attendance: AttendanceStatus;
  checkIn: string;
  location: string;
  workload: number;
}

export interface AttendanceRecord {
  id: number;
  name: string;
  role: string;
  department: string;
  status: AttendanceStatus;
  checkIn: string;
  location: string;
  note: string;
}
