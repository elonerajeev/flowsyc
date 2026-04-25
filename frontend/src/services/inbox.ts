import apiClient from "../lib/api-client";

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

export const inboxApi = {
  // Account
  getAccount: () =>
    apiClient.get<ImapAccount | null>(`${BASE}/account`).then((r) => r.data),

  connect: (data: { email: string; password: string; host?: string; port?: number }) =>
    apiClient.post<ImapAccount>(`${BASE}/account`, data).then((r) => r.data),

  disconnect: () =>
    apiClient.delete(`${BASE}/account`).then((r) => r.data),

  // Sync
  syncNow: () =>
    apiClient.post<SyncResult>(`${BASE}/sync`).then((r) => r.data),

  // Inbox
  getInbox: (params?: { page?: number; limit?: number; unreadOnly?: boolean; search?: string }) =>
    apiClient.get<InboxListResponse>(BASE, { params }).then((r) => r.data),

  getEmail: (id: number) =>
    apiClient.get<InboxEmail>(`${BASE}/${id}`).then((r) => r.data),

  getByEntity: (entityType: string, entityId: number) =>
    apiClient.get<InboxEmail[]>(`${BASE}/by-entity`, { params: { entityType, entityId } }).then((r) => r.data),

  getUnreadCount: () =>
    apiClient.get<{ count: number }>(`${BASE}/unread-count`).then((r) => r.data),

  // Actions
  markRead: (id: number, isRead: boolean) =>
    apiClient.patch(`${BASE}/${id}/read`, { isRead }).then((r) => r.data),

  toggleStar: (id: number) =>
    apiClient.patch(`${BASE}/${id}/star`).then((r) => r.data),
};
