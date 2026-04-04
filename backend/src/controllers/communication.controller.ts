import type { Request, Response } from "express";

import { communicationService } from "../services/communication.service";

export const communicationController = {
  listConversations: async (_req: Request, res: Response): Promise<void> => {
    const conversations = await communicationService.listConversations();
    res.status(200).json(conversations);
  },

  listMessages: async (_req: Request, res: Response): Promise<void> => {
    const messages = await communicationService.listMessages();
    res.status(200).json(messages);
  },

  sendMessage: async (req: Request, res: Response): Promise<void> => {
    const { conversationId, text, sender, isMe } = req.body;
    const message = await communicationService.createMessage({
      conversationId: Number(conversationId),
      text,
      sender,
      isMe: Boolean(isMe),
    });
    res.status(201).json(message);
  },
};
