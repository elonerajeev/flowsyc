import type { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../middleware/error.middleware";
import { clientsService } from "../services/clients.service";
import { logAudit } from "../utils/audit";
import { clientQuerySchema } from "../validators/client.schema";

async function getActorName(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  return user?.name ?? "Unknown";
}

function readClientId(request: Request) {
  const clientId = Number(request.params.id);
  if (!Number.isInteger(clientId) || clientId <= 0) {
    throw new AppError("Invalid client id", 400, "BAD_REQUEST");
  }
  return clientId;
}

export const clientsController = {
  list: async (req: Request, res: Response): Promise<void> => {
    const parsed = clientQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: parsed.error.flatten(),
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const clients = await clientsService.list(parsed.data, req.auth);
    res.status(200).json(clients);
  },

  getOne: async (req: Request, res: Response): Promise<void> => {
    const clientId = readClientId(req);
    const client = await clientsService.getById(clientId, req.auth);
    res.status(200).json(client);
  },

  create: async (req: Request, res: Response): Promise<void> => {
    // Auto-assign to creator if assignedTo not explicitly set
    const body = req.auth && !req.body.assignedTo
      ? { ...req.body, assignedTo: req.auth.email }
      : req.body;
    const client = await clientsService.create(body, req.auth);
    if (req.auth) {
      await logAudit({ userId: req.auth.userId, organizationId: req.auth?.organizationId, userName: await getActorName(req.auth.userId), action: "create", entity: "Client", entityId: client.id, detail: `Created: ${client.name}` });

      // Trigger Zapier webhook for new_client event
      const { systemService } = await import("../services/system.service");
      const zapierConfig = await systemService.getZapierIntegration(req.auth.userId, "new_client");
      if (zapierConfig) {
        systemService.sendZapierEvent(zapierConfig.webhookUrl, "new_client", {
          client: {
            id: client.id,
            name: client.name,
            email: client.email,
            company: client.company,
            industry: client.industry,
            status: client.status,
            tier: client.tier,
          },
          user: {
            id: req.auth.userId,
            role: req.auth.role,
          },
        });
      }
    }
    res.status(201).json(client);
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const clientId = readClientId(req);
    const client = await clientsService.update(clientId, req.body, req.auth);
    if (req.auth) {
      await logAudit({ userId: req.auth.userId, organizationId: req.auth?.organizationId, userName: await getActorName(req.auth.userId), action: "update", entity: "Client", entityId: clientId, detail: `Updated: ${client.name}` });
    }
    res.status(200).json(client);
  },

  remove: async (req: Request, res: Response): Promise<void> => {
    const clientId = readClientId(req);
    await clientsService.delete(clientId, req.auth);
    if (req.auth) {
      await logAudit({ userId: req.auth.userId, organizationId: req.auth?.organizationId, userName: await getActorName(req.auth.userId), action: "delete", entity: "Client", entityId: clientId, detail: `Deleted client #${clientId}` });
    }
    res.status(200).json({ message: "Client deleted successfully" });
  },

  getPipeline: async (req: Request, res: Response): Promise<void> => {
    const pipeline = await clientsService.getPipeline(req.auth);
    res.status(200).json(pipeline);
  },
};
