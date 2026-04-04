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
    const client = await clientsService.create(req.body);
    if (req.auth) {
      await logAudit({ userId: req.auth.userId, userName: await getActorName(req.auth.userId), action: "create", entity: "Client", entityId: client.id, detail: `Created: ${client.name}` });
    }
    res.status(201).json(client);
  },

  update: async (req: Request, res: Response): Promise<void> => {
    const clientId = readClientId(req);
    const client = await clientsService.update(clientId, req.body);
    if (req.auth) {
      await logAudit({ userId: req.auth.userId, userName: await getActorName(req.auth.userId), action: "update", entity: "Client", entityId: clientId, detail: `Updated: ${client.name}` });
    }
    res.status(200).json(client);
  },

  remove: async (req: Request, res: Response): Promise<void> => {
    const clientId = readClientId(req);
    await clientsService.delete(clientId);
    if (req.auth) {
      await logAudit({ userId: req.auth.userId, userName: await getActorName(req.auth.userId), action: "delete", entity: "Client", entityId: clientId, detail: `Deleted client #${clientId}` });
    }
    res.status(200).json({ message: "Client deleted successfully" });
  },

  getPipeline: async (req: Request, res: Response): Promise<void> => {
    const pipeline = await clientsService.getPipeline(req.auth);
    res.status(200).json(pipeline);
  },
};
