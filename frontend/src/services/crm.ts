import { isRemoteApiEnabled, requestJson, uploadFile } from "@/lib/api-client";
import type {
  AlertRecord,
  AlertsSummary,
  AuditLogRecord,
  CalendarEventRecord,
  CandidateRecord,
  ClientRecord,
  DashboardSnapshot,
  InvoiceRecord,
  JobRecord,
  NoteRecord,
  PayrollRecord,
  ProjectRecord,
  TaskColumn,
  TaskRecord,
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
  getTeamMembers: () => fetchCollectionApi<TeamMemberRecord>("/team-members"),
  getAttendance: () => fetchCollectionApi("/attendance"),
  updateAttendance: async (memberId: number, data: { status: string; checkIn: string; location: string }) => {
    return persistApi(`/attendance/${memberId}`, { method: "PATCH", body: JSON.stringify(data) });
  },
  getCommandActions: () => fetchApi("/command-actions"),
  getThemePreviews: () => fetchApi<Record<string, ThemePreview>>("/system/theme-previews"),
  getAuditLogs: async (limit = 100) => {
    const payload = await requestJson<{ data: AuditLogRecord[] }>(`/system/audit?limit=${limit}`);
    return payload.data ?? [];
  },
  getIntegrations: () => fetchApi<{ data: Array<{ id: string; name: string; status: string; config: Record<string, unknown>; connectedAt?: string; lastSynced?: string }> }>("/system/integrations"),
  updateIntegration: (id: string, payload: { status?: string; config?: Record<string, unknown>; name?: string }) => {
    return requestJson(`/system/integrations/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  getPreferences: () => fetchApi<{ data: Record<string, unknown> }>("/preferences"),
  updatePreferences: (data: Record<string, unknown>) => {
    return requestJson("/preferences", { method: "PATCH", body: JSON.stringify(data) });
  },
  getAnalytics: () => fetchCollectionApi("/reports/analytics"),
  getPayroll: (period?: string) => fetchCollectionApi<PayrollRecord>(`/payroll${period ? `?period=${period}` : ""}`),
  generatePayroll: (period: string) => requestJson("/payroll/generate", { method: "POST", body: JSON.stringify({ period }) }),
  updatePayrollStatus: (id: number, status: string) => 
    requestJson(`/payroll/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),

  // Calendar
  getCalendarEvents: () => fetchCollectionApi<CalendarEventRecord>("/calendar"),
  createCalendarEvent: (event: Omit<CalendarEventRecord, "id" | "authorId" | "createdAt" | "updatedAt">) =>
    requestJson<CalendarEventRecord>("/calendar", { method: "POST", body: JSON.stringify(event) }),
  updateCalendarEvent: (eventId: number, patch: Partial<CalendarEventRecord>) =>
    requestJson<CalendarEventRecord>(`/calendar/${eventId}`, { method: "PATCH", body: JSON.stringify(patch) }),
  deleteCalendarEvent: (eventId: number) => requestJson<void>(`/calendar/${eventId}`, { method: "DELETE" }),

  // Notes
  getNotes: () => fetchCollectionApi<NoteRecord>("/notes"),
  createNote: (note: { title: string; content: string; color?: string }) => requestJson<NoteRecord>("/notes", { method: "POST", body: JSON.stringify(note) }),
  deleteNote: (noteId: number) => requestJson<void>(`/notes/${noteId}`, { method: "DELETE" }),

  // Hiring
  getJobPostings: () => fetchCollectionApi<JobRecord>("/hiring"),
  getCandidates: () => fetchCollectionApi<CandidateRecord>("/candidates"),

  // Enhanced CRM methods
  getLeads: () => fetchCollectionApi<Lead>("/leads"),
  getDeals: () => fetchCollectionApi<Deal>("/deals"),
  getCompanies: () => {
    if (!isRemoteApiEnabled()) return Promise.resolve([]);
    return fetchCollectionApi("/companies");
  },
  getPipeline: () => fetchApi("/clients/pipeline"),
  getSalesMetrics: () => {
    if (!isRemoteApiEnabled()) return Promise.resolve({});
    return fetchApi("/sales-metrics");
  },

  createClient: async (client: Omit<ClientRecord, "id" | "createdAt" | "updatedAt">) => {
    return requestJson<ClientRecord>("/clients", {
      method: "POST",
      body: JSON.stringify(client),
    });
  },
  updateClient: async (clientId: number, patch: Partial<ClientRecord>) => {
    return requestJson(`/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteClient: async (clientId: number) => {
    return requestJson<void>(`/clients/${clientId}`, {
      method: "DELETE",
    });
  },

  createLead: async (lead: Omit<Lead, "id" | "createdAt" | "updatedAt">) => {
    return requestJson<Lead>("/leads", {
      method: "POST",
      body: JSON.stringify(lead),
    });
  },
  updateLead: async (leadId: number, patch: Partial<Lead>) => {
    return requestJson(`/leads/${leadId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteLead: async (leadId: number) => {
    return requestJson<void>(`/leads/${leadId}`, {
      method: "DELETE",
    });
  },

  createDeal: async (deal: Omit<Deal, "id" | "createdAt" | "updatedAt">) => {
    return requestJson<Deal>("/deals", {
      method: "POST",
      body: JSON.stringify(deal),
    });
  },
  updateDeal: async (dealId: number, patch: Partial<Deal>) => {
    return requestJson(`/deals/${dealId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteDeal: async (dealId: number) => {
    return requestJson<void>(`/deals/${dealId}`, {
      method: "DELETE",
    });
  },

  createProject: async (project: Omit<ProjectRecord, "id">) => {
    return requestJson<ProjectRecord>("/projects", {
      method: "POST",
      body: JSON.stringify(project),
    });
  },
  updateProject: async (projectId: number, patch: Partial<ProjectRecord>) => {
    return requestJson(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  getDeals: () => {
    if (!isRemoteApiEnabled()) return Promise.resolve([]);
    return fetchCollectionApi("/deals");
  },
  getCompanies: () => {
    if (!isRemoteApiEnabled()) return Promise.resolve([]);
    return fetchCollectionApi("/companies");
  },
  getPipeline: () => {
    if (!isRemoteApiEnabled()) return Promise.resolve([]);
    return fetchApi("/clients/pipeline");
  },
  getSalesMetrics: () => {
    if (!isRemoteApiEnabled()) return Promise.resolve({});
    return fetchApi("/sales-metrics");
  },

  createClient: async (client: Omit<ClientRecord, "id" | "createdAt" | "updatedAt">) => {
    return requestJson<ClientRecord>("/clients", {
      method: "POST",
      body: JSON.stringify(client),
    });
  },
  updateClient: async (clientId: number, patch: Partial<ClientRecord>) => {
    return requestJson(`/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteClient: async (clientId: number) => {
    return requestJson<void>(`/clients/${clientId}`, {
      method: "DELETE",
    });
  },

  createProject: async (project: Omit<ProjectRecord, "id">) => {
    return requestJson<ProjectRecord>("/projects", {
      method: "POST",
      body: JSON.stringify(project),
    });
  },
  updateProject: async (projectId: number, patch: Partial<ProjectRecord>) => {
    return requestJson(`/projects/${projectId}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteProject: async (projectId: number) => {
    return persistApi(`/projects/${projectId}`, { method: "DELETE" });
  },

  createTask: async (task: Omit<TaskRecord, "id"> & { column?: TaskColumn }) => {
    const column = task.column ?? "todo";
    return persistApi<TaskRecord>("/tasks", { method: "POST", body: JSON.stringify({ ...task, column }) });
  },
  updateTask: async (taskId: number, patch: Partial<TaskRecord> & { column?: TaskColumn }) => {
    return persistApi(`/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  deleteTask: async (taskId: number) => persistApi(`/tasks/${taskId}`, { method: "DELETE" }),

  createTeamMember: async (member: Omit<TeamMemberRecord, "id">) => {
    return persistApi<TeamMemberRecord>("/team-members", { method: "POST", body: JSON.stringify(member) });
  },
  updateTeamMember: async (memberId: number, patch: Partial<TeamMemberRecord>) => {
    return persistApi(`/team-members/${memberId}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  deleteTeamMember: async (memberId: number) => persistApi(`/team-members/${memberId}`, { method: "DELETE" }),

  createInvoice: async (invoice: Omit<InvoiceRecord, "id">) => {
    return persistApi<InvoiceRecord>("/invoices", { method: "POST", body: JSON.stringify(invoice) });
  },
  updateInvoice: async (invoiceId: string, patch: Partial<InvoiceRecord>) => {
    return persistApi(`/invoices/${invoiceId}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  deleteInvoice: async (invoiceId: string) => persistApi(`/invoices/${invoiceId}`, { method: "DELETE" }),

  // Candidate stage progression
  moveCandidateToNextStage: (candidateId: number) => requestJson(`/candidates/${candidateId}/next-stage`, { method: "POST" }),
  rejectCandidate: (candidateId: number, reason?: string) => requestJson(`/candidates/${candidateId}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
  toggleJobStatus: (jobId: number) => requestJson<JobRecord>(`/hiring/${jobId}/toggle-status`, { method: "POST" }),
  cloneJob: (jobId: number) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson<JobRecord>(`/hiring/${jobId}/clone`, { method: "POST" });
  },
  updateJob: (jobId: number, patch: Partial<JobRecord>) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson<JobRecord>(`/hiring/${jobId}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  deleteJob: (jobId: number) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson<void>(`/hiring/${jobId}`, { method: "DELETE" });
  },
  toggleJobStatus: (jobId: number) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson<JobRecord>(`/hiring/${jobId}/toggle-status`, { method: "POST" });
  },
  removeCandidate: (candidateId: number) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson<void>(`/candidates/${candidateId}`, { method: "DELETE" });
  },
  getCandidateTimeline: (candidateId: number) =>
    requestJson<Array<{ id: number; action: string; detail: string; performedBy: string; createdAt: string }>>(`/candidates/${candidateId}/timeline`),
  addCandidateNote: (candidateId: number, note: string) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson(`/candidates/${candidateId}/note`, { method: "POST", body: JSON.stringify({ note }) });
  },
  generateOfferLetter: async (candidateId: number, data: { joiningDate: string; offeredSalary: string; signatureUrl?: string }) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson<{
      candidate: { name: string; email: string; jobTitle: string; department: string; location: string };
      hr: { name: string; designation: string; email: string; signatureUrl: string | null };
      offer: { joiningDate: string; offeredSalary: string; jobTitle: string; department: string; location: string; type: string; generatedAt: string };
    }>(`/candidates/${candidateId}/offer-letter`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Global search
  globalSearch: async (query: string, category?: string, limit = 20) => {
    if (!isRemoteApiEnabled() || query.trim().length < 2) return [];
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    if (category) params.set("category", category);
    const payload = await requestJson<{ data: Array<{ type: string; id: string | number; title: string; subtitle: string; url: string }> }>(`/system/search?${params}`);
    return payload.data ?? [];
  },

  // File uploads
  uploadAvatar: async (file: File) => uploadFile<{ url: string; filename: string; originalName: string; size: number; mimetype: string }>("/upload/avatar", file),
  uploadResume: async (file: File) => uploadFile<{ url: string; filename: string; originalName: string; size: number; mimetype: string }>("/upload/resume", file),
  uploadDocument: async (file: File) => uploadFile<{ url: string; filename: string; originalName: string; size: number; mimetype: string }>("/upload/document", file),

  // Invoice reminder
  sendInvoiceReminder: (invoiceId: string, email: string) => requestJson(`/invoices/${invoiceId}/remind`, { method: "POST", body: JSON.stringify({ email }) }),

  // Automation Alerts
  getAlerts: () => requestJson<{ alerts: AlertRecord[]; summary: AlertsSummary }>("/system/alerts"),
  getAlertsSummary: () => requestJson<AlertsSummary>("/system/alerts/summary"),
  autoUpdateProjectProgress: () => requestJson("/system/alerts/auto-update-progress", { method: "POST" }),
};
