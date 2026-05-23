import crypto from "crypto";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { awsInfraService } from "./aws-infra.service";
import { getIO } from "../socket";
import type { AccessActor } from "../utils/access-control";
import { orgFilter } from "../utils/access-control";

type SourceLogEntry = {
  level: string;
  message: string;
  timestamp: string;
  sourceId: number;
};

type LogSourceAuthType = "api_key" | "bearer" | "custom_header";

type AuthHeaderMap = Record<string, string | string[] | undefined>;

type SourceReadModel = {
  id: number;
  name: string;
  provider: string;
  environment: string;
  endpoint: string | null;
  authType: string;
  authConfig: unknown;
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastIngestAt: Date | null;
};

const MAX_BUFFER_PER_SOURCE = 1200;
const sourceLogBuffers = new Map<number, SourceLogEntry[]>();

function parsePositiveInt(value: string, label: string) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(`Invalid ${label}`, 400, "VALIDATION_ERROR");
  }
  return parsed;
}

function hashIngestKey(key: string) {
  return crypto.createHash("sha256").update(key, "utf8").digest("hex");
}

function generateIngestKey() {
  return crypto.randomBytes(24).toString("hex");
}

function safeCompareHex(expectedHex: string, providedHex: string): boolean {
  const expected = Buffer.from(expectedHex, "hex");
  const provided = Buffer.from(providedHex, "hex");
  if (expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(expected, provided);
}

function appendSourceLogs(sourceId: number, entries: SourceLogEntry[]) {
  const previous = sourceLogBuffers.get(sourceId) ?? [];
  const combined = [...previous, ...entries];
  sourceLogBuffers.set(sourceId, combined.slice(-MAX_BUFFER_PER_SOURCE));
}

function readHeaderValue(headers: AuthHeaderMap, headerName: string) {
  const raw = headers[headerName.toLowerCase()];
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw) && raw.length > 0) return String(raw[0] ?? "").trim();
  return "";
}

function normalizeAuthType(value: string): LogSourceAuthType {
  if (value === "bearer" || value === "custom_header") return value;
  return "api_key";
}

function parseAuthConfig(authConfig: unknown): Record<string, string> {
  if (!authConfig || typeof authConfig !== "object" || Array.isArray(authConfig)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(authConfig)) {
    if (typeof value !== "string") continue;
    const normalizedKey = key.trim();
    const normalizedValue = value.trim();
    if (!normalizedKey || !normalizedValue) continue;
    result[normalizedKey] = normalizedValue;
  }

  return result;
}

function sanitizeSourceForRead(source: SourceReadModel) {
  const parsedAuthConfig = parseAuthConfig(source.authConfig);
  const authConfig: Record<string, string> = {};

  if (parsedAuthConfig.headerName) {
    authConfig.headerName = parsedAuthConfig.headerName;
  }
  if (parsedAuthConfig.tokenPrefix) {
    authConfig.tokenPrefix = parsedAuthConfig.tokenPrefix;
  }
  if (parsedAuthConfig.region) {
    authConfig.region = parsedAuthConfig.region;
  }
  if (parsedAuthConfig.roleArn) {
    authConfig.roleArn = parsedAuthConfig.roleArn;
  }
  if (parsedAuthConfig.externalId) {
    authConfig.externalId = parsedAuthConfig.externalId;
  }
  if (parsedAuthConfig.logGroupName) {
    authConfig.logGroupName = parsedAuthConfig.logGroupName;
  }
  if (parsedAuthConfig.logStreamPrefix) {
    authConfig.logStreamPrefix = parsedAuthConfig.logStreamPrefix;
  }
  if (parsedAuthConfig.lookbackMinutes) {
    authConfig.lookbackMinutes = parsedAuthConfig.lookbackMinutes;
  }

  return {
    id: source.id,
    name: source.name,
    provider: source.provider,
    environment: source.environment,
    endpoint: source.endpoint,
    authType: normalizeAuthType(source.authType),
    authConfig,
    isActive: source.isActive,
    createdBy: source.createdBy,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    lastIngestAt: source.lastIngestAt,
  };
}

function extractIngestKeyForSource(source: { authType: string; authConfig: unknown }, headers: AuthHeaderMap) {
  const authType = normalizeAuthType(source.authType);
  const authConfig = parseAuthConfig(source.authConfig);

  if (authType === "bearer") {
    const authHeader = readHeaderValue(headers, "authorization");
    const prefix = authConfig.tokenPrefix?.trim() || "Bearer";
    const normalizedPrefix = `${prefix.toLowerCase()} `;
    if (authHeader.toLowerCase().startsWith(normalizedPrefix)) {
      const token = authHeader.slice(prefix.length + 1).trim();
      if (token) return token;
    }
    return "";
  }

  const configuredHeader = authConfig.headerName?.toLowerCase().trim();
  const headerName = configuredHeader || "x-log-source-key";
  return readHeaderValue(headers, headerName);
}

function emitSourceLogBatch(sourceId: number, entries: SourceLogEntry[]) {
  const io = getIO();
  if (!io || entries.length === 0) return;

  io.to(`devops:logs:${sourceId}`).emit("devops:source-log-batch", {
    sourceId,
    entries,
  });
}

export const devopsLogSourcesService = {
  parsePositiveInt,

  async list(actor: AccessActor) {
    if (!actor) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

    const rows = await prisma.devOpsLogSource.findMany({
      where: {
        ...orgFilter(actor),
        deletedAt: null,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        provider: true,
        environment: true,
        endpoint: true,
        authType: true,
        authConfig: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        lastIngestAt: true,
      },
    });

    return rows.map((row) => sanitizeSourceForRead(row));
  },

  async create(
    actor: AccessActor,
    input: {
      name: string;
      provider: string;
      environment: string;
      endpoint?: string;
      authType: LogSourceAuthType;
      authConfig?: Record<string, string>;
      isActive: boolean;
    },
  ) {
    if (!actor || actor.role !== "admin") {
      throw new AppError("Admin only", 403, "FORBIDDEN");
    }

    const ingestKey = generateIngestKey();
    const source = await prisma.devOpsLogSource.create({
      data: {
        organizationId: actor.organizationId ?? null,
        name: input.name,
        provider: input.provider,
        environment: input.environment,
        endpoint: input.endpoint ?? null,
        authType: input.authType,
        authConfig: input.authConfig ?? {},
        ingestKeyHash: hashIngestKey(ingestKey),
        isActive: input.isActive,
        createdBy: actor.userId ?? actor.email,
      },
      select: {
        id: true,
        name: true,
        provider: true,
        environment: true,
        endpoint: true,
        authType: true,
        authConfig: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        lastIngestAt: true,
      },
    });

    return {
      source: sanitizeSourceForRead(source),
      ingestKey,
    };
  },

  async update(
    actor: AccessActor,
    id: number,
    input: {
      name?: string;
      provider?: string;
      environment?: string;
      endpoint?: string;
      authType?: LogSourceAuthType;
      authConfig?: Record<string, string>;
      isActive?: boolean;
    },
  ) {
    if (!actor || actor.role !== "admin") {
      throw new AppError("Admin only", 403, "FORBIDDEN");
    }

    const existing = await prisma.devOpsLogSource.findFirst({
      where: {
        id,
        ...orgFilter(actor),
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!existing) throw new AppError("Log source not found", 404, "NOT_FOUND");

    const updated = await prisma.devOpsLogSource.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.provider !== undefined && { provider: input.provider }),
        ...(input.environment !== undefined && { environment: input.environment }),
        ...(input.endpoint !== undefined && { endpoint: input.endpoint }),
        ...(input.authType !== undefined && { authType: input.authType }),
        ...(input.authConfig !== undefined && { authConfig: input.authConfig }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        provider: true,
        environment: true,
        endpoint: true,
        authType: true,
        authConfig: true,
        isActive: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        lastIngestAt: true,
      },
    });

    return sanitizeSourceForRead(updated);
  },

  async regenerateKey(actor: AccessActor, id: number) {
    if (!actor || actor.role !== "admin") {
      throw new AppError("Admin only", 403, "FORBIDDEN");
    }

    const existing = await prisma.devOpsLogSource.findFirst({
      where: {
        id,
        ...orgFilter(actor),
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!existing) throw new AppError("Log source not found", 404, "NOT_FOUND");

    const ingestKey = generateIngestKey();
    await prisma.devOpsLogSource.update({
      where: { id },
      data: {
        ingestKeyHash: hashIngestKey(ingestKey),
        updatedAt: new Date(),
      },
    });
    return { ingestKey };
  },

  async remove(actor: AccessActor, id: number) {
    if (!actor || actor.role !== "admin") {
      throw new AppError("Admin only", 403, "FORBIDDEN");
    }

    const existing = await prisma.devOpsLogSource.findFirst({
      where: {
        id,
        ...orgFilter(actor),
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!existing) throw new AppError("Log source not found", 404, "NOT_FOUND");

    await prisma.devOpsLogSource.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
        updatedAt: new Date(),
      },
    });

    sourceLogBuffers.delete(id);
  },

  async getRecentLogs(actor: AccessActor, sourceId: number, limit: number) {
    if (!actor) throw new AppError("Unauthorized", 401, "UNAUTHORIZED");

    const source = await prisma.devOpsLogSource.findFirst({
      where: {
        id: sourceId,
        ...orgFilter(actor),
        deletedAt: null,
      },
      select: {
        id: true,
        provider: true,
        authConfig: true,
      },
    });
    if (!source) throw new AppError("Log source not found", 404, "NOT_FOUND");

    if (source.provider === "aws-cloudwatch") {
      const cloudwatchConfig = awsInfraService.parseCloudWatchSourceConfig(source.authConfig);
      if (!cloudwatchConfig) {
        throw new AppError(
          "CloudWatch source config is incomplete. Add region, roleArn and logGroupName.",
          400,
          "CLOUDWATCH_CONFIG_INVALID",
        );
      }

      try {
        const remoteLogs = await awsInfraService.fetchCloudWatchLogs(cloudwatchConfig, limit);
        return remoteLogs.map((entry) => ({
          sourceId,
          level: entry.level,
          message: entry.message,
          timestamp: entry.timestamp,
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const isNetwork = (err as any)?.code === "ENOTFOUND" || msg.includes("ENOTFOUND");
        const isAuth = msg.includes("AccessDenied") || msg.includes("not authorized");
        throw new AppError(
          isNetwork
            ? `Cannot reach AWS — check the region (got: ${cloudwatchConfig.region})`
            : isAuth
            ? "Access denied — ensure the IAM role allows CloudWatch:GetLogEvents and sts:AssumeRole"
            : `CloudWatch error: ${msg}`,
          503,
          "CLOUDWATCH_FETCH_FAILED",
        );
      }
    }

    const buffer = sourceLogBuffers.get(sourceId) ?? [];
    return buffer.slice(-limit);
  },

  async ingest(
    sourceId: number,
    headers: AuthHeaderMap,
    entries: Array<{ level: string; message: string; timestamp?: string }>,
  ) {
    const source = await prisma.devOpsLogSource.findFirst({
      where: {
        id: sourceId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        authType: true,
        authConfig: true,
        ingestKeyHash: true,
      },
    });
    if (!source) throw new AppError("Log source not found", 404, "NOT_FOUND");

    const ingestKey = extractIngestKeyForSource(source, headers);
    if (!ingestKey) {
      throw new AppError("Missing ingest key", 401, "UNAUTHORIZED");
    }

    const providedHash = hashIngestKey(ingestKey);
    if (!safeCompareHex(source.ingestKeyHash, providedHash)) {
      throw new AppError("Invalid ingest key", 401, "UNAUTHORIZED");
    }

    const normalized: SourceLogEntry[] = entries.map((entry) => ({
      sourceId,
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp ?? new Date().toISOString(),
    }));

    appendSourceLogs(sourceId, normalized);
    emitSourceLogBatch(sourceId, normalized);

    await prisma.devOpsLogSource.update({
      where: { id: sourceId },
      data: { lastIngestAt: new Date(), updatedAt: new Date() },
      select: { id: true },
    });

    return {
      sourceId,
      entries: normalized,
    };
  },
};
