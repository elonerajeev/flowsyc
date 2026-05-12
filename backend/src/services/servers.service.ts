import net from "net";
import { prisma } from "../config/prisma";
import type { AccessActor } from "../utils/access-control";
import { orgFilter } from "../utils/access-control";
import { AppError } from "../middleware/error.middleware";

export interface CreateServerInput {
  name: string;
  ip: string;
  port?: number;
  provider?: string;
  region?: string;
  tags?: string[];
}

export interface UpdateServerInput extends Partial<CreateServerInput> {
  isActive?: boolean;
}

// TCP ping to check if server port is reachable
async function tcpPing(host: string, port: number, timeoutMs = 5000): Promise<{ reachable: boolean; responseMs: number | null }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket.connect(port, host, () => {
      socket.destroy();
      resolve({ reachable: true, responseMs: Date.now() - start });
    });
    socket.on("timeout", () => { socket.destroy(); resolve({ reachable: false, responseMs: null }); });
    socket.on("error", () => resolve({ reachable: false, responseMs: null }));
  });
}

export const serversService = {
  async list(actor: AccessActor) {
    return prisma.monitoredServer.findMany({
      where: { ...orgFilter(actor), deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  },

  async create(input: CreateServerInput, actor: AccessActor) {
    if (actor?.role !== "admin") throw new AppError("Admin only", 403, "FORBIDDEN");
    return prisma.monitoredServer.create({
      data: {
        name: input.name.trim(),
        ip: input.ip.trim(),
        port: input.port ?? 22,
        provider: input.provider?.trim() ?? null,
        region: input.region?.trim() ?? null,
        tags: input.tags ?? [],
        organizationId: actor.organizationId ?? null,
        createdBy: actor.userId ?? actor.email,
        updatedAt: new Date(),
      },
    });
  },

  async update(id: number, input: UpdateServerInput, actor: AccessActor) {
    if (actor?.role !== "admin") throw new AppError("Admin only", 403, "FORBIDDEN");
    const existing = await prisma.monitoredServer.findFirst({ where: { id, ...orgFilter(actor), deletedAt: null } });
    if (!existing) throw new AppError("Server not found", 404, "NOT_FOUND");
    return prisma.monitoredServer.update({
      where: { id },
      data: {
        ...(input.name     !== undefined && { name: input.name.trim() }),
        ...(input.ip       !== undefined && { ip: input.ip.trim() }),
        ...(input.port     !== undefined && { port: input.port }),
        ...(input.provider !== undefined && { provider: input.provider?.trim() ?? null }),
        ...(input.region   !== undefined && { region: input.region?.trim() ?? null }),
        ...(input.tags     !== undefined && { tags: input.tags }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
        updatedAt: new Date(),
      },
    });
  },

  async remove(id: number, actor: AccessActor) {
    if (actor?.role !== "admin") throw new AppError("Admin only", 403, "FORBIDDEN");
    const existing = await prisma.monitoredServer.findFirst({ where: { id, ...orgFilter(actor), deletedAt: null } });
    if (!existing) throw new AppError("Server not found", 404, "NOT_FOUND");
    return prisma.monitoredServer.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  // Ping the server's port and return reachability
  async ping(id: number, actor: AccessActor) {
    const server = await prisma.monitoredServer.findFirst({ where: { id, ...orgFilter(actor), deletedAt: null } });
    if (!server) throw new AppError("Server not found", 404, "NOT_FOUND");
    const result = await tcpPing(server.ip, server.port);
    return { ...result, ip: server.ip, port: server.port };
  },
};
