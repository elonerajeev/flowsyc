import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requestJson, requestVoid } from "@/lib/api-client";

export interface MonitoredServer {
  id: number;
  name: string;
  ip: string;
  port: number;
  provider: string | null;
  region: string | null;
  tags: string[];
  isActive: boolean;
  organizationId: string | null;
  createdAt: string;
}

const BASE = "/servers";

export const serverKeys = {
  all:  ["servers"] as const,
  list: () => [...serverKeys.all, "list"] as const,
};

export function useServers() {
  return useQuery({
    queryKey: serverKeys.list(),
    queryFn: () => requestJson<{ data: MonitoredServer[] }>(BASE).then((r) => r.data),
    refetchInterval: 60_000,
  });
}

type CreateInput = Pick<MonitoredServer, "name" | "ip" | "port"> & { provider?: string; region?: string; tags?: string[] };

export function useCreateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInput) =>
      requestJson<{ data: MonitoredServer }>(BASE, { method: "POST", body: JSON.stringify(data) }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: serverKeys.list() }),
  });
}

export function useUpdateServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<MonitoredServer> & { id: number }) =>
      requestJson<{ data: MonitoredServer }>(`${BASE}/${id}`, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: serverKeys.list() }),
  });
}

export function useDeleteServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => requestVoid(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: serverKeys.list() }),
  });
}

export function usePingServer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      requestJson<{ data: { reachable: boolean; responseMs: number | null } }>(`${BASE}/${id}/ping`, { method: "POST" }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: serverKeys.list() }),
  });
}
