import { useDeferredValue, useMemo, useState } from "react";
import { Construction, MessageSquare, Search, Users, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useConversations, useMessages, useTeamMembers, crmKeys } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

type ChatTarget =
  | { kind: "conversation"; id: number }
  | { kind: "member"; id: number };

export default function MessagesPage() {
  const { role } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canSeeTeamDirectory = role === "admin" || role === "manager";
  const { data: conversations = [], isLoading: convLoading, error: convError, refetch: refetchConv } = useConversations();
  const { data: messages = [], isLoading: msgLoading, error: msgError, refetch: refetchMsg } = useMessages();
  const { data: teamMembers = [], isLoading: membersLoading } = useTeamMembers({ enabled: canSeeTeamDirectory });

  const [activeTarget, setActiveTarget] = useState<ChatTarget>({ kind: "conversation", id: 1 });
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const deferredSearch = useDeferredValue(search);

  const sendMessageMutation = useMutation({
    mutationFn: (data: { conversationId: number; text: string; sender: string; isMe: boolean }) =>
      crmService.sendMessage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.messages });
      queryClient.invalidateQueries({ queryKey: crmKeys.conversations });
      setMessageText("");
    },
    onError: () => toast.error("Failed to send message"),
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || activeTarget.kind !== "conversation") return;

    sendMessageMutation.mutate({
      conversationId: activeTarget.id,
      text: messageText.trim(),
      sender: user?.name || "Me",
      isMe: true,
    });
  };

  const filteredConversations = useMemo(
    () => conversations.filter(c => c.name.toLowerCase().includes(deferredSearch.toLowerCase())),
    [conversations, deferredSearch],
  );

  const filteredMembers = useMemo(
    () => teamMembers.filter(m => m.name.toLowerCase().includes(deferredSearch.toLowerCase())),
    [teamMembers, deferredSearch],
  );

  const activeConversation = activeTarget.kind === "conversation"
    ? conversations.find(c => c.id === activeTarget.id)
    : null;

  const activeMember = activeTarget.kind === "member"
    ? teamMembers.find(m => m.id === activeTarget.id)
    : null;

  const activeMessages = useMemo(
    () => activeTarget.kind === "conversation"
      ? messages.filter(m => m.chatId === activeTarget.id)
      : [],
    [activeTarget, messages],
  );

  if (convLoading || msgLoading || (canSeeTeamDirectory && membersLoading)) return <PageLoader />;
  if (convError || msgError) {
    return (
      <ErrorFallback
        title="Messages failed to load"
        error={convError ?? msgError}
        onRetry={() => Promise.all([refetchConv(), refetchMsg()])}
        retryLabel="Retry"
      />
    );
  }

  const activeLabel = activeConversation?.name ?? activeMember?.name ?? "Select a chat";
  const activeAvatar = activeConversation?.avatar ?? activeMember?.avatar ?? "?";
  const activeOnline = activeConversation?.online ?? (activeMember?.attendance === "present" || activeMember?.attendance === "remote");
  const activeTeam = activeConversation?.team ?? activeMember?.team ?? "";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      <motion.div variants={item}>
        <h1 className="font-display text-3xl font-semibold text-foreground">Messages</h1>
        <p className="text-sm text-muted-foreground">Team inbox and direct messages.</p>
      </motion.div>

      <motion.div
        variants={item}
        className="grid grid-cols-1 overflow-hidden rounded-[1.5rem] border border-border/70 bg-card shadow-card lg:grid-cols-[280px_1fr]"
        style={{ height: "calc(100vh - 200px)" }}
      >
        {/* Left panel */}
        <div className="flex flex-col border-r border-border/70 bg-secondary/10 min-h-0">
          {/* Search */}
          <div className="flex-shrink-0 border-b border-border/60 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-10 w-full rounded-xl border border-border/60 bg-background/60 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-4">
            {/* Conversations from DB */}
            {filteredConversations.length > 0 && (
              <div>
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Conversations</p>
                <div className="space-y-1">
                  {filteredConversations.map(conv => {
                    const isActive = activeTarget.kind === "conversation" && activeTarget.id === conv.id;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => setActiveTarget({ kind: "conversation", id: conv.id })}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                          isActive ? "border-primary/30 bg-primary/8" : "border-transparent hover:bg-secondary/40"
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-foreground">{conv.avatar}</div>
                          {conv.online && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-foreground truncate">{conv.name}</p>
                            <span className="text-[10px] text-muted-foreground flex-shrink-0">{conv.time}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{conv.lastMessage}</p>
                        </div>
                        {conv.unread > 0 && (
                          <span className="flex-shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{conv.unread}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Team members from DB */}
            {canSeeTeamDirectory && filteredMembers.length > 0 && (
              <div>
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Team Members
                </p>
                <div className="space-y-1">
                  {filteredMembers.map(member => {
                    const isActive = activeTarget.kind === "member" && activeTarget.id === member.id;
                    const isOnline = member.attendance === "present" || member.attendance === "remote";
                    return (
                      <button
                        key={member.id}
                        onClick={() => setActiveTarget({ kind: "member", id: member.id })}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition",
                          isActive ? "border-primary/30 bg-primary/8" : "border-transparent hover:bg-secondary/40"
                        )}
                      >
                        <div className="relative flex-shrink-0">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/60 text-sm font-bold text-foreground">{member.avatar}</div>
                          {isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground truncate">{member.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{member.designation} · {member.team}</p>
                        </div>
                        <span className={cn(
                          "flex-shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold capitalize",
                          member.attendance === "present" ? "border-success/20 bg-success/10 text-success" :
                          member.attendance === "remote" ? "border-info/20 bg-info/10 text-info" :
                          "border-border/40 bg-secondary/20 text-muted-foreground"
                        )}>{member.attendance}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {filteredConversations.length === 0 && filteredMembers.length === 0 && (
              <div className="py-8 text-center">
                <MessageSquare className="mx-auto mb-2 h-6 w-6 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No results</p>
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border/60 p-4">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-foreground">{activeAvatar}</div>
              {activeOnline && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />}
            </div>
            <div>
              <p className="font-semibold text-foreground">{activeLabel}</p>
              <p className="text-xs text-muted-foreground">
                {activeOnline ? "Online" : "Offline"}{activeTeam ? ` · ${activeTeam}` : ""}
              </p>
            </div>
          </div>

          {/* Chat area */}
          {activeTarget.kind === "member" ? (
            /* Coming soon for direct member messages */
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-warning/30 bg-warning/10">
                <Construction className="h-8 w-8 text-warning" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-foreground">Direct messaging coming soon</p>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Real-time direct messages with <strong>{activeMember?.name}</strong> are in development.
                  This will support live chat, file sharing, and message history.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {["Real-time chat", "File sharing", "Message history", "Read receipts"].map(f => (
                  <span key={f} className="rounded-full border border-border/50 bg-secondary/30 px-3 py-1">{f}</span>
                ))}
              </div>
              <span className="rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">Q3 2026</span>
            </div>
          ) : (
            /* Real conversation messages */
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {activeMessages.length > 0 ? (
                  activeMessages.map(msg => (
                    <div key={msg.id} className={cn("flex", msg.isMe ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[72%] rounded-[1.25rem] px-4 py-2.5",
                        msg.isMe
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md border border-border/60 bg-secondary/20 text-foreground"
                      )}>
                        <p className="text-sm leading-6">{msg.text}</p>
                        <p className={cn("mt-1 text-[10px]", msg.isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>{msg.time}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-muted-foreground">No messages yet in this conversation.</p>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border/60 p-4 bg-background/50">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 h-11 rounded-xl border border-border/60 bg-background/80 px-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition"
                    disabled={sendMessageMutation.isPending}
                  />
                  <button
                    type="submit"
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:grayscale"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
