import { useDeferredValue, useMemo, useState } from "react";
import { MoreHorizontal, Paperclip, Phone, Search, Send, Smile, Video } from "lucide-react";
import { motion } from "framer-motion";

import PageLoader from "@/components/shared/PageLoader";
import { useConversations, useMessages } from "@/hooks/use-crm-data";
import { cn } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function MessagesPage() {
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations();
  const { data: messages = [], isLoading: messagesLoading } = useMessages();
  const [activeChat, setActiveChat] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const filteredConversations = useMemo(
    () =>
      conversations.filter((conversation) =>
        conversation.name.toLowerCase().includes(deferredSearch.toLowerCase()),
      ),
    [conversations, deferredSearch],
  );

  const activeConversation = conversations.find((conversation) => conversation.id === activeChat);
  const activeMessages = useMemo(
    () => messages.filter((message) => message.chatId === activeChat),
    [activeChat, messages],
  );

  if (conversationsLoading || messagesLoading) {
    return <PageLoader />;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">A more polished communication workspace with room for real-time backend sync later.</p>
      </motion.div>

      <motion.div
        variants={item}
        className="grid grid-cols-1 overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)_/_0.98),hsl(var(--card)_/_0.86))] shadow-card lg:grid-cols-3"
        style={{ height: "calc(100vh - 220px)" }}
      >
        <div className="border-r border-border/70 bg-secondary/18">
          <div className="border-b border-border/70 p-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Client and Team Inbox</p>
            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search people or shared channels"
                className="h-12 w-full rounded-2xl border border-border/70 bg-background/60 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="h-[calc(100%-113px)] overflow-y-auto p-3">
            {filteredConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => setActiveChat(conversation.id)}
                className={cn(
                  "mb-2 w-full rounded-[1.25rem] border p-4 text-left transition",
                  conversation.id === activeChat
                    ? "border-primary/30 bg-primary/[0.08]"
                    : "border-transparent bg-transparent hover:border-border/70 hover:bg-secondary/24",
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/18 via-accent/12 to-info/22 font-semibold text-foreground">
                      {conversation.avatar}
                    </div>
                    {conversation.online && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-success" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-foreground">{conversation.name}</p>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{conversation.time}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.lastMessage}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{conversation.team}</span>
                      {conversation.unread > 0 && (
                        <span className="rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                          {conversation.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-2 flex flex-col">
          <div className="flex items-center justify-between border-b border-border/70 p-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/18 via-accent/12 to-info/22 font-semibold text-foreground">
                  {activeConversation?.avatar}
                </div>
                {activeConversation?.online && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-success" />}
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-foreground">{activeConversation?.name}</p>
                <p className="text-xs text-muted-foreground">{activeConversation?.online ? "Live now" : "Offline"} · {activeConversation?.team}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {[Phone, Video, MoreHorizontal].map((Icon, index) => (
                <button
                  key={index}
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-secondary/28 text-muted-foreground transition hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[radial-gradient(circle_at_top,hsl(var(--info)_/_0.08),transparent_24%)] p-6">
            {activeMessages.map((message) => (
              <div key={message.id} className={cn("flex", message.isMe ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[74%] rounded-[1.5rem] px-4 py-3 shadow-card",
                    message.isMe
                      ? "rounded-br-md bg-primary text-primary-foreground"
                      : "rounded-bl-md border border-border/70 bg-card text-foreground",
                  )}
                >
                  <p className="text-sm leading-6">{message.text}</p>
                  <p className={cn("mt-2 text-[10px] uppercase tracking-[0.14em]", message.isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-border/70 p-5">
            <div className="flex items-center gap-2 rounded-[1.5rem] border border-border/70 bg-background/55 p-2">
              {[Paperclip, Smile].map((Icon, index) => (
                <button
                  key={index}
                  type="button"
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
              <input
                placeholder="Write a message with full client context in mind"
                className="h-11 flex-1 bg-transparent px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
