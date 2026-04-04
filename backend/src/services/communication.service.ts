import { prisma } from "../config/prisma";
// import {
//   conversationSeedRecords,
//   messageSeedRecords,
// } from "../data/crm-static";

type ConversationRecord = {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  team: string;
};

type MessageRecord = {
  id: number;
  chatId: number;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
};

function mapConversation(conversation: {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  team: string;
}): ConversationRecord {
  return {
    id: conversation.id,
    name: conversation.name,
    avatar: conversation.avatar,
    lastMessage: conversation.lastMessage,
    time: conversation.time,
    unread: conversation.unread,
    online: conversation.online,
    team: conversation.team,
  };
}

function mapMessage(message: {
  id: number;
  conversationId: number;
  sender: string;
  text: string;
  time: string;
  isMe: boolean;
}): MessageRecord {
  return {
    id: message.id,
    chatId: message.conversationId,
    sender: message.sender,
    text: message.text,
    time: message.time,
    isMe: message.isMe,
  };
}

export const communicationService = {
  async listConversations() {
    const conversations = await prisma.conversation.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: "desc" },
    });

    if (conversations.length === 0) {
      return [];
    }

    return conversations.map(mapConversation);
  },

  async listMessages() {
    const messages = await prisma.message.findMany({
      where: { deletedAt: null },
      orderBy: [{ conversationId: "asc" }, { createdAt: "asc" }],
    });

    if (messages.length === 0) {
      return [];
    }

    return messages.map(mapMessage);
  },

  async createMessage(data: { conversationId: number; text: string; sender: string; isMe: boolean }) {
    const message = await prisma.message.create({
      data: {
        conversationId: data.conversationId,
        text: data.text,
        sender: data.sender,
        isMe: data.isMe,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        updatedAt: new Date(),
      },
    });

    // Update conversation last message and timestamp
    await prisma.conversation.update({
      where: { id: data.conversationId },
      data: {
        lastMessage: data.text,
        updatedAt: new Date(),
        time: "Just now",
      },
    });

    return mapMessage(message);
  },
};
