import http from "http";
import https from "https";
import net from "net";
import { prisma } from "../config/prisma";
import type { AccessActor } from "../utils/access-control";
import { orgFilter } from "../utils/access-control";
import { AppError } from "../middleware/error.middleware";
import { logger } from "../utils/logger";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ServiceCheckType = "http" | "tcp" | "ping";
export type ServiceStatus = "up" | "down" | "degraded" | "unknown";

export interface CreateServiceInput {
  name: string;
  url: string;
  checkType?: ServiceCheckType;
  intervalSecs?: number;
  timeoutMs?: number;
  expectedStatus?: number;
  tags?: string[];
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  isActive?: boolean;
}

// ─── Health checker ───────────────────────────────────────────────────────────

async function checkHttp(url: string, timeoutMs: number, expectedStatus: number): Promise<{ status: ServiceStatus; responseMs: number | null; statusCode: number | null; error: string | null }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const mod = url.startsWith("https") ? https : http;
    const req = mod.get(url, { timeout: timeoutMs }, (res) => {
      const responseMs = Date.now() - start;
      const statusCode = res.statusCode ?? 0;
      res.resume(); // drain
      const status: ServiceStatus = statusCode === expectedStatus ? "up" : statusCode >= 200 && statusCode < 500 ? "degraded" : "down";
      resolve({ status, responseMs, statusCode, error: null });
    });
    req.on("timeout", () => { req.destroy(); resolve({ status: "down", responseMs: null, statusCode: null, error: "Timeout" }); });
    req.on("error", (err) => resolve({ status: "down", responseMs: null, statusCode: null, error: err.message }));
  });
}

async function checkTcp(host: string, port: number, timeoutMs: number): Promise<{ status: ServiceStatus; responseMs: number | null; error: string | null }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.connect(port, host, () => {
      const responseMs = Date.now() - start;
      socket.destroy();
      resolve({ status: "up", responseMs, error: null });
    });
    socket.on("timeout", () => { socket.destroy(); resolve({ status: "down", responseMs: null, error: "Timeout" }); });
    socket.on("error", (err) => resolve({ status: "down", responseMs: null, error: err.message }));
  });
}

// ─── Service layer ────────────────────────────────────────────────────────────

export const monitoringService = {

  async list(actor: AccessActor) {
    const services = await prisma.monitoredService.findMany({
      where: { ...orgFilter(actor), deletedAt: null },
      orderBy: { createdAt: "asc" },
      include: {
        checks: {
          orderBy: { checkedAt: "desc" },
          take: 20,
          select: { status: true, responseMs: true, statusCode: true, checkedAt: true, error: true },
        },
      },
    });

    return services.map((svc) => {
      const latest = svc.checks[0] ?? null;
      return { ...svc, latestCheck: latest, recentChecks: svc.checks };
    });
  },

  async getOne(id: number, actor: AccessActor) {
    const svc = await prisma.monitoredService.findFirst({
      where: { id, ...orgFilter(actor), deletedAt: null },
      include: {
        checks: {
          orderBy: { checkedAt: "desc" },
          take: 50,
          select: { id: true, status: true, responseMs: true, statusCode: true, checkedAt: true, error: true },
        },
      },
    });
    if (!svc) throw new AppError("Service not found", 404, "NOT_FOUND");
    return svc;
  },

  async create(input: CreateServiceInput, actor: AccessActor) {
    if (actor?.role !== "admin") throw new AppError("Admin only", 403, "FORBIDDEN");
    return prisma.monitoredService.create({
      data: {
        name: input.name.trim(),
        url: input.url.trim(),
        checkType: input.checkType ?? "http",
        intervalSecs: input.intervalSecs ?? 30,
        timeoutMs: input.timeoutMs ?? 5000,
        expectedStatus: input.expectedStatus ?? 200,
        tags: input.tags ?? [],
        organizationId: actor.organizationId ?? null,
        createdBy: actor.userId ?? actor.email,
        updatedAt: new Date(),
      },
    });
  },

  async update(id: number, input: UpdateServiceInput, actor: AccessActor) {
    if (actor?.role !== "admin") throw new AppError("Admin only", 403, "FORBIDDEN");
    const existing = await prisma.monitoredService.findFirst({ where: { id, ...orgFilter(actor), deletedAt: null } });
    if (!existing) throw new AppError("Service not found", 404, "NOT_FOUND");
    return prisma.monitoredService.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.url !== undefined && { url: input.url.trim() }),
        ...(input.checkType !== undefined && { checkType: input.checkType }),
        ...(input.intervalSecs !== undefined && { intervalSecs: input.intervalSecs }),
        ...(input.timeoutMs !== undefined && { timeoutMs: input.timeoutMs }),
        ...(input.expectedStatus !== undefined && { expectedStatus: input.expectedStatus }),
        ...(input.tags !== undefined && { tags: input.tags }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        updatedAt: new Date(),
      },
    });
  },

  async remove(id: number, actor: AccessActor) {
    if (actor?.role !== "admin") throw new AppError("Admin only", 403, "FORBIDDEN");
    const existing = await prisma.monitoredService.findFirst({ where: { id, ...orgFilter(actor), deletedAt: null } });
    if (!existing) throw new AppError("Service not found", 404, "NOT_FOUND");
    return prisma.monitoredService.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  // Run a single health check and persist result
  async runCheck(serviceId: number): Promise<void> {
    const svc = await prisma.monitoredService.findUnique({ where: { id: serviceId } });
    if (!svc || !svc.isActive || svc.deletedAt) return;

    let result: { status: ServiceStatus; responseMs: number | null; statusCode?: number | null; error: string | null };

    try {
      if (svc.checkType === "http") {
        result = await checkHttp(svc.url, svc.timeoutMs, svc.expectedStatus ?? 200);
      } else if (svc.checkType === "tcp") {
        const [host, portStr] = svc.url.replace(/^tcp:\/\//, "").split(":");
        result = { ...(await checkTcp(host, parseInt(portStr ?? "80"), svc.timeoutMs)), statusCode: null };
      } else {
        result = { status: "unknown", responseMs: null, statusCode: null, error: "ping not supported server-side" };
      }
    } catch (err) {
      result = { status: "down", responseMs: null, statusCode: null, error: String(err) };
    }

    await prisma.serviceCheck.create({
      data: {
        serviceId,
        status: result.status,
        responseMs: result.responseMs,
        statusCode: result.statusCode ?? null,
        error: result.error,
      },
    });

    // Prune old checks — keep last 500 per service
    const oldest = await prisma.serviceCheck.findMany({
      where: { serviceId },
      orderBy: { checkedAt: "desc" },
      skip: 500,
      select: { id: true },
    });
    if (oldest.length > 0) {
      await prisma.serviceCheck.deleteMany({ where: { id: { in: oldest.map((c) => c.id) } } });
    }
  },

  // Run checks for all active services (called by cron)
  async runAllChecks(): Promise<void> {
    const services = await prisma.monitoredService.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true },
    });
    await Promise.allSettled(services.map((s) => this.runCheck(s.id)));
    logger.debug(`[HealthChecker] Checked ${services.length} services`);
  },

  // Uptime % over last 24h
  async getUptimeStats(serviceId: number): Promise<{ uptime: number; totalChecks: number; avgResponseMs: number | null }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const checks = await prisma.serviceCheck.findMany({
      where: { serviceId, checkedAt: { gte: since } },
      select: { status: true, responseMs: true },
    });
    if (checks.length === 0) return { uptime: 0, totalChecks: 0, avgResponseMs: null };
    const up = checks.filter((c) => c.status === "up").length;
    const withMs = checks.filter((c) => c.responseMs !== null);
    const avgResponseMs = withMs.length > 0 ? Math.round(withMs.reduce((s, c) => s + (c.responseMs ?? 0), 0) / withMs.length) : null;
    return { uptime: Math.round((up / checks.length) * 1000) / 10, totalChecks: checks.length, avgResponseMs };
  },
};
