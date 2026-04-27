import { isRemoteApiEnabled, requestJson, requestVoid, uploadFile } from "@/lib/api-client";
import type {
  ActivityRecord,
  AlertRecord,
  AlertsSummary,
  AuditLogListResponse,
  AuditLogQueryParams,
  AuditLogRecord,
  CalendarEventRecord,
  CandidateRecord,
  ClientRecord,
  Company,
  CreateTeamInput,
  CreateTeamMemberInput,
  CSVImportRecord,
  CSVImportLead,
  DashboardSnapshot,
  Deal,
  InvoiceRecord,
  JobRecord,
  Lead,
  MeetingRecord,
  NoteRecord,
  PayrollRecord,
  ProjectRecord,
  SalesMetrics,
  TaskColumn,
  TaskBoardStats,
  TaskPageResponse,
  TaskPriority,
  TaskRecord,
  TeamRecord,
  TeamMemberRecord,
  ThemePreview,
} from "@/types/crm";

async function fetchApi<T>(endpoint: string): Promise<T> {
  return requestJson<T>(endpoint);
}

async function fetchCollectionApi<T>(endpoint: string): Promise<T[]> {
  const payload = await requestJson<unknown>(endpoint);
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  if (payload && typeof payload === "object" && "data" in payload && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }
  return [];
}

async function persistApi<T>(endpoint: string, init: RequestInit): Promise<T> {
  return requestJson<T>(endpoint, init);
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "") return;
    query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

export const crmService = {
  getDashboard: () => fetchApi<DashboardSnapshot>("/dashboard"),
  getClients: () => fetchCollectionApi<ClientRecord>("/clients?limit=50"),
  getClientsPage: (params: {
    page?: number;
    limit?: number;
    status?: "active" | "pending" | "completed";
    segment?: "Expansion" | "Renewal" | "New Business";
    search?: string;
    sort?: "name" | "revenue" | "createdAt" | "healthScore";
    order?: "asc" | "desc";
  } = {}) => {
    const query = buildQuery({
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      status: params.status,
      segment: params.segment,
      search: params.search,
      sort: params.sort ?? "createdAt",
      order: params.order ?? "desc",
    });
    return requestJson<{
      data: ClientRecord[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    }>(`/clients${query}`);
  },
  getProjects: () => fetchCollectionApi<ProjectRecord>("/projects"),
  getTasks: (projectId?: number) => fetchApi<Record<TaskColumn, TaskRecord[]>>(`/tasks${projectId ? `?projectId=${projectId}` : ""}`),
  getTasksPage: (params: { column: TaskColumn; page?: number; limit?: number; projectId?: number; priority?: TaskPriority }) => {
    const query = buildQuery({
      column: params.column,
      page: params.page ?? 1,
      limit: params.limit ?? 30,
      projectId: params.projectId,
      priority: params.priority,
    });
    return requestJson<TaskPageResponse>(`/tasks/paginated${query}`);
  },
  getTaskStats: (params: { projectId?: number; priority?: TaskPriority } = {}) => {
    const query = buildQuery({
      projectId: params.projectId,
      priority: params.priority,
    });
    return requestJson<TaskBoardStats>(`/tasks/stats${query}`);
  },
  getConversations: () => fetchCollectionApi("/conversations"),
  getMessages: () => fetchCollectionApi("/messages"),
  sendMessage: (data: { conversationId: number; text: string; sender: string; isMe: boolean }) =>
    persistApi("/messages", { method: "POST", body: JSON.stringify(data) }),

  getInvoices: () => fetchCollectionApi<InvoiceRecord>("/invoices"),
  getReports: () => fetchCollectionApi("/reports"),
  getTeams: () => fetchCollectionApi<TeamRecord>("/teams"),
  getTeamMembers: () => fetchCollectionApi<TeamMemberRecord>("/team-members"),
  getAttendance: () => fetchCollectionApi("/attendance"),
  updateAttendance: (memberId: number, data: { status: string; checkIn: string; location: string }) =>
    persistApi(`/attendance/${memberId}`, { method: "PATCH", body: JSON.stringify(data) }),
  getCommandActions: () => fetchApi("/command-actions"),
  getThemePreviews: () => fetchApi<Record<string, ThemePreview>>("/system/theme-previews"),

  getAuditLogsPage: (params: AuditLogQueryParams = {}) => {
    const query = buildQuery({
      limit: params.limit ?? 100,
      offset: params.offset ?? 0,
      search: params.search,
      action: params.action,
      entity: params.entity,
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    });
    return requestJson<AuditLogListResponse>(`/system/audit${query}`);
  },
  getAuditLogs: async (limit = 100) => {
    const payload = await crmService.getAuditLogsPage({ limit, offset: 0 });
    return payload.data ?? [];
  },

  getIntegrations: () =>
    fetchApi<{ data: Array<{ id: string; name: string; status: string; config: Record<string, unknown>; connectedAt?: string; lastSynced?: string }> }>("/system/integrations"),
  updateIntegration: (id: string, payload: { status?: string; config?: Record<string, unknown>; name?: string }) =>
    requestJson(`/system/integrations/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  testSlackIntegration: (webhookUrl: string) =>
    requestJson("/system/integrations/slack/test", { method: "POST", body: JSON.stringify({ webhookUrl }) }),
  testZapierIntegration: (webhookUrl: string) =>
    requestJson("/system/integrations/zapier/test", { method: "POST", body: JSON.stringify({ webhookUrl }) }),

  getPreferences: () => fetchApi<{ data: Record<string, unknown> }>("/preferences"),
  updatePreferences: (data: Record<string, unknown>) =>
    requestJson("/preferences", { method: "PATCH", body: JSON.stringify(data) }),

  getAnalytics: () => fetchCollectionApi("/reports/analytics"),
  getPayroll: (period?: string) => fetchCollectionApi<PayrollRecord>(`/payroll${period ? `?period=${period}` : ""}`),
  generatePayroll: (period: string) => requestJson("/payroll/generate", { method: "POST", body: JSON.stringify({ period }) }),
  updatePayrollStatus: (id: number, status: string) =>
    requestJson(`/payroll/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  getCalendarEvents: () => fetchCollectionApi<CalendarEventRecord>("/calendar"),
  createCalendarEvent: (event: Omit<CalendarEventRecord, "id" | "authorId" | "createdAt" | "updatedAt">) =>
    requestJson<CalendarEventRecord>("/calendar", { method: "POST", body: JSON.stringify(event) }),
  updateCalendarEvent: (eventId: number, patch: Partial<CalendarEventRecord>) =>
    requestJson<CalendarEventRecord>(`/calendar/${eventId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteCalendarEvent: (eventId: number) => requestVoid(`/calendar/${eventId}`, { method: "DELETE" }),

  getGoogleCalendarStatus: () => requestJson<{ connected: boolean }>("/calendar/google/status"),
  connectGoogleCalendar: () => requestJson<{ authUrl: string }>("/calendar/google/connect"),
  disconnectGoogleCalendar: () => requestJson<{ success: boolean }>("/calendar/google/disconnect", { method: "POST" }),
  createMeetingGoogleMeet: (meetingId: number) =>
    requestJson<{ meetLink: string | null; eventId: string | null; htmlLink: string | null }>(`/meetings/${meetingId}/google-meet`, { method: "POST" }),

  getNotes: () => fetchCollectionApi<NoteRecord>("/notes"),
  createNote: (note: { title: string; content: string; color?: string }) =>
    requestJson<NoteRecord>("/notes", { method: "POST", body: JSON.stringify(note) }),
  deleteNote: (noteId: number) => requestVoid(`/notes/${noteId}`, { method: "DELETE" }),

  getJobPostings: () => fetchCollectionApi<JobRecord>("/hiring"),
  createJob: (job: Omit<JobRecord, "id" | "candidateCount" | "createdAt" | "updatedAt">) =>
    requestJson<JobRecord>("/hiring", { method: "POST", body: JSON.stringify(job) }),
  updateJob: (jobId: number, patch: Partial<JobRecord>) =>
    requestJson<JobRecord>(`/hiring/${jobId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteJob: (jobId: number) => requestVoid(`/hiring/${jobId}`, { method: "DELETE" }),
  toggleJobStatus: (jobId: number) => requestJson<JobRecord>(`/hiring/${jobId}/toggle-status`, { method: "POST" }),
  cloneJob: (jobId: number) => requestJson<JobRecord>(`/hiring/${jobId}/clone`, { method: "POST" }),

  getCandidates: () => fetchCollectionApi<CandidateRecord>("/candidates"),
  createCandidate: (candidate: Omit<CandidateRecord, "id" | "jobTitle" | "createdAt" | "updatedAt">) =>
    requestJson<CandidateRecord>("/candidates", { method: "POST", body: JSON.stringify(candidate) }),
  updateCandidate: (candidateId: number, patch: Partial<CandidateRecord>) =>
    requestJson<CandidateRecord>(`/candidates/${candidateId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteCandidate: (candidateId: number) => requestVoid(`/candidates/${candidateId}`, { method: "DELETE" }),
  removeCandidate: (candidateId: number) => crmService.deleteCandidate(candidateId),
  moveCandidateToNextStage: (candidateId: number) => requestJson(`/candidates/${candidateId}/next-stage`, { method: "POST" }),
  rejectCandidate: (candidateId: number, reason?: string) =>
    requestJson(`/candidates/${candidateId}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  getCandidateTimeline: (candidateId: number) =>
    requestJson<Array<{ id: number; action: string; detail: string; performedBy: string; createdAt: string }>>(`/candidates/${candidateId}/timeline`),
  addCandidateNote: (candidateId: number, note: string) =>
    requestJson(`/candidates/${candidateId}/note`, { method: "POST", body: JSON.stringify({ note }) }),
  generateOfferLetter: (candidateId: number, data: { joiningDate: string; offeredSalary: string; signatureUrl?: string }) =>
    requestJson<{
      candidate: { name: string; email: string; jobTitle: string; department: string; location: string };
      hr: { name: string; designation: string; email: string; signatureUrl: string | null };
      offer: { joiningDate: string; offeredSalary: string; jobTitle: string; department: string; location: string; type: string; generatedAt: string };
    }>(`/candidates/${candidateId}/offer-letter`, { method: "POST", body: JSON.stringify(data) }),

  getContacts: () => fetchCollectionApi<import("@/types/crm").Contact>("/contacts"),
  createContact: (contact: Record<string, unknown>) =>
    requestJson<Record<string, unknown>>("/contacts", { method: "POST", body: JSON.stringify(contact) }),
  updateContact: (contactId: number, patch: Record<string, unknown>) =>
    requestJson<Record<string, unknown>>(`/contacts/${contactId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteContact: (contactId: number) => requestJson<void>(`/contacts/${contactId}`, { method: "DELETE" }),

  getLeads: () => fetchCollectionApi<Lead>(`/leads?limit=100`),
  getLeadsPage: (params: {
    limit?: number;
    page?: number;
    status?: string;
    source?: string;
    assignedState?: "assigned" | "unassigned";
    minScore?: number;
    maxScore?: number;
    search?: string;
    sortBy?: "firstName" | "lastName" | "email" | "score" | "createdAt" | "updatedAt";
    sortOrder?: "asc" | "desc";
  } = {}) => {
    const q = new URLSearchParams();
    if (params.limit) q.set("limit", String(params.limit));
    if (params.page) q.set("page", String(params.page));
    if (params.status) q.set("status", params.status);
    if (params.source) q.set("source", params.source);
    if (params.assignedState) q.set("assignedState", params.assignedState);
    if (params.minScore !== undefined) q.set("minScore", String(params.minScore));
    if (params.maxScore !== undefined) q.set("maxScore", String(params.maxScore));
    if (params.search) q.set("search", params.search);
    if (params.sortBy) q.set("sortBy", params.sortBy);
    if (params.sortOrder) q.set("sortOrder", params.sortOrder);
    return requestJson<{ data: Lead[]; total: number; page: number; limit: number }>(`/leads?${q}`);
  },
  createLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">) =>
    requestJson<Lead>("/leads", { method: "POST", body: JSON.stringify(lead) }),
  updateLead: (leadId: number, patch: Partial<Lead>) =>
    requestJson<Lead>(`/leads/${leadId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteLead: (leadId: number) => requestVoid(`/leads/${leadId}`, { method: "DELETE" }),
  removeLead: (leadId: number) => crmService.deleteLead(leadId),

  // GTM Lead Actions
  recalculateLeadScore: (leadId: number) =>
    requestJson<{ score: number; breakdown: Record<string, number>; tags: string[] }>(`/leads/${leadId}/recalculate-score`, { method: "POST" }),
  createLeadFollowUp: (leadId: number) =>
    requestJson<{ success: boolean; message: string }>(`/leads/${leadId}/followup-sequence`, { method: "POST" }),
  assignLeadToRep: (leadId: number) =>
    requestJson<{ assigned: boolean; repEmail?: string }>(`/leads/${leadId}/assign`, { method: "POST" }),
  convertLeadToClient: (leadId: number, clientData: { clientName: string; tier?: string }) =>
    requestJson<{ lead: Lead; client: { id: number; name: string; email: string; tier: string; status: string } }>(`/leads/${leadId}/convert`, { method: "POST", body: JSON.stringify(clientData) }),
  getHotLeads: () => fetchCollectionApi<Lead>("/leads/filters/hot"),
  getColdLeads: (days?: number) => fetchCollectionApi<Lead>(`/leads/filters/cold${days ? `?days=${days}` : ''}`),
  bulkRecalculateScores: () =>
    requestJson<{ total: number; hotLeads: number; warmLeads: number; mediumLeads: number; coldLeads: number }>("/leads/bulk/recalculate-scores", { method: "POST" }),
  getGTMOverview: () =>
    requestJson<import("@/types/automation").GTMOverview>("/automation/gtm/overview"),
  recalculateClientHealth: (clientId: number) =>
    requestJson<{ score: number; grade: string; breakdown: Record<string, number> }>(`/clients/${clientId}/recalculate-health`, { method: "POST" }),
  syncDealLifecycle: (dealId: number) =>
    requestJson<Record<string, unknown>>(`/deals/${dealId}/gtm-sync`, { method: "POST" }),

  getDeals: () => fetchCollectionApi<Deal>("/deals"),
  createDeal: (deal: Omit<Deal, "id" | "createdAt" | "updatedAt">) =>
    requestJson<Deal>("/deals", { method: "POST", body: JSON.stringify(deal) }),
  updateDeal: (dealId: number, patch: Partial<Deal>) =>
    requestJson<Deal>(`/deals/${dealId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteDeal: (dealId: number) => requestJson<void>(`/deals/${dealId}`, { method: "DELETE" }),
  removeDeal: (dealId: number) => crmService.deleteDeal(dealId),

  getCompanies: () => fetchCollectionApi<Company>("/companies"),
  getPipeline: () => fetchApi("/clients/pipeline"),
  getSalesMetrics: () => fetchApi<SalesMetrics | null>("/sales-metrics"),

  createClient: (client: Omit<ClientRecord, "id" | "createdAt" | "updatedAt">) =>
    requestJson<ClientRecord>("/clients", { method: "POST", body: JSON.stringify(client) }),
  updateClient: (clientId: number, patch: Partial<ClientRecord>) =>
    requestJson<ClientRecord>(`/clients/${clientId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteClient: (clientId: number) => requestVoid(`/clients/${clientId}`, { method: "DELETE" }),
  removeClient: (clientId: number) => crmService.deleteClient(clientId),

  createProject: (project: Omit<ProjectRecord, "id">) =>
    requestJson<ProjectRecord>("/projects", { method: "POST", body: JSON.stringify(project) }),
  updateProject: (projectId: number, patch: Partial<ProjectRecord>) =>
    requestJson<ProjectRecord>(`/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteProject: (projectId: number) => requestVoid(`/projects/${projectId}`, { method: "DELETE" }),
  removeProject: (projectId: number) => crmService.deleteProject(projectId),

  createTask: (task: Omit<TaskRecord, "id"> & { column?: TaskColumn }) => {
    const column = task.column ?? "todo";
    return persistApi<TaskRecord>("/tasks", { method: "POST", body: JSON.stringify({ ...task, column }) });
  },
  updateTask: (taskId: number, patch: Partial<TaskRecord> & { column?: TaskColumn }) =>
    persistApi<TaskRecord>(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTask: (taskId: number) => requestVoid(`/tasks/${taskId}`, { method: "DELETE" }),
  removeTask: (taskId: number) => crmService.deleteTask(taskId),

  createTeam: (team: CreateTeamInput) =>
    persistApi<TeamRecord>("/teams", { method: "POST", body: JSON.stringify(team) }),
  updateTeam: (teamId: number, patch: Partial<CreateTeamInput>) =>
    persistApi<TeamRecord>(`/teams/${teamId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTeam: (teamId: number) => requestVoid(`/teams/${teamId}`, { method: "DELETE" }),
  assignTeamMember: (teamId: number, memberId: number) =>
    persistApi<{ message: string }>(`/teams/${teamId}/members/${memberId}`, { method: "POST" }),
  removeTeamMember: (teamId: number, memberId: number) =>
    persistApi<{ message: string }>(`/teams/${teamId}/members/${memberId}`, { method: "DELETE" }),

  createTeamMember: (member: CreateTeamMemberInput) =>
    persistApi<TeamMemberRecord>("/team-members", { method: "POST", body: JSON.stringify(member) }),
  updateTeamMember: (memberId: number, patch: Partial<TeamMemberRecord>) =>
    persistApi<TeamMemberRecord>(`/team-members/${memberId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTeamMember: (memberId: number) => persistApi<void>(`/team-members/${memberId}`, { method: "DELETE" }),

  createInvoice: (invoice: Omit<InvoiceRecord, "id">) =>
    persistApi<InvoiceRecord>("/invoices", { method: "POST", body: JSON.stringify(invoice) }),
  updateInvoice: (invoiceId: string, patch: Partial<InvoiceRecord>) =>
    persistApi<InvoiceRecord>(`/invoices/${invoiceId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteInvoice: (invoiceId: string) => persistApi<void>(`/invoices/${invoiceId}`, { method: "DELETE" }),
  removeInvoice: (invoiceId: string) => crmService.deleteInvoice(invoiceId),
  sendInvoiceReminder: (invoiceId: string, email: string) =>
    requestJson(`/invoices/${invoiceId}/remind`, { method: "POST", body: JSON.stringify({ email }) }),

  globalSearch: async (query: string, category?: string, limit = 20) => {
    if (!isRemoteApiEnabled() || query.trim().length < 2) return [];
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (category) params.set("category", category);
    const payload = await requestJson<{ data: Array<{ type: string; id: string | number; title: string; subtitle: string; url: string }> }>(`/system/search?${params}`);
    return payload.data ?? [];
  },

  uploadAvatar: (file: File) =>
    uploadFile<{ url: string; filename: string; originalName: string; size: number; mimetype: string }>("/upload/avatar", file),
  uploadResume: (file: File) =>
    uploadFile<{ url: string; filename: string; originalName: string; size: number; mimetype: string }>("/upload/resume", file),
  uploadDocument: (file: File) =>
    uploadFile<{ url: string; filename: string; originalName: string; size: number; mimetype: string }>("/upload/document", file),

  getAlerts: () => requestJson<{ alerts: AlertRecord[]; summary: AlertsSummary }>("/system/alerts"),

  listComments: (filters: { taskId?: number; projectId?: number; limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.taskId) params.set("taskId", String(filters.taskId));
    if (filters.projectId) params.set("projectId", String(filters.projectId));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.offset) params.set("offset", String(filters.offset));
    return requestJson<{ data: CommentRecord[]; total: number; limit: number; offset: number }>(`/comments?${params}`);
  },

  createComment: (data: { content: string; taskId?: number; projectId?: number }) =>
    requestJson<CommentRecord>("/comments", { method: "POST", body: JSON.stringify(data) }),

  updateComment: (id: number, data: { content: string }) =>
    requestJson<CommentRecord>(`/comments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteComment: (id: number) =>
    requestJson<{ success: boolean }>(`/comments/${id}`, { method: "DELETE" }),

  listAttachments: (filters: { taskId?: number; projectId?: number; limit?: number; offset?: number } = {}) => {
    const params = new URLSearchParams();
    if (filters.taskId) params.set("taskId", String(filters.taskId));
    if (filters.projectId) params.set("projectId", String(filters.projectId));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.offset) params.set("offset", String(filters.offset));
    return requestJson<{ data: AttachmentRecord[]; total: number; limit: number; offset: number }>(`/attachments?${params}`);
  },

  createAttachment: (data: { filename: string; originalName: string; url: string; size: number; mimetype: string; taskId?: number; projectId?: number }) =>
    requestJson<AttachmentRecord>("/attachments", { method: "POST", body: JSON.stringify(data) }),

  deleteAttachment: (id: number) =>
    requestJson<{ success: boolean; filename: string }>(`/attachments/${id}`, { method: "DELETE" }),
  getAlertsSummary: () => requestJson<AlertsSummary>("/system/alerts/summary"),
  autoUpdateProjectProgress: () => requestJson("/system/alerts/auto-update-progress", { method: "POST" }),

  // Meetings
  getMeetings: (filters?: { leadId?: number; clientId?: number; contactId?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.leadId) params.set("leadId", String(filters.leadId));
    if (filters?.clientId) params.set("clientId", String(filters.clientId));
    if (filters?.contactId) params.set("contactId", String(filters.contactId));
    if (filters?.status) params.set("status", filters.status);
    return fetchCollectionApi<MeetingRecord>(`/meetings?${params}`);
  },
  getUpcomingMeetings: (limit = 10) => fetchCollectionApi<MeetingRecord>(`/meetings/upcoming?limit=${limit}`),
  getMeeting: (id: number) => fetchApi<{ data: MeetingRecord }>(`/meetings/${id}`),
  createMeeting: (meeting: {
    leadId?: number;
    clientId?: number;
    contactId?: number;
    title: string;
    type?: string;
    scheduledAt: string;
    duration?: number;
    meetingType?: "jitsi" | "google" | "zoom" | "phone" | "in_person";
    inviteeEmail: string;
    inviteeName: string;
    agenda?: string;
  }) => persistApi<{ data: MeetingRecord }>("/meetings", { method: "POST", body: JSON.stringify(meeting) }),
  updateMeeting: (id: number, data: { title?: string; notes?: string; status?: string }) =>
    persistApi<{ data: MeetingRecord }>(`/meetings/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteMeeting: (id: number) => persistApi<{ success: boolean }>(`/meetings/${id}`, { method: "DELETE" }),

  // Activities
  getLeadActivities: (leadId: number, limit = 50) =>
    fetchCollectionApi<ActivityRecord>(`/activities/lead/${leadId}?limit=${limit}`),
  logActivity: (data: {
    entityType: "lead" | "client" | "deal";
    entityId: number;
    type: "email" | "call" | "meeting" | "note" | "stage_change" | "task" | "other";
    title: string;
    description?: string;
  }) => persistApi<{ data: ActivityRecord }>("/activities", { method: "POST", body: JSON.stringify(data) }),

  // Lead stage management
  updateLeadStage: (leadId: number, status: string, notes?: string) =>
    persistApi<{ success: boolean; previousStatus: string; newStatus: string }>(`/leads/${leadId}/stage`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes }),
    }),

  // Lead email
  sendLeadEmail: (leadId: number, data: { subject: string; body: string; htmlBody?: string }) =>
    requestJson<{ message: string }>(`/leads/${leadId}/send-email`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getLeadEmails: (leadId: number) =>
    requestJson<{
      sent: Array<{ id: number; subject: string; body: string; status: string; sentAt: string | null; createdAt: string; recipientName: string | null; direction: "outbound" }>;
      received: Array<{ id: number; subject: string; body: string; fromName: string; fromEmail: string; receivedAt: string; isRead: boolean; direction: "inbound" }>;
    }>(`/leads/${leadId}/emails`),

  // CSV Import
  listCSVImports: () => fetchCollectionApi<CSVImportRecord>("/csv-import"),
  getCSVImport: (id: number) =>
    requestJson<{ data: CSVImportRecord & { leads: CSVImportLead[] } }>(`/csv-import/${id}`),
  uploadCSV: (file: File) =>
    uploadFile<{ data: CSVImportRecord; success: number; failed: number; message: string }>("/csv-import", file, "file"),
  deleteCSVImport: (id: number) =>
    persistApi<{ success: boolean }>(`/csv-import/${id}`, { method: "DELETE" }),
};
