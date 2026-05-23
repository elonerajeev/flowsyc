import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const prismaMock = {
  deployment: {
    findFirst: jest.fn<(args: unknown) => Promise<{ id: number } | null>>(),
    findMany: jest.fn<(args: unknown) => Promise<unknown[]>>(),
    create: jest.fn<(args: unknown) => Promise<{ id: number }>>(),
    createMany: jest.fn<(args: unknown) => Promise<{ count: number }>>(),
    update: jest.fn<(args: unknown) => Promise<{ id: number }>>(),
  },
};

const cacheMock = {
  get: jest.fn<(key: string) => Promise<unknown>>(),
  set: jest.fn<(key: string, value: unknown, ttl?: number) => Promise<void>>(),
  invalidatePrefix: jest.fn<(prefix: string) => Promise<void>>(),
};

jest.mock("../config/prisma", () => ({
  prisma: prismaMock,
}));

jest.mock("../utils/cache", () => ({
  cache: cacheMock,
  TTL: { SHORT: 30_000 },
}));

jest.mock("../utils/logger", () => ({
  logger: {
    warn: jest.fn(),
  },
}));

import { pipelinesService } from "../services/pipelines.service";

describe("pipelinesService security and isolation", () => {
  beforeEach(() => {
    process.env.GITHUB_REPO_OWNER = "acme";
    process.env.GITHUB_REPO_NAME = "app";
    process.env.GITHUB_TOKEN = "token";
    delete process.env.GITHUB_WEBHOOK_ORGANIZATION_ID;
    process.env.GITHUB_WEBHOOK_SECRET = "webhook-secret";

    prismaMock.deployment.findFirst.mockReset();
    prismaMock.deployment.findMany.mockReset();
    prismaMock.deployment.create.mockReset();
    prismaMock.deployment.createMany.mockReset();
    prismaMock.deployment.update.mockReset();
    cacheMock.get.mockReset();
    cacheMock.set.mockReset();
    cacheMock.invalidatePrefix.mockReset();

    prismaMock.deployment.findMany.mockResolvedValue([]);
    prismaMock.deployment.createMany.mockResolvedValue({ count: 1 });
    cacheMock.get.mockResolvedValue(null);
    cacheMock.set.mockResolvedValue(undefined);
    cacheMock.invalidatePrefix.mockResolvedValue(undefined);
  });

  it("scopes GitHub sync persistence by organizationId", async () => {
    const runPayload = {
      workflow_runs: [
        {
          id: 101,
          name: "CI",
          head_branch: "main",
          status: "completed",
          conclusion: "success",
          run_started_at: "2026-05-12T09:00:00.000Z",
          updated_at: "2026-05-12T09:01:00.000Z",
          html_url: "https://github.com/acme/app/actions/runs/101",
          head_sha: "abcdef1234567890",
          display_title: "test run",
          actor: { login: "devops-bot" },
        },
      ],
    };

    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => runPayload,
    })) as unknown as typeof fetch;

    await pipelinesService.syncFromGitHub(
      { userId: "u1", email: "a@x.com", role: "admin", organizationId: "org-a" },
      10,
    );
    await pipelinesService.syncFromGitHub(
      { userId: "u2", email: "b@x.com", role: "admin", organizationId: "org-b" },
      10,
    );

    expect(prismaMock.deployment.findMany.mock.calls[0]?.[0]).toEqual({
      where: { organizationId: "org-a", version: { in: ["gh-101"] } },
      select: { id: true, version: true },
    });
    expect(prismaMock.deployment.findMany.mock.calls[1]?.[0]).toEqual({
      where: { organizationId: "org-b", version: { in: ["gh-101"] } },
      select: { id: true, version: true },
    });

    expect(prismaMock.deployment.createMany.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({ organizationId: "org-a", version: "gh-101" }),
        ],
      }),
    );
    expect(prismaMock.deployment.createMany.mock.calls[1]?.[0]).toEqual(
      expect.objectContaining({
        data: [
          expect.objectContaining({ organizationId: "org-b", version: "gh-101" }),
        ],
      }),
    );
  });

  it("ignores webhook persistence when webhook org is not configured", async () => {
    const result = await pipelinesService.handleGitHubWebhook("workflow_run", {
      workflow_run: {
        id: 202,
        name: "Deploy",
        head_branch: "main",
        status: "completed",
        conclusion: "success",
      },
    });

    expect(result).toEqual({ processed: 0, ignored: true });
    expect(prismaMock.deployment.createMany).not.toHaveBeenCalled();
  });

  it("rejects sync when actor has no organization context", async () => {
    await expect(
      pipelinesService.syncFromGitHub(
        { userId: "u1", email: "a@x.com", role: "admin" },
        10,
      ),
    ).rejects.toMatchObject({ code: "ORG_REQUIRED" });
  });

  it("ignores webhook payloads from mismatched repositories", async () => {
    process.env.GITHUB_WEBHOOK_ORGANIZATION_ID = "org-a";

    const result = await pipelinesService.handleGitHubWebhook("workflow_run", {
      repository: {
        name: "another-repo",
        owner: { login: "someone-else" },
      },
      workflow_run: {
        id: 303,
        name: "Deploy",
        head_branch: "main",
        status: "completed",
        conclusion: "success",
      },
    });

    expect(result).toEqual({ processed: 0, ignored: true });
    expect(prismaMock.deployment.createMany).not.toHaveBeenCalled();
  });
});
