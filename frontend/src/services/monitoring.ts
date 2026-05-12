import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requestJson, requestVoid } from "@/lib/api-client";

export interface MonitoredService {
  id: number;
  name: string;
  url: string;
  checkType: "http" | "tcp" | "ping";
  intervalSecs: number;
  timeoutMs: number;
  expectedStatus: number;
  tags: string[];
  isActive: boolean;
  organizationId: string | null;
  createdAt: string;
  latestCheck: {
    status: "up" | "down" | "degraded" | "unknown";
    responseMs: number | null;
    statusCode: number | null;
    checkedAt: string;
    error: string | null;
  } | null;
  recentChecks: {
    status: string;
    responseMs: number | null;
    checkedAt: string;
  }[];
}

export interface ServiceDetail extends MonitoredService {
  checks: { id: number; status: string; responseMs: number | null; statusCode: number | null; checkedAt: string; error: string | null }[];
  stats: { uptime: number; totalChecks: number; avgResponseMs: number | null };
}

const BASE = "/monitoring/services";

export const monitoringKeys = {
  all: ["monitoring"] as const,
  list: () => [...monitoringKeys.all, "list"] as const,
  detail: (id: number) => [...monitoringKeys.all, "detail", id] as const,
};

export function useMonitoredServices() {
  const { data, ...rest } = useQuery({
    queryKey: monitoringKeys.list(),
    queryFn: () => requestJson<{ data: MonitoredService[] }>(BASE).then((r) => r.data),
    refetchInterval: (query) => {
      // Use the minimum intervalSecs across active services, floor at 10s
      const services = query.state.data;
      if (!services?.length) return 30_000;
      const minSecs = Math.min(...services.filter((s) => s.isActive).map((s) => s.intervalSecs));
      return Math.max(10, minSecs) * 1000;
    },
  });
  return { data, ...rest };
}

export function useServiceDetail(id: number) {
  return useQuery({
    queryKey: monitoringKeys.detail(id),
    queryFn: () => requestJson<{ data: ServiceDetail }>(`${BASE}/${id}`).then((r) => r.data),
    enabled: id > 0,
  });
}

type CreateInput = Pick<MonitoredService, "name" | "url" | "checkType" | "intervalSecs" | "timeoutMs" | "expectedStatus" | "tags">;

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInput) =>
      requestJson<{ data: MonitoredService }>(BASE, { method: "POST", body: JSON.stringify(data) }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: monitoringKeys.list() }),
  });
}

export function useUpdateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<MonitoredService> & { id: number }) =>
      requestJson<{ data: MonitoredService }>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: monitoringKeys.list() }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => requestVoid(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: monitoringKeys.list() }),
  });
}

export function useManualCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      requestJson<{ data: ServiceDetail }>(`${BASE}/${id}/check`, { method: "POST" }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: monitoringKeys.list() }),
  });
}
