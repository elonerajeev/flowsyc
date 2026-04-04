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

export async function getAuditLogs(limit = 50) {
  try {
    const result = await prisma.$queryRawUnsafe<AuditLogRecord[]>(`
      SELECT id, "userId", "userName", action, entity, "entityId", detail, "createdAt" 
      FROM "AuditLog" 
      ORDER BY "createdAt" DESC 
      LIMIT $1
    `, limit);
    return result.map((log: any) => ({
      ...log,
      createdAt: log.createdAt instanceof Date ? log.createdAt.toISOString() : String(log.createdAt),
    }));
  } catch (e) {
    console.error("Failed to fetch audit logs:", e);
    return [];
  }
}
