import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson, requestVoid } from "@/lib/api-client";

export type LogSourceAuthType = "api_key" | "bearer" | "custom_header";

export interface DevOpsLogSource {
  id: number;
  name: string;
  provider: string;
  environment: string;
  endpoint: string | null;
  authType: LogSourceAuthType;
  authConfig: Record<string, string>;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  lastIngestAt: string | null;
}

export interface DevOpsSourceLogEntry {
  sourceId: number;
  level: string;
  message: string;
  timestamp: string;
}

export interface CreateLogSourceInput {
  name: string;
  provider: string;
  environment: string;
  endpoint?: string;
  authType: LogSourceAuthType;
  authConfig?: Record<string, string>;
  isActive?: boolean;
}

export interface UpdateLogSourceInput {
  id: number;
  name?: string;
  provider?: string;
  environment?: string;
  endpoint?: string;
  authType?: LogSourceAuthType;
  authConfig?: Record<string, string>;
  isActive?: boolean;
}

const BASE = "/devops/log-sources";

export const logSourceKeys = {
  all: ["devops-log-sources"] as const,
  list: () => [...logSourceKeys.all, "list"] as const,
  logs: (sourceId: number, limit: number) => [...logSourceKeys.all, "logs", sourceId, limit] as const,
};

export function useLogSources(enabled = true) {
  return useQuery({
    queryKey: logSourceKeys.list(),
    queryFn: () => requestJson<{ data: DevOpsLogSource[] }>(BASE).then((response) => response.data),
    enabled,
    refetchInterval: 30_000,
  });
}

export function useLogSourceLogs(sourceId: number, limit = 300, enabled = true) {
  return useQuery({
    queryKey: logSourceKeys.logs(sourceId, limit),
    queryFn: () =>
      requestJson<{ data: DevOpsSourceLogEntry[] }>(`${BASE}/${sourceId}/logs?limit=${limit}`).then((response) => response.data),
    enabled: enabled && sourceId > 0,
    staleTime: 5_000,
  });
}

export function useCreateLogSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLogSourceInput) =>
      requestJson<{ data: { source: DevOpsLogSource; ingestKey: string } }>(BASE, {
        method: "POST",
        body: JSON.stringify(input),
      }).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logSourceKeys.list() });
    },
  });
}

export function useUpdateLogSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateLogSourceInput) =>
      requestJson<{ data: DevOpsLogSource }>(`${BASE}/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logSourceKeys.list() });
    },
  });
}

export function useRegenerateLogSourceKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) =>
      requestJson<{ data: { ingestKey: string } }>(`${BASE}/${id}/regenerate-key`, {
        method: "POST",
      }).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logSourceKeys.list() });
    },
  });
}

export function useDeleteLogSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => requestVoid(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: logSourceKeys.list() });
    },
  });
}
