import crypto from "crypto";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { decrypt, encrypt } from "../utils/crypto";
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

type GitHubErrorResponse = {
  message?: string;
};

type GitHubWebhookPayload = {
  repository?: {
    name?: string | null;
    owner?: { login?: string | null } | null;
  } | null;
  workflow_run?: GitHubWorkflowRun;
};

type RuntimeGitHubConfig = {
  owner: string;
  repos: string[];   // multi-repo
  token: string;
  scope: "org" | "user";
  webhookSecret?: string;
  webhookOrganizationId?: string;
  source: "env" | "user";
  cacheScope: string;
};

type GitHubConfigInput = {
  owner: string;
  repos: string[];
  token: string;
  scope: "org" | "user";
  webhookSecret?: string;
  webhookOrganizationId?: string;
};

function normalizeText(value: string | null | undefined) {
  return String(value ?? "").trim();
}

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

function getEnvGitHubConfig(): RuntimeGitHubConfig | null {
  const owner = process.env.GITHUB_REPO_OWNER?.trim();
  const repo = process.env.GITHUB_REPO_NAME?.trim();
  const token = process.env.GITHUB_TOKEN?.trim();
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET?.trim();
  const webhookOrganizationId = process.env.GITHUB_WEBHOOK_ORGANIZATION_ID?.trim();

  if (!owner || !repo || !token) return null;

  return {
    owner, repos: [repo], token, scope: "org",
    webhookSecret, webhookOrganizationId,
    source: "env", cacheScope: `env:${owner}/${repo}`,
  };
}

function normalizeRepoValue(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
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

function readUserGitHubConfig(data: unknown): {
  owner: string;
  repos: string[];
  scope: "org" | "user";
  tokenEncrypted: string;
  webhookSecret?: string;
  webhookOrganizationId?: string;
} | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const root = data as Record<string, unknown>;
  const integrations = root.integrations;
  if (!integrations || typeof integrations !== "object" || Array.isArray(integrations)) return null;
  const github = (integrations as Record<string, unknown>).github;
  if (!github || typeof github !== "object" || Array.isArray(github)) return null;
  const payload = github as Record<string, unknown>;

  const owner = normalizeText(payload.owner as string | undefined);
  const tokenEncrypted = normalizeText(payload.tokenEncrypted as string | undefined);
  if (!owner || !tokenEncrypted) return null;

  // Support both old single-repo and new multi-repo format
  const repos: string[] = Array.isArray(payload.repos)
    ? (payload.repos as string[]).filter(Boolean)
    : payload.repo ? [normalizeText(payload.repo as string)] : [];
  if (repos.length === 0) return null;

  const scope = payload.scope === "org" ? "org" : "user";
  const webhookSecret = normalizeText(payload.webhookSecret as string | undefined);
  const webhookOrganizationId = normalizeText(payload.webhookOrganizationId as string | undefined);

  return {
    owner, repos, scope, tokenEncrypted,
    ...(webhookSecret ? { webhookSecret } : {}),
    ...(webhookOrganizationId ? { webhookOrganizationId } : {}),
  };
}

async function getUserGitHubConfig(actor: AccessActor): Promise<RuntimeGitHubConfig | null> {
  if (!actor?.userId) return null;

  const preference = await prisma.userPreference.findUnique({
    where: { userId: actor.userId },
    select: { data: true },
  });
  if (!preference) return null;

  const config = readUserGitHubConfig(preference.data);
  if (!config) return null;

  try {
    const token = decrypt(config.tokenEncrypted).trim();
    if (!token) return null;
    return {
      owner: config.owner, repos: config.repos, token,
      scope: config.scope,
      webhookSecret: config.webhookSecret,
      webhookOrganizationId: config.webhookOrganizationId,
      source: "user",
      cacheScope: `user:${actor.userId}:${config.owner}:${config.repos.join(",")}`,
    };
  } catch {
    return null;
  }
}

async function resolveRuntimeGitHubConfig(actor?: AccessActor): Promise<RuntimeGitHubConfig | null> {
  const envConfig = getEnvGitHubConfig();
  if (envConfig) return envConfig;
  if (!actor) return null;
  return getUserGitHubConfig(actor);
}

async function fetchGitHubRuns(config: RuntimeGitHubConfig, options: ListOptions): Promise<PipelineRun[]> {
  const statusFilter = getGitHubStatusFilter(options.status);
  const search = new URLSearchParams({ per_page: String(Math.min(100, options.limit)) });
  if (options.branch) search.set("branch", options.branch);
  if (statusFilter) search.set("status", statusFilter);

  // Fetch from all configured repos and merge
  const allRuns: PipelineRun[] = [];
  for (const repo of config.repos) {
    const url = `https://api.github.com/repos/${config.owner}/${repo}/actions/runs?${search.toString()}`;
    const cacheKey = `pipelines:github:${config.cacheScope}:${repo}:${search.toString()}`;
    const cached = await cache.get<PipelineRun[]>(cacheKey);
    if (cached) { allRuns.push(...cached); continue; }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      let response: Response;
      try {
        response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "flowsyc-crm",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") throw new AppError("GitHub API request timed out", 504, "GITHUB_TIMEOUT");
        throw new AppError("Unable to reach GitHub API", 502, "GITHUB_UNAVAILABLE");
      }

      if (!response.ok) {
        let remoteMessage = "";
        try { const p = (await response.json()) as GitHubErrorResponse; remoteMessage = String(p?.message ?? "").trim(); } catch { remoteMessage = ""; }
        if (response.status === 401 || response.status === 403) throw new AppError("GitHub token is invalid or missing required Actions read access", 400, "GITHUB_AUTH_FAILED");
        if (response.status === 404) throw new AppError(`GitHub repository ${config.owner}/${repo} not found or access denied`, 400, "GITHUB_REPO_NOT_FOUND");
        if (response.status === 429) throw new AppError("GitHub API rate limit exceeded. Try again shortly.", 429, "GITHUB_RATE_LIMITED");
        throw new AppError(remoteMessage ? `GitHub API error: ${remoteMessage}` : `GitHub API error (${response.status})`, 502, "GITHUB_API_ERROR");
      }

      const payload = (await response.json()) as GitHubRunsResponse;
      let runs = (payload.workflow_runs ?? []).map(mapGitHubRun);
      if (options.workflow) { const needle = options.workflow.toLowerCase(); runs = runs.filter((r) => r.workflow.toLowerCase().includes(needle)); }
      if (options.status) runs = runs.filter((r) => r.status === options.status);

      await cache.set(cacheKey, runs, 60_000);
      allRuns.push(...runs);
    } finally {
      clearTimeout(timeout);
    }
  }

  // Sort merged results by startedAt desc, deduplicate by id
  const seen = new Set<string>();
  return allRuns
    .filter((r) => { if (seen.has(r.id)) return false; seen.add(r.id); return true; })
    .sort((a, b) => new Date(b.startedAt ?? 0).getTime() - new Date(a.startedAt ?? 0).getTime())
    .slice(0, options.limit);
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

async function persistGitHubRunsToDeployments(runs: PipelineRun[], organizationId: string): Promise<number> {
  const dedupedByMarker = new Map<string, PipelineRun>();
  for (const run of runs) {
    if (!run.id.startsWith("gh-")) continue;
    dedupedByMarker.set(run.id, run);
  }

  const markers = Array.from(dedupedByMarker.keys());
  if (markers.length === 0) return 0;

  const existingRows = await prisma.deployment.findMany({
    where: {
      organizationId,
      version: { in: markers },
    },
    select: { id: true, version: true },
  });
  const existingByVersion = new Map(existingRows.map((row) => [row.version ?? "", row.id]));

  const updates: Array<Promise<unknown>> = [];
  const creates: Array<{
    organizationId: string;
    service: string;
    environment: string;
    status: "success" | "failed" | "running" | "cancelled";
    commitHash: string | null;
    commitMessage: string | null;
    branch: string;
    deployedBy: string | null;
    version: string;
    notes: string | null;
    startedAt: Date;
    finishedAt: Date | null;
    updatedAt: Date;
  }> = [];

  for (const marker of markers) {
    const run = dedupedByMarker.get(marker)!;
    const existingId = existingByVersion.get(marker);
    const payload = {
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
    };

    if (existingId) {
      updates.push(
        prisma.deployment.update({
          where: { id: existingId },
          data: payload,
        }),
      );
    } else {
      creates.push({
        organizationId,
        ...payload,
        version: marker,
      });
    }
  }

  if (creates.length > 0) {
    await prisma.deployment.createMany({ data: creates });
  }
  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return markers.length;
}

function isMatchingRepository(payload: GitHubWebhookPayload, config: RuntimeGitHubConfig): boolean {
  const expectedOwner = normalizeRepoValue(config.owner);
  const actualOwner = normalizeRepoValue(payload.repository?.owner?.login);
  const actualRepo = normalizeRepoValue(payload.repository?.name);

  return actualOwner === expectedOwner && config.repos.map(normalizeRepoValue).includes(actualRepo);
}

function isWebhookConfigured(config: RuntimeGitHubConfig | null) {
  return Boolean(config?.webhookSecret && config?.webhookOrganizationId);
}

export const pipelinesService = {
  // List all repos accessible by a token (org repos or user repos)
  async listGitHubRepos(token: string, owner: string, isOrg: boolean): Promise<{ name: string; fullName: string; private: boolean; description: string | null }[]> {
    const url = isOrg
      ? `https://api.github.com/orgs/${owner}/repos?per_page=100&sort=updated`
      : `https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "flowsyc-crm",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) throw new AppError("Invalid token or insufficient permissions", 400, "GITHUB_AUTH_FAILED");
      if (response.status === 404) throw new AppError(`Organization '${owner}' not found`, 404, "GITHUB_NOT_FOUND");
      throw new AppError(`GitHub API error (${response.status})`, 502, "GITHUB_API_ERROR");
    }

    const repos = (await response.json()) as Array<{ name: string; full_name: string; private: boolean; description: string | null }>;
    return repos.map((r) => ({ name: r.name, fullName: r.full_name, private: r.private, description: r.description }));
  },

  async list(actor: AccessActor, options: ListOptions): Promise<{ data: PipelineRun[]; source: PipelineSource }> {
    if (!actor) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const githubConfig = await resolveRuntimeGitHubConfig(actor);
    if (githubConfig) {
      try {
        const data = await fetchGitHubRuns(githubConfig, options);
        return { data, source: "github" };
      } catch (error) {
        logger.warn("Pipelines: GitHub API unavailable, falling back to deployments", {
          error: error instanceof Error ? error.message : String(error),
          source: githubConfig.source,
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
    if (!actor?.organizationId) {
      throw new AppError("Organization context is required", 400, "ORG_REQUIRED");
    }

    const githubConfig = await resolveRuntimeGitHubConfig(actor);
    if (!githubConfig) {
      throw new AppError("GitHub integration is not configured", 400, "GITHUB_NOT_CONFIGURED");
    }

    try {
      const runs = await fetchGitHubRuns(githubConfig, { limit: Math.min(100, Math.max(1, limit)) });
      const processed = await persistGitHubRunsToDeployments(runs, actor.organizationId);
      await cache.invalidatePrefix("pipelines:github:");
      return {
        processed,
        fetched: runs.length,
        source: githubConfig.source,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      logger.error("Pipelines sync failed", {
        error: error instanceof Error ? error.message : String(error),
        organizationId: actor.organizationId,
      });
      throw new AppError("Failed to sync pipelines from GitHub", 500, "PIPELINE_SYNC_FAILED");
    }
  },

  async getGitHubConfigStatus(actor: AccessActor) {
    if (!actor) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const config = await resolveRuntimeGitHubConfig(actor);
    if (!config) {
      return {
        configured: false,
        source: "none" as const,
        owner: null,
        repos: [],
        scope: "user" as const,
        webhookConfigured: false,
      };
    }

    return {
      configured: true,
      source: config.source,
      owner: config.owner,
      repos: config.repos,
      scope: config.scope ?? "user",
      webhookConfigured: isWebhookConfigured(config),
    };
  },

  async upsertUserGitHubConfig(actor: AccessActor, input: GitHubConfigInput) {
    if (!actor) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const owner = normalizeText(input.owner);
    const repos = (input.repos ?? []).map(normalizeText).filter(Boolean);
    const token = normalizeText(input.token);
    const scope = input.scope ?? "user";
    if (!owner || repos.length === 0 || !token) {
      throw new AppError("Invalid GitHub configuration", 400, "VALIDATION_ERROR");
    }

    const existing = await prisma.userPreference.findUnique({
      where: { userId: actor.userId },
      select: { id: true, data: true },
    });

    const currentData =
      existing?.data && typeof existing.data === "object" && !Array.isArray(existing.data)
        ? (existing.data as Record<string, unknown>)
        : {};

    const currentIntegrations =
      currentData.integrations && typeof currentData.integrations === "object" && !Array.isArray(currentData.integrations)
        ? (currentData.integrations as Record<string, unknown>)
        : {};

    const updatedData = {
      ...currentData,
      integrations: {
        ...currentIntegrations,
        github: {
          owner, repos, scope,
          tokenEncrypted: encrypt(token),
          ...(input.webhookSecret ? { webhookSecret: normalizeText(input.webhookSecret) } : {}),
          ...(input.webhookOrganizationId ? { webhookOrganizationId: normalizeText(input.webhookOrganizationId) } : {}),
          updatedAt: new Date().toISOString(),
        },
      },
    };

    if (existing?.id) {
      await prisma.userPreference.update({
        where: { userId: actor.userId },
        data: {
          data: updatedData,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.userPreference.create({
        data: {
          id: crypto.randomUUID(),
          userId: actor.userId!,
          data: updatedData,
          updatedAt: new Date(),
        },
      });
    }

    await cache.invalidatePrefix("pipelines:github:");
    return this.getGitHubConfigStatus(actor);
  },

  async clearUserGitHubConfig(actor: AccessActor) {
    if (!actor) {
      throw new AppError("Unauthorized", 401, "UNAUTHORIZED");
    }

    const existing = await prisma.userPreference.findUnique({
      where: { userId: actor.userId },
      select: { data: true },
    });
    if (!existing || !existing.data || typeof existing.data !== "object" || Array.isArray(existing.data)) {
      return this.getGitHubConfigStatus(actor);
    }

    const currentData = existing.data as Record<string, unknown>;
    const currentIntegrations =
      currentData.integrations && typeof currentData.integrations === "object" && !Array.isArray(currentData.integrations)
        ? (currentData.integrations as Record<string, unknown>)
        : {};

    const { github: _githubRemoved, ...remainingIntegrations } = currentIntegrations;
    const updatedData = {
      ...currentData,
      integrations: remainingIntegrations,
    };

    await prisma.userPreference.update({
      where: { userId: actor.userId },
      data: {
        data: updatedData as any,
        updatedAt: new Date(),
      },
    });

    await cache.invalidatePrefix("pipelines:github:");
    return this.getGitHubConfigStatus(actor);
  },

  async isWebhookConfigured() {
    const config = getEnvGitHubConfig();
    return isWebhookConfigured(config);
  },

  async verifyWebhookSignature(rawBody: string | undefined, signatureHeader: string | undefined): Promise<boolean> {
    const config = getEnvGitHubConfig();
    const secret = config?.webhookSecret;
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

    const config = getEnvGitHubConfig();
    if (!config) {
      logger.warn("Pipelines webhook ignored: GitHub env config missing");
      return { processed: 0, ignored: true };
    }

    const body = payload as GitHubWebhookPayload;
    if (!body?.workflow_run) {
      return { processed: 0, ignored: true };
    }
    if (!isMatchingRepository(body, config)) {
      logger.warn("Pipelines webhook ignored: repository mismatch");
      return { processed: 0, ignored: true };
    }

    const webhookOrganizationId = config.webhookOrganizationId;
    if (!webhookOrganizationId) {
      logger.warn("Pipelines webhook ignored: GITHUB_WEBHOOK_ORGANIZATION_ID is missing");
      return { processed: 0, ignored: true };
    }

    const run = mapGitHubRun(body.workflow_run);
    const processed = await persistGitHubRunsToDeployments([run], webhookOrganizationId);
    await cache.invalidatePrefix("pipelines:github:");
    return { processed, ignored: false };
  },
};
