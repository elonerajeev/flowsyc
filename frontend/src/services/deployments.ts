import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { requestJson, requestVoid } from "@/lib/api-client";

export type DeploymentStatus = "success" | "failed" | "running" | "cancelled";

export interface Deployment {
  id: number;
  service: string;
  environment: string;
  status: DeploymentStatus;
  commitHash: string | null;
  commitMessage: string | null;
  branch: string | null;
  deployedBy: string | null;
  version: string | null;
  notes: string | null;
  startedAt: string;
  finishedAt: string | null;
  organizationId: string | null;
}

const BASE = "/deployments";

export const deploymentKeys = {
  all:  ["deployments"] as const,
  list: () => [...deploymentKeys.all, "list"] as const,
};

export function useDeployments() {
  return useQuery({
    queryKey: deploymentKeys.list(),
    queryFn: () => requestJson<{ data: Deployment[] }>(BASE).then((r) => r.data),
    refetchInterval: 30_000,
  });
}

type CreateInput = Omit<Deployment, "id" | "organizationId" | "startedAt" | "finishedAt"> & {
  startedAt?: string; finishedAt?: string;
};

export function useCreateDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<CreateInput>) =>
      requestJson<{ data: Deployment }>(BASE, { method: "POST", body: JSON.stringify(data) }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: deploymentKeys.list() }),
  });
}

export function useUpdateDeploymentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; status: DeploymentStatus; notes?: string }) =>
      requestJson<{ data: Deployment }>(`${BASE}/${id}/status`, { method: "PATCH", body: JSON.stringify(data) }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: deploymentKeys.list() }),
  });
}

export function useDeleteDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => requestVoid(`${BASE}/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: deploymentKeys.list() }),
  });
}
