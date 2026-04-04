import { prisma } from "../config/prisma";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "stage_change"
  | "hire"
  | "email_sent";

export type AuditLogRecord = {
  id: string;
  userId: string;
  userName: string;
  action: AuditAction | string;
  entity: string;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
};

export type GetAuditLogsOptions = {
  limit?: number;
  offset?: number;
  search?: string;
  action?: string;
  entity?: string;
};

export type AuditLogListResult = {
  data: AuditLogRecord[];
  total: number;
  limit: number;
  offset: number;
};

export async function resolveAuditActorName(userId: string, fallback?: string) {
  if (fallback?.trim()) {
    return fallback.trim();
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });

  return user?.name ?? user?.email ?? "Unknown";
}

export async function logAudit(params: {
  userId: string;
  userName?: string;
  action: AuditAction | string;
  entity: string;
  entityId?: string | number;
  detail?: string;
}) {
  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "AuditLog" ("userId", "userName", action, entity, "entityId", detail, "createdAt") VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      params.userId,
      await resolveAuditActorName(params.userId, params.userName),
      params.action,
      params.entity,
      params.entityId ? String(params.entityId) : null,
      params.detail ?? null
    );
  } catch {
    // Never let audit logging break the main flow
  }
}

function normalizeAuditOptions(input: number | GetAuditLogsOptions): Required<GetAuditLogsOptions> {
  if (typeof input === "number") {
    return {
      limit: input,
      offset: 0,
      search: "",
      action: "",
      entity: "",
    };
  }

  return {
    limit: input.limit ?? 50,
    offset: input.offset ?? 0,
    search: input.search?.trim() ?? "",
    action: input.action?.trim() ?? "",
    entity: input.entity?.trim() ?? "",
  };
}

function buildAuditWhereClause(options: Required<GetAuditLogsOptions>, params: unknown[]) {
  const conditions: string[] = [];

  if (options.search) {
    params.push(`%${options.search}%`);
    const searchParam = `$${params.length}`;
    conditions.push(`("userName" ILIKE ${searchParam} OR action ILIKE ${searchParam} OR entity ILIKE ${searchParam} OR COALESCE(detail, '') ILIKE ${searchParam})`);
  }

  if (options.action) {
    params.push(options.action);
    conditions.push(`action = $${params.length}`);
  }

  if (options.entity) {
    params.push(options.entity);
    conditions.push(`entity = $${params.length}`);
  }

  return conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
}

export async function getAuditLogs(input: number | GetAuditLogsOptions = 50): Promise<AuditLogListResult> {
  const options = normalizeAuditOptions(input);

  try {
    const params: unknown[] = [];
    const whereClause = buildAuditWhereClause(options, params);

    const countResult = await prisma.$queryRawUnsafe<Array<{ total: bigint | number | string }>>(
      `SELECT COUNT(*)::bigint AS total FROM "AuditLog" ${whereClause}`,
      ...params,
    );

    const total = Number(countResult[0]?.total ?? 0);

    params.push(options.limit);
    const limitParam = `$${params.length}`;
    params.push(options.offset);
    const offsetParam = `$${params.length}`;

    const result = await prisma.$queryRawUnsafe<AuditLogRecord[]>(`
      SELECT id, "userId", "userName", action, entity, "entityId", detail, "createdAt" 
      FROM "AuditLog" 
      ${whereClause}
      ORDER BY "createdAt" DESC 
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `, ...params);

    return {
      data: result.map((log: any) => ({
        ...log,
        createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
      })),
      total,
      limit: options.limit,
      offset: options.offset,
    };
  } catch (e) {
    console.error("Failed to fetch audit logs:", e);
    return {
      data: [],
      total: 0,
      limit: options.limit,
      offset: options.offset,
    };
  }
}
