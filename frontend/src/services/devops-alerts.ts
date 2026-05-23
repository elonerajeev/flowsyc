import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requestJson, requestVoid } from "@/lib/api-client";

export type AlertSeverity = "critical" | "warning" | "info";

export interface DevOpsAlert {
  id: number;
  title: string;
  service: string;
  severity: AlertSeverity;
  description: string | null;
  resolved: boolean;
  resolvedAt: string | null;
  resolvedBy: string | null;
  createdAt: string;
}

const BASE = "/devops/alerts";
const KEY = ["devops-alerts"] as const;

export function useDevOpsAlerts() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => requestJson<{ data: DevOpsAlert[] }>(BASE).then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useCreateAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<DevOpsAlert, "title" | "service" | "severity"> & { description?: string }) =>
      requestJson<{ data: DevOpsAlert }>(BASE, { method: "POST", body: JSON.stringify(data) }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      requestJson<{ data: DevOpsAlert }>(`${BASE}/${id}/resolve`, { method: "PATCH" }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => requestVoid(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
