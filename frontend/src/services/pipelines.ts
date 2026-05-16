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

export type GitHubConfigStatus = {
  configured: boolean;
  source: "env" | "user" | "none";
  owner: string | null;
  repos: string[];
  scope: "org" | "user";
  webhookConfigured: boolean;
};

export type UpsertGitHubConfigInput = {
  owner: string;
  repos: string[];
  token: string;
  scope: "org" | "user";
  webhookSecret?: string;
  webhookOrganizationId?: string;
};

export interface GitHubRepo {
  name: string;
  fullName: string;
  private: boolean;
  description: string | null;
}

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
  return useMutation<{ data: { processed: number; fetched: number; source: "env" | "user" } }, Error, number>({
    mutationFn: (limit: number) =>
      requestJson<{ data: { processed: number; fetched: number; source: "env" | "user" } }>("/pipelines/github/sync", {
        method: "POST",
        body: JSON.stringify({ limit }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
      await queryClient.invalidateQueries({ queryKey: deploymentKeys.all });
    },
  });
}

export function useGitHubConfigStatus(enabled = true) {
  return useQuery({
    queryKey: [...pipelineKeys.all, "github-config"],
    queryFn: () => requestJson<{ data: GitHubConfigStatus }>("/pipelines/github/config").then((response) => response.data),
    enabled,
    staleTime: 30_000,
  });
}

export function useUpsertGitHubConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertGitHubConfigInput) =>
      requestJson<{ data: GitHubConfigStatus }>("/pipelines/github/config", {
        method: "PUT",
        body: JSON.stringify(input),
      }).then((response) => response.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...pipelineKeys.all, "github-config"] });
      await queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
      await queryClient.invalidateQueries({ queryKey: deploymentKeys.all });
    },
  });
}

export function useClearGitHubConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      requestJson<{ data: GitHubConfigStatus }>("/pipelines/github/config", {
        method: "DELETE",
      }).then((response) => response.data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [...pipelineKeys.all, "github-config"] });
      await queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
      await queryClient.invalidateQueries({ queryKey: deploymentKeys.all });
    },
  });
}

export function useListGitHubRepos(token: string, owner: string, isOrg: boolean, enabled: boolean) {
  return useQuery({
    queryKey: ["github-repos", owner, isOrg],
    queryFn: () => {
      const params = new URLSearchParams({ token, owner, scope: isOrg ? "org" : "user" });
      return requestJson<{ data: GitHubRepo[] }>(`/pipelines/github/repos?${params}`).then((r) => r.data);
    },
    enabled: enabled && token.length > 10 && owner.length > 0,
    staleTime: 60_000,
    retry: false,
  });
}
