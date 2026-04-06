import { isRemoteApiEnabled, requestJson, uploadFile } from "@/lib/api-client";
import type {
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
  DashboardSnapshot,
  Deal,
  InvoiceRecord,
  JobRecord,
  Lead,
  NoteRecord,
  PayrollRecord,
  ProjectRecord,
  SalesMetrics,
  TaskColumn,
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
  getClients: () => fetchCollectionApi<ClientRecord>("/clients"),
  getProjects: () => fetchCollectionApi<ProjectRecord>("/projects"),
  getTasks: (projectId?: number) => fetchApi<Record<TaskColumn, TaskRecord[]>>(`/tasks${projectId ? `?projectId=${projectId}` : ""}`),
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
  deleteCalendarEvent: (eventId: number) => requestJson<void>(`/calendar/${eventId}`, { method: "DELETE" }),

  getNotes: () => fetchCollectionApi<NoteRecord>("/notes"),
  createNote: (note: { title: string; content: string; color?: string }) =>
    requestJson<NoteRecord>("/notes", { method: "POST", body: JSON.stringify(note) }),
  deleteNote: (noteId: number) => requestJson<void>(`/notes/${noteId}`, { method: "DELETE" }),

  getJobPostings: () => fetchCollectionApi<JobRecord>("/hiring"),
  createJob: (job: Omit<JobRecord, "id" | "candidateCount" | "createdAt" | "updatedAt">) =>
    requestJson<JobRecord>("/hiring", { method: "POST", body: JSON.stringify(job) }),
  updateJob: (jobId: number, patch: Partial<JobRecord>) =>
    requestJson<JobRecord>(`/hiring/${jobId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteJob: (jobId: number) => requestJson<void>(`/hiring/${jobId}`, { method: "DELETE" }),
  toggleJobStatus: (jobId: number) => requestJson<JobRecord>(`/hiring/${jobId}/toggle-status`, { method: "POST" }),
  cloneJob: (jobId: number) => requestJson<JobRecord>(`/hiring/${jobId}/clone`, { method: "POST" }),

  getCandidates: () => fetchCollectionApi<CandidateRecord>("/candidates"),
  createCandidate: (candidate: Omit<CandidateRecord, "id" | "jobTitle" | "createdAt" | "updatedAt">) =>
    requestJson<CandidateRecord>("/candidates", { method: "POST", body: JSON.stringify(candidate) }),
  updateCandidate: (candidateId: number, patch: Partial<CandidateRecord>) =>
    requestJson<CandidateRecord>(`/candidates/${candidateId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteCandidate: (candidateId: number) => requestJson<void>(`/candidates/${candidateId}`, { method: "DELETE" }),
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

  getLeads: () => fetchCollectionApi<Lead>("/leads"),
  createLead: (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">) =>
    requestJson<Lead>("/leads", { method: "POST", body: JSON.stringify(lead) }),
  updateLead: (leadId: number, patch: Partial<Lead>) =>
    requestJson<Lead>(`/leads/${leadId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteLead: (leadId: number) => requestJson<void>(`/leads/${leadId}`, { method: "DELETE" }),
  removeLead: (leadId: number) => crmService.deleteLead(leadId),

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
  deleteClient: (clientId: number) => requestJson<void>(`/clients/${clientId}`, { method: "DELETE" }),
  removeClient: (clientId: number) => crmService.deleteClient(clientId),

  createProject: (project: Omit<ProjectRecord, "id">) =>
    requestJson<ProjectRecord>("/projects", { method: "POST", body: JSON.stringify(project) }),
  updateProject: (projectId: number, patch: Partial<ProjectRecord>) =>
    requestJson<ProjectRecord>(`/projects/${projectId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteProject: (projectId: number) => persistApi<void>(`/projects/${projectId}`, { method: "DELETE" }),
  removeProject: (projectId: number) => crmService.deleteProject(projectId),

  createTask: (task: Omit<TaskRecord, "id"> & { column?: TaskColumn }) => {
    const column = task.column ?? "todo";
    return persistApi<TaskRecord>("/tasks", { method: "POST", body: JSON.stringify({ ...task, column }) });
  },
  updateTask: (taskId: number, patch: Partial<TaskRecord> & { column?: TaskColumn }) =>
    persistApi<TaskRecord>(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTask: (taskId: number) => persistApi<void>(`/tasks/${taskId}`, { method: "DELETE" }),
  removeTask: (taskId: number) => crmService.deleteTask(taskId),

  createTeam: (team: CreateTeamInput) =>
    persistApi<TeamRecord>("/teams", { method: "POST", body: JSON.stringify(team) }),
  updateTeam: (teamId: number, patch: Partial<CreateTeamInput>) =>
    persistApi<TeamRecord>(`/teams/${teamId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteTeam: (teamId: number) => persistApi<void>(`/teams/${teamId}`, { method: "DELETE" }),
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
  getAlertsSummary: () => requestJson<AlertsSummary>("/system/alerts/summary"),
  autoUpdateProjectProgress: () => requestJson("/system/alerts/auto-update-progress", { method: "POST" }),
};
