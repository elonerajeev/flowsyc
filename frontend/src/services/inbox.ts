import { requestJson, requestVoid, ApiError } from "../lib/api-client";

export interface ImapAccount {
  id: number;
  userId: string;
  email: string;
  host: string;
  port: number;
  isActive: boolean;
  lastSync: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InboxEmail {
  id: number;
  subject: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  body: string;
  htmlBody?: string | null;
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string;
  entityType?: string | null;
  entityId?: number | null;
}

export interface InboxListResponse {
  data: InboxEmail[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface SyncResult {
  synced: number;
  errors: number;
  lastSync: string;
}

const BASE = "/inbox";

function qs(params: Record<string, unknown>): string {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== undefined && p.set(k, String(v)));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export const inboxApi = {
  getAccount: () =>
    requestJson<ImapAccount | null>(`${BASE}/account`),

  connect: (data: { email: string; password: string; host?: string; port?: number }) =>
    requestJson<ImapAccount>(`${BASE}/account`, { method: "POST", body: JSON.stringify(data) }),

  disconnect: () =>
    requestVoid(`${BASE}/account`, { method: "DELETE" }),

  syncNow: () =>
    requestJson<SyncResult>(`${BASE}/sync`, { method: "POST" }),

  getInbox: (params?: { page?: number; limit?: number; unreadOnly?: boolean; search?: string }) =>
    requestJson<InboxListResponse>(`${BASE}${qs(params ?? {})}`),

  getEmail: (id: number) =>
    requestJson<InboxEmail>(`${BASE}/${id}`),

  getByEntity: (entityType: string, entityId: number) =>
    requestJson<InboxEmail[]>(`${BASE}/by-entity${qs({ entityType, entityId })}`),

  getUnreadCount: () =>
    requestJson<{ count: number }>(`${BASE}/unread-count`),

  markRead: (id: number, isRead: boolean) =>
    requestJson(`${BASE}/${id}/read`, { method: "PATCH", body: JSON.stringify({ isRead }) }),

  toggleStar: (id: number) =>
    requestJson(`${BASE}/${id}/star`, { method: "PATCH" }),
};
