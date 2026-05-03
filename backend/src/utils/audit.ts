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
  userId?: string;
  role?: string;
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
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

const AUDIT_RETENTION_DAYS = 7;

function retentionCutoff(): Date {
  const d = new Date();
  d.setDate(d.getDate() - AUDIT_RETENTION_DAYS);
  return d;
}

export async function purgeOldAuditLogs() {
  await prisma.auditLog.deleteMany({ where: { createdAt: { lt: retentionCutoff() } } });
}

export async function logAudit(params: {
  userId: string;
  userName?: string;
  action: AuditAction | string;
  entity: string;
  entityId?: string | number;
  detail?: string;
  organizationId?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: await resolveAuditActorName(params.userId, params.userName),
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ? String(params.entityId) : null,
        detail: params.detail ?? null,
        organizationId: params.organizationId ?? null,
      },
    });
    // Purge old logs — fire-and-forget, never blocks the caller
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: retentionCutoff() } } }).catch(() => {});
  } catch {
    // Never let audit logging break the main flow
  }
}

function normalizeAuditOptions(input: number | GetAuditLogsOptions): GetAuditLogsOptions & { limit: number; offset: number; search: string; action: string; entity: string } {
  if (typeof input === "number") {
    return {
      limit: input,
      offset: 0,
      search: "",
      action: "",
      entity: "",
      userId: undefined,
      role: undefined,
    };
  }

  return {
    limit: input.limit ?? 50,
    offset: input.offset ?? 0,
    search: input.search?.trim() ?? "",
    action: input.action?.trim() ?? "",
    entity: input.entity?.trim() ?? "",
    userId: input.userId,
    role: input.role,
    organizationId: input.organizationId,
  };
}

function buildAuditWhereClause(options: GetAuditLogsOptions & { search: string; action: string; entity: string }, params: unknown[]) {
  const conditions: string[] = [];

  // Always restrict to retention window
  params.push(retentionCutoff().toISOString());
  conditions.push(`"createdAt" >= $${params.length}::timestamptz`);

  // Org-level isolation: filter by organizationId when available
  if (options.organizationId) {
    params.push(options.organizationId);
    conditions.push(`"organizationId" = $${params.length}`);
  }

  if (options.role === "employee" && options.userId) {
    params.push(options.userId);
    conditions.push(`"userId" = $${params.length}`);
  }

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

  if (options.dateFrom) {
    params.push(options.dateFrom);
    conditions.push(`"createdAt" >= $${params.length}::timestamptz`);
  }

  if (options.dateTo) {
    params.push(options.dateTo);
    conditions.push(`"createdAt" <= $${params.length}::timestamptz`);
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
