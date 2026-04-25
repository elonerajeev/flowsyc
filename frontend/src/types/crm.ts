export type CRMStatus = "active" | "pending" | "completed" | "rejected" | "in-progress";
export type TaskPriority = "high" | "medium" | "low";
export type ProjectStage = "Discovery" | "Build" | "Review" | "Launch";
export type PipelineStage = "Qualified" | "Proposal" | "Negotiation" | "Closed Won";
export type TeamRole = "Revenue" | "Delivery" | "Operations" | "Support";
export type AttendanceStatus = "present" | "late" | "remote" | "absent";
export type PaymentMode = "bank-transfer" | "cash" | "upi";

// Enhanced CRM Types
export type LeadSource = "website" | "referral" | "social" | "email" | "phone" | "event" | "advertisement" | "other";
export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export type DealStage = "prospecting" | "qualification" | "proposal" | "negotiation" | "closed-won" | "closed-lost";
export type CompanySize = "startup" | "small" | "medium" | "large" | "enterprise";
export type ActivityType = "call" | "email" | "meeting" | "note" | "task" | "proposal";

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  size?: CompanySize;
  address?: Address;
  phone?: string;
  email?: string;
  status: "active" | "inactive" | "prospect";
  contacts: Contact[];
  deals: Deal[];
  value: number;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
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
}

export interface Lead {
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
}

export interface CSVImportRecord {
  id: number;
  filename: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: "pending" | "processing" | "completed" | "failed";
  errors: string[];
  importedBy: string;
  createdAt: string;
  completedAt: string | null;
}

export interface CSVImportLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  source: string;
  status: string;
  score: number;
  createdAt: string;
}

export interface Deal {
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
  activities: DealActivity[];
  createdAt: string;
  updatedAt: string;
}

export interface DealActivity {
  id: string;
  dealId: string;
  type: ActivityType;
  description: string;
  userId: string;
  createdAt: string;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: PipelineStageConfig[];
  isDefault: boolean;
}

export interface PipelineStageConfig {
  id: string;
  name: string;
  probability: number;
  order: number;
  color: string;
}

export interface SalesMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  dealsWon: number;
  dealsLost: number;
  conversionRate: number;
  averageDealSize: number;
  salesCycle: number;
  pipelineValue: number;
  forecastedRevenue: number;
}

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
  category?: "collaboration" | "sales" | "delivery" | "finance" | "hiring" | "system";
  source?: string;
}

export interface AuditLogRecord {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId?: string | null;
  detail?: string | null;
  createdAt: string;
}

export interface AuditLogQueryParams {
  limit?: number;
  offset?: number;
  search?: string;
  action?: string;
  entity?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogListResponse {
  data: AuditLogRecord[];
  total: number;
  limit: number;
  offset: number;
}

export interface CollaboratorRecord {
  id: string;
  name: string;
  role: string;
  avatar: string;
  status: AttendanceStatus;
  lastSeen: string;
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
  // Enhanced fields
  companyId?: string;
  jobTitle?: string;
  source?: LeadSource;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  email: string;
  phone: string;
  company: string;
  tags?: string[];
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
  column?: TaskColumn;
  projectId?: number | null;
}

export type TaskColumn = "todo" | "in-progress" | "done";

export interface TaskPageResponse {
  data: TaskRecord[];
  column: TaskColumn;
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface TaskBoardStats {
  todo: number;
  "in-progress": number;
  done: number;
  total: number;
}

export interface CommentRecord {
  id: number;
  content: string;
  authorId: string;
  taskId?: number | null;
  projectId?: number | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

export interface AttachmentRecord {
  id: number;
  filename: string;
  originalName: string;
  url: string;
  size: number;
  mimetype: string;
  authorId: string;
  taskId?: number | null;
  projectId?: number | null;
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

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
  details?: {
    metrics: Array<{ label: string; value: string; sub?: string }>;
    rows: Array<{ label: string; value: string; badge?: string }>;
  };
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

export interface DashboardSnapshot {
  metrics: KPIMetric[];
  revenueSeries: Array<{ month: string; revenue: number; deals: number; retention: number }>;
  pipelineBreakdown: Array<{ name: string; value: number; color: string }>;
  operatingCadence: Array<{ name: string; value: number }>;
  activityFeed: ActivityItem[];
  todayFocus: string[];
  executionReadiness: number;
  collaborators: CollaboratorRecord[];
  focusClients?: ClientRecord[];
  atRiskClients?: ClientRecord[];
  unreadMessages?: number;
  activityHeatmap?: Array<{ date: string; count: number }>;
}

export interface TeamMemberRecord {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Employee";
  status: CRMStatus;
  avatar: string;
  department: string;
  team: string;
  teamId?: number | null;
  designation: string;
  manager: string;
  workingHours: string;
  officeLocation: string;
  timeZone: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  paymentMode: PaymentMode;
  warningCount?: number;
  suspendedAt?: string | null;
  terminationEligibleAt?: string | null;
  handoverCompletedAt?: string | null;
  terminatedAt?: string | null;
  separationNote?: string;
  attendance: AttendanceStatus;
  checkIn: string;
  location: string;
  workload: number;
}

export interface TeamMemberInfo {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Manager" | "Employee";
  attendance: AttendanceStatus;
  workload: number;
}

export interface TeamRecord {
  id: number;
  name: string;
  description: string | null;
  permissions: Record<string, boolean>;
  members: TeamMemberInfo[];
  createdAt: string;
  updatedAt: string;
}

export type CreateTeamInput = {
  name: string;
  description?: string;
  permissions?: Record<string, boolean>;
};

export type CreateTeamMemberInput = {
  name: string;
  email: string;
  role: TeamMemberRecord["role"];
  status?: TeamMemberRecord["status"];
  avatar?: string;
  department?: string;
  team?: string;
  teamId?: number | null;
  designation?: string;
  manager?: string;
  workingHours?: string;
  officeLocation?: string;
  timeZone?: string;
  baseSalary?: number;
  allowances?: number;
  deductions?: number;
  paymentMode?: TeamMemberRecord["paymentMode"];
  warningCount?: number;
  suspendedAt?: string | null;
  terminationEligibleAt?: string | null;
  handoverCompletedAt?: string | null;
  terminatedAt?: string | null;
  separationNote?: string;
  attendance?: TeamMemberRecord["attendance"];
  checkIn?: string;
  location?: string;
  workload?: number;
};

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

export type PayrollStatus = "pending" | "processing" | "paid" | "overdue";

export interface PayrollRecord {
  id: number;
  memberId: string;
  memberName: string;
  period: string; // "YYYY-MM"
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: PayrollStatus;
  paymentMode: PaymentMode;
  dueDate: string;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  member?: {
    designation: string;
    team: string;
    avatar: string;
  } | null;
}

export interface CalendarEventRecord {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  color: string;
  repeat: "none" | "weekly" | "monthly";
  assignmentKind: "none" | "team" | "member";
  assigneeId: string;
  assigneeName: string;
  assigneeMeta: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRecord {
  id: number;
  title: string;
  content: string;
  isPinned: boolean;
  color: string;
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobRecord {
  id: number;
  title: string;
  department: string;
  location: string;
  type: string;
  status: "open" | "draft" | "closed";
  description: string;
  salary?: string;
  experience?: string;
  skills?: string[];
  priority?: "urgent" | "high" | "normal" | "low";
  deadline?: string | null;
  candidateCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateRecord {
  id: number;
  name: string;
  email: string;
  jobId: number;
  jobTitle: string;
  stage: "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
  source?: string;
  phone?: string;
  rating?: number;
  interviewDate?: string;
  interviewers?: string[];
  resume?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AlertType = "payroll_due" | "invoice_overdue" | "task_overdue" | "project_stalled";

export interface AlertRecord {
  type: AlertType;
  severity: "warning" | "critical";
  title: string;
  description: string;
  entityId?: string | number;
  entityType: string;
  actionUrl?: string;
}

export interface AlertsSummary {
  total: number;
  critical: number;
  warning: number;
  byType: Record<AlertType, number>;
}

export type MeetingType = "demo" | "discovery" | "proposal" | "negotiation" | "onboarding" | "check_in" | "other";
export type MeetingStatus = "scheduled" | "completed" | "cancelled" | "no_show";
export type ActivityType2 = "email" | "call" | "meeting" | "note" | "stage_change" | "task" | "other";

export interface MeetingRecord {
  id: number;
  leadId: number | null;
  clientId: number | null;
  contactId: number | null;
  title: string;
  type: MeetingType;
  scheduledAt: string;
  duration: number;
  meetingUrl: string | null;
  hostId: string;
  hostName: string;
  inviteeEmail: string;
  inviteeName: string;
  agenda: string;
  notes: string | null;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
  lead?: { id: number; firstName: string; lastName: string; email: string } | null;
  client?: { id: number; name: string; email: string } | null;
  contact?: { id: number; firstName: string; lastName: string; email: string } | null;
}

export interface ActivityRecord {
  id: number;
  entityType: string;
  entityId: number;
  type: ActivityType2;
  title: string;
  description: string;
  metadata: string | Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
