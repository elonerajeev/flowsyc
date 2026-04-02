import { isRemoteApiEnabled, requestJson } from "@/lib/api-client";
import type {
  AuditLogRecord,
  CandidateRecord,
  ClientRecord,
  DashboardSnapshot,
  InvoiceRecord,
  JobRecord,
  NoteRecord,
  ProjectRecord,
  TaskColumn,
  TaskRecord,
  TeamMemberRecord,
  ThemePreview,
} from "@/types/crm";

const simulateLatency = async <T,>(data: T, delay = 120): Promise<T> => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return structuredClone(data);
};

async function fetchOrMock<T>(endpoint: string, fallback: T, delay = 120): Promise<T> {
  if (!isRemoteApiEnabled()) {
    return simulateLatency(fallback, delay);
  }

  try {
    return await requestJson<T>(endpoint);
  } catch {
    return simulateLatency(fallback, delay);
  }
}

function unwrapCollectionResponse<T>(payload: unknown): T[] | null {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: T[] }).data;
  }

  return null;
}

async function fetchCollectionOrMock<T>(endpoint: string, fallback: T[], delay = 120): Promise<T[]> {
  if (!isRemoteApiEnabled()) {
    return simulateLatency(fallback, delay);
  }

  try {
    const payload = await requestJson<unknown>(endpoint);
    const normalized = unwrapCollectionResponse<T>(payload);
    if (normalized) {
      return normalized;
    }
  } catch {
    // Fallback to local data below.
  }

  return simulateLatency(fallback, delay);
}

function persistRemoteOrFallback<T>(endpoint: string, localResult: T, init: RequestInit) {
  if (!isRemoteApiEnabled()) {
    return Promise.resolve(localResult);
  }

  return requestJson<T>(endpoint, init).catch(() => localResult);
}

const emptyDashboard: DashboardSnapshot = {
  metrics: [],
  revenueSeries: [],
  pipelineBreakdown: [],
  operatingCadence: [],
  activityFeed: [],
  todayFocus: [],
  executionReadiness: 0,
  collaborators: [],
};

export const crmService = {
  getDashboard: () => fetchOrMock("/dashboard", emptyDashboard),
  getClients: () => fetchCollectionOrMock<ClientRecord>("/clients", []),
  getProjects: () => fetchCollectionOrMock<ProjectRecord>("/projects", []),
  getTasks: (projectId?: number) => fetchOrMock(`/tasks${projectId ? `?projectId=${projectId}` : ""}`, { todo: [], "in-progress": [], done: [] }),
  getConversations: () => fetchCollectionOrMock("/conversations", []),
  getMessages: () => fetchCollectionOrMock("/messages", []),
  getInvoices: () => fetchCollectionOrMock<InvoiceRecord>("/invoices", []),
  getReports: () => fetchCollectionOrMock("/reports", []),
  getTeamMembers: () => fetchCollectionOrMock<TeamMemberRecord>("/team-members", []),
  getAttendance: () => fetchCollectionOrMock("/attendance", []),
  updateAttendance: async (memberId: number, data: { status: string; checkIn: string; location: string }) => {
    return persistRemoteOrFallback(`/attendance/${memberId}`, null, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },
  getCommandActions: () => fetchOrMock("/command-actions", []),
  getThemePreviews: () => fetchOrMock("/system/theme-previews", {} as Record<string, ThemePreview>),
  getAuditLogs: async (limit = 100) => {
    if (!isRemoteApiEnabled()) return [];
    const payload = await requestJson<{ data: AuditLogRecord[] }>(`/system/audit?limit=${limit}`);
    return payload.data ?? [];
  },
  getIntegrations: () => {
    if (!isRemoteApiEnabled()) return Promise.resolve({ data: [] });
    return requestJson<{ data: Array<{ id: string; name: string; status: string; config: Record<string, unknown>; connectedAt?: string; lastSynced?: string }> }>("/system/integrations");
  },
  updateIntegration: (id: string, payload: { status?: string; config?: Record<string, unknown>; name?: string }) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson(`/system/integrations/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
  },
  getPreferences: () => {
    if (!isRemoteApiEnabled()) return Promise.resolve({ data: {} });
    return requestJson("/preferences");
  },
  updatePreferences: (data: Record<string, unknown>) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson("/preferences", { method: "PATCH", body: JSON.stringify(data) });
  },
  getAnalytics: () => fetchCollectionOrMock("/reports/analytics", []),
  getPayroll: (period?: string) => fetchCollectionOrMock(`/payroll${period ? `?period=${period}` : ""}`, []),
  generatePayroll: (period: string) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson("/payroll/generate", { method: "POST", body: JSON.stringify({ period }) });
  },

  // Notes — API-backed, no local fallback
  getNotes: () => fetchCollectionOrMock<NoteRecord>("/notes", []),
  createNote: (note: { title: string; content: string; color?: string }) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null as unknown as NoteRecord);
    return requestJson<NoteRecord>("/notes", { method: "POST", body: JSON.stringify(note) });
  },
  deleteNote: (noteId: number) => {
    if (!isRemoteApiEnabled()) return Promise.resolve();
    return requestJson<void>(`/notes/${noteId}`, { method: "DELETE" });
  },

  // Hiring — API-backed, no local fallback
  getJobPostings: () => fetchCollectionOrMock<JobRecord>("/hiring", []),
  getCandidates: () => fetchCollectionOrMock<CandidateRecord>("/candidates", []),

  // Enhanced CRM methods
  getLeads: () => fetchCollectionOrMock("/leads", []),
  getDeals: () => fetchCollectionOrMock("/deals", []),
  getCompanies: () => fetchCollectionOrMock("/companies", []),
  getPipeline: () => fetchOrMock("/clients/pipeline", []),
  getSalesMetrics: () => fetchOrMock("/sales-metrics", {}),

  createClient: async (client: Omit<ClientRecord, "id" | "createdAt" | "updatedAt">) => {
    return persistRemoteOrFallback("/clients", null as unknown as ClientRecord, {
      method: "POST",
      body: JSON.stringify(client),
    });
  },
  updateClient: async (clientId: number, patch: Partial<ClientRecord>) => {
    return persistRemoteOrFallback(`/clients/${clientId}`, null, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteClient: async (clientId: number) => {
    return persistRemoteOrFallback(`/clients/${clientId}`, true, {
      method: "DELETE",
    });
  },

  createProject: async (project: Omit<ProjectRecord, "id">) => {
    return persistRemoteOrFallback("/projects", null as unknown as ProjectRecord, {
      method: "POST",
      body: JSON.stringify(project),
    });
  },
  updateProject: async (projectId: number, patch: Partial<ProjectRecord>) => {
    return persistRemoteOrFallback(`/projects/${projectId}`, null, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteProject: async (projectId: number) => {
    return persistRemoteOrFallback(`/projects/${projectId}`, true, {
      method: "DELETE",
    });
  },

  createTask: async (task: Omit<TaskRecord, "id"> & { column?: TaskColumn }) => {
    const column = task.column ?? "todo";
    return persistRemoteOrFallback("/tasks", null as unknown as TaskRecord, {
      method: "POST",
      body: JSON.stringify({ ...task, column }),
    });
  },
  updateTask: async (taskId: number, patch: Partial<TaskRecord> & { column?: TaskColumn }) => {
    return persistRemoteOrFallback(`/tasks/${taskId}`, null, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteTask: async (taskId: number) => {
    return persistRemoteOrFallback(`/tasks/${taskId}`, true, {
      method: "DELETE",
    });
  },

  createTeamMember: async (member: Omit<TeamMemberRecord, "id">) => {
    return persistRemoteOrFallback("/team-members", null as unknown as TeamMemberRecord, {
      method: "POST",
      body: JSON.stringify(member),
    });
  },
  updateTeamMember: async (memberId: number, patch: Partial<TeamMemberRecord>) => {
    return persistRemoteOrFallback(`/team-members/${memberId}`, null, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteTeamMember: async (memberId: number) => {
    return persistRemoteOrFallback(`/team-members/${memberId}`, true, {
      method: "DELETE",
    });
  },

  createInvoice: async (invoice: Omit<InvoiceRecord, "id">) => {
    return persistRemoteOrFallback("/invoices", null as unknown as InvoiceRecord, {
      method: "POST",
      body: JSON.stringify(invoice),
    });
  },
  updateInvoice: async (invoiceId: string, patch: Partial<InvoiceRecord>) => {
    return persistRemoteOrFallback(`/invoices/${invoiceId}`, null, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },
  deleteInvoice: async (invoiceId: string) => {
    return persistRemoteOrFallback(`/invoices/${invoiceId}`, true, {
      method: "DELETE",
    });
  },

  // Candidate stage progression
  moveCandidateToNextStage: async (candidateId: number) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson(`/candidates/${candidateId}/next-stage`, { method: "POST" });
  },
  rejectCandidate: async (candidateId: number, reason?: string) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson(`/candidates/${candidateId}/reject`, { 
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  },
  // Hiring job actions
  toggleJobStatus: (jobId: number) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson<JobRecord>(`/hiring/${jobId}/toggle-status`, { method: "POST" });
  },
  cloneJob: (jobId: number) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson<JobRecord>(`/hiring/${jobId}/clone`, { method: "POST" });
  },
  updateJob: (jobId: number, patch: Partial<JobRecord>) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson<JobRecord>(`/hiring/${jobId}`, { method: "PATCH", body: JSON.stringify(patch) });
  },
  updateCandidate: (candidateId: number, patch: any) => {
    if (!isRemoteApiEnabled()) return Promise.resolve(null);
    return requestJson(`/candidates/${candidateId}`, { method: "PATCH", body: JSON.stringify(patch) });
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
};
