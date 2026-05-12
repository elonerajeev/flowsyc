import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { requestJson } from "@/lib/api-client";
import { deploymentKeys } from "@/services/deployments";

export type PipelineStatus = "success" | "failed" | "running" | "cancelled" | "queued" | "unknown";

export interface PipelineRun {
  id: string;
  workflow: string;
  branch: string;
  status: PipelineStatus;
  durationMs: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string | null;
  actor: string | null;
  commitHash: string | null;
  commitMessage: string | null;
  url: string | null;
  source: "github" | "deployments";
}

type PipelinesResponse = {
  data: PipelineRun[];
  meta: {
    source: "github" | "deployments";
    count: number;
  };
};

type ListParams = {
  limit?: number;
  branch?: string;
  workflow?: string;
  status?: PipelineStatus;
};

function buildQuery(params: ListParams) {
  const search = new URLSearchParams();
  if (params.limit) search.set("limit", String(params.limit));
  if (params.branch) search.set("branch", params.branch);
  if (params.workflow) search.set("workflow", params.workflow);
  if (params.status) search.set("status", params.status);
  return search.toString() ? `?${search.toString()}` : "";
}

export const pipelineKeys = {
  all: ["pipelines"] as const,
  list: (params: ListParams) =>
    [...pipelineKeys.all, "list", params.limit ?? 30, params.branch ?? "", params.workflow ?? "", params.status ?? ""] as const,
};

export function usePipelines(params: ListParams = {}) {
  return useQuery({
    queryKey: pipelineKeys.list(params),
    queryFn: () => requestJson<PipelinesResponse>(`/pipelines${buildQuery(params)}`),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function useSyncPipelines() {
  const queryClient = useQueryClient();
  return useMutation<{ data: { processed: number; fetched: number } }, Error, number>({
    mutationFn: (limit: number) =>
      requestJson<{ data: { processed: number; fetched: number } }>("/pipelines/github/sync", {
        method: "POST",
        body: JSON.stringify({ limit }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
      await queryClient.invalidateQueries({ queryKey: deploymentKeys.all });
    },
  });
}
