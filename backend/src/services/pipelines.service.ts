import crypto from "crypto";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import type { AccessActor } from "../utils/access-control";
import { orgFilter } from "../utils/access-control";
import { cache, TTL } from "../utils/cache";
import { logger } from "../utils/logger";

type PipelineStatus = "success" | "failed" | "running" | "cancelled" | "queued" | "unknown";
type PipelineSource = "github" | "deployments";

type PipelineRun = {
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
  source: PipelineSource;
};

type ListOptions = {
  limit: number;
  branch?: string;
  workflow?: string;
  status?: PipelineStatus;
};

type GitHubWorkflowRun = {
  id: number;
  name?: string | null;
  head_branch?: string | null;
  status?: string | null;
  conclusion?: string | null;
  run_started_at?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  html_url?: string | null;
  head_sha?: string | null;
  display_title?: string | null;
  actor?: { login?: string | null } | null;
};

type GitHubRunsResponse = {
  workflow_runs?: GitHubWorkflowRun[];
};

function mapGitHubStatus(status: string | null | undefined, conclusion: string | null | undefined): PipelineStatus {
  const normalizedStatus = String(status ?? "").toLowerCase();
  const normalizedConclusion = String(conclusion ?? "").toLowerCase();

  if (normalizedStatus === "in_progress") return "running";
  if (["queued", "pending", "requested", "waiting"].includes(normalizedStatus)) return "queued";

  if (normalizedStatus === "completed") {
    if (normalizedConclusion === "success") return "success";
    if (["failure", "timed_out", "startup_failure"].includes(normalizedConclusion)) return "failed";
    if (["cancelled", "skipped", "stale", "neutral", "action_required"].includes(normalizedConclusion)) return "cancelled";
    return "unknown";
  }

  return "unknown";
}

function parseDurationMs(startedAt: string | null | undefined, finishedAt: string | null | undefined): number | null {
  if (!startedAt || !finishedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.max(0, end - start);
}

function toDeploymentStatus(status: PipelineStatus): "success" | "failed" | "running" | "cancelled" {
  if (status === "success") return "success";
  if (status === "failed") return "failed";
  if (status === "running" || status === "queued") return "running";
  return "cancelled";
}

function fromDeploymentStatus(status: string): PipelineStatus {
  if (status === "success") return "success";
  if (status === "failed") return "failed";
  if (status === "running") return "running";
  if (status === "cancelled") return "cancelled";
  return "unknown";
}

function getGitHubConfig() {
  const owner = process.env.GITHUB_REPO_OWNER?.trim();
  const repo = process.env.GITHUB_REPO_NAME?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  return { owner, repo, token, webhookSecret };
}

function isGitHubConfigured() {
  const { owner, repo, token } = getGitHubConfig();
  return Boolean(owner && repo && token);
}

function getGitHubStatusFilter(status?: PipelineStatus) {
  if (!status) return undefined;
  if (status === "running") return "in_progress";
  if (status === "queued") return "queued";
  if (status === "success") return "success";
  if (status === "failed") return "failure";
  if (status === "cancelled") return "cancelled";
  return undefined;
}

function mapGitHubRun(run: GitHubWorkflowRun): PipelineRun {
  const startedAt = run.run_started_at ?? run.created_at ?? null;
  const finishedAt =
    String(run.status ?? "").toLowerCase() === "completed"
      ? run.updated_at ?? null
      : null;
  const status = mapGitHubStatus(run.status, run.conclusion);

  return {
    id: `gh-${run.id}`,
    workflow: run.name?.trim() || "Unnamed Workflow",
    branch: run.head_branch?.trim() || "unknown",
    status,
    durationMs: parseDurationMs(startedAt, finishedAt ?? run.updated_at ?? null),
    startedAt,
    finishedAt,
    updatedAt: run.updated_at ?? null,
    actor: run.actor?.login?.trim() ?? null,
    commitHash: run.head_sha?.trim() ?? null,
    commitMessage: run.display_title?.trim() ?? null,
    url: run.html_url?.trim() ?? null,
    source: "github",
  };
}

async function fetchGitHubRuns(options: ListOptions): Promise<PipelineRun[]> {
  const { owner, repo, token } = getGitHubConfig();
  if (!owner || !repo || !token) {
    return [];
  }

  const statusFilter = getGitHubStatusFilter(options.status);
  const search = new URLSearchParams({
    per_page: String(Math.min(100, options.limit)),
  });
  if (options.branch) search.set("branch", options.branch);
  if (statusFilter) search.set("status", statusFilter);

  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?${search.toString()}`;

  const cacheKey = `pipelines:github:${search.toString()}`;
  const cached = await cache.get<PipelineRun[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "flowsyc-crm",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`);
    }

    const payload = (await response.json()) as GitHubRunsResponse;
    let runs = (payload.workflow_runs ?? []).map(mapGitHubRun);

    if (options.workflow) {
      const needle = options.workflow.toLowerCase();
      runs = runs.filter((run) => run.workflow.toLowerCase().includes(needle));
    }
    if (options.status) {
      runs = runs.filter((run) => run.status === options.status);
    }

    runs = runs.slice(0, options.limit);
    await cache.set(cacheKey, runs, TTL.SHORT);
    return runs;
  } finally {
    clearTimeout(timeout);
  }
}

function buildDeploymentWhere(actor: AccessActor, options: ListOptions) {
  return {
    ...orgFilter(actor),
    ...(options.branch ? { branch: options.branch } : {}),
    ...(options.workflow ? { service: { contains: options.workflow, mode: "insensitive" as const } } : {}),
    ...(options.status
      ? { status: toDeploymentStatus(options.status) as "success" | "failed" | "running" | "cancelled" }
      : {}),
  };
}

async function fetchDeploymentBackfill(actor: AccessActor, options: ListOptions): Promise<PipelineRun[]> {
  const rows = await prisma.deployment.findMany({
    where: buildDeploymentWhere(actor, options),
    orderBy: { startedAt: "desc" },
    take: options.limit,
  });

  return rows.map((row) => ({
    id: `dep-${row.id}`,
    workflow: row.service,
    branch: row.branch ?? "unknown",
    status: fromDeploymentStatus(row.status),
    durationMs: parseDurationMs(row.startedAt.toISOString(), row.finishedAt?.toISOString() ?? row.updatedAt.toISOString()),
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    actor: row.deployedBy ?? null,
    commitHash: row.commitHash ?? null,
    commitMessage: row.commitMessage ?? null,
    url: null,
    source: "deployments",
  }));
}

async function persistGitHubRunsToDeployments(runs: PipelineRun[]): Promise<number> {
  let processed = 0;

  for (const run of runs) {
    if (!run.id.startsWith("gh-")) continue;
    const marker = run.id;

    const existing = await prisma.deployment.findFirst({
      where: { version: marker },
      select: { id: true },
    });

    if (existing) {
      await prisma.deployment.update({
        where: { id: existing.id },
        data: {
          service: run.workflow,
          environment: "ci-cd",
          branch: run.branch,
          status: toDeploymentStatus(run.status),
          commitHash: run.commitHash,
          commitMessage: run.commitMessage,
          deployedBy: run.actor,
          startedAt: run.startedAt ? new Date(run.startedAt) : new Date(),
          finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
          notes: run.url ?? null,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.deployment.create({
        data: {
          organizationId: null,
          service: run.workflow,
          environment: "ci-cd",
          status: toDeploymentStatus(run.status),
          commitHash: run.commitHash,
          commitMessage: run.commitMessage,
          branch: run.branch,
          deployedBy: run.actor,
          version: marker,
          notes: run.url ?? null,
          startedAt: run.startedAt ? new Date(run.startedAt) : new Date(),
          finishedAt: run.finishedAt ? new Date(run.finishedAt) : null,
          updatedAt: new Date(),
        },
      });
    }

    processed += 1;
  }

  return processed;
}

export const pipelinesService = {
  async list(actor: AccessActor, options: ListOptions): Promise<{ data: PipelineRun[]; source: PipelineSource }> {
    if (!actor) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    if (isGitHubConfigured()) {
      try {
        const data = await fetchGitHubRuns(options);
        return { data, source: "github" };
      } catch (error) {
        logger.warn("Pipelines: GitHub API unavailable, falling back to deployments", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const data = await fetchDeploymentBackfill(actor, options);
    return { data, source: "deployments" };
  },

  async syncFromGitHub(actor: AccessActor, limit = 30) {
    if (actor?.role !== "admin" && actor?.role !== "manager") {
      throw new AppError("Admin or manager only", 403, "FORBIDDEN");
    }
    if (!isGitHubConfigured()) {
      throw new AppError("GitHub integration is not configured", 400, "GITHUB_NOT_CONFIGURED");
    }

    const runs = await fetchGitHubRuns({ limit: Math.min(100, Math.max(1, limit)) });
    const processed = await persistGitHubRunsToDeployments(runs);
    return {
      processed,
      fetched: runs.length,
    };
  },

  isWebhookConfigured() {
    return Boolean(getGitHubConfig().webhookSecret);
  },

  verifyWebhookSignature(rawBody: string | undefined, signatureHeader: string | undefined): boolean {
    const secret = getGitHubConfig().webhookSecret;
    if (!secret || !rawBody || !signatureHeader?.startsWith("sha256=")) {
      return false;
    }

    const expected = crypto
      .createHmac("sha256", secret)
      .update(rawBody, "utf8")
      .digest("hex");
    const received = signatureHeader.slice("sha256=".length);

    const expectedBuffer = Buffer.from(expected, "hex");
    const receivedBuffer = Buffer.from(received, "hex");
    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  },

  async handleGitHubWebhook(event: string | undefined, payload: unknown) {
    if (event !== "workflow_run") {
      return { processed: 0, ignored: true };
    }

    const body = payload as { workflow_run?: GitHubWorkflowRun };
    if (!body?.workflow_run) {
      return { processed: 0, ignored: true };
    }

    const run = mapGitHubRun(body.workflow_run);
    const processed = await persistGitHubRunsToDeployments([run]);
    await cache.invalidatePrefix("pipelines:github:");
    return { processed, ignored: false };
  },
};
