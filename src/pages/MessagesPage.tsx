import { motion } from "framer-motion";
import { useState } from "react";
import { Search, Send, Paperclip, Smile, Phone, Video, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const conversations = [
  { id: 1, name: "Sarah Johnson", avatar: "SJ", lastMessage: "The client approved the proposal! 🎉", time: "2m", unread: 2, online: true },
  { id: 2, name: "Mike Chen", avatar: "MC", lastMessage: "Can you review the API docs?", time: "15m", unread: 1, online: true },
  { id: 3, name: "Lisa Park", avatar: "LP", lastMessage: "Design files uploaded to Figma", time: "1h", unread: 0, online: false },
  { id: 4, name: "Emily Davis", avatar: "ED", lastMessage: "Meeting notes from yesterday", time: "3h", unread: 0, online: true },
  { id: 5, name: "James Wilson", avatar: "JW", lastMessage: "New ticket assigned #1847", time: "5h", unread: 0, online: false },
  { id: 6, name: "Team General", avatar: "TG", lastMessage: "Emily: Let's sync up tomorrow", time: "6h", unread: 0, online: false },
];

const messages = [
  { id: 1, sender: "Sarah Johnson", text: "Hey John! Just got off the call with Acme Corp.", time: "10:30 AM", isMe: false },
  { id: 2, sender: "Me", text: "How did it go? Were they interested in the enterprise plan?", time: "10:32 AM", isMe: true },
  { id: 3, sender: "Sarah Johnson", text: "Yes! They loved the demo 🚀 They want to proceed with the annual contract.", time: "10:33 AM", isMe: false },
  { id: 4, sender: "Sarah Johnson", text: "The client approved the proposal! 🎉", time: "10:35 AM", isMe: false },
  { id: 5, sender: "Me", text: "That's amazing! Great work Sarah 👏", time: "10:36 AM", isMe: true },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.03 } } };
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export default function MessagesPage() {
  const [activeChat, setActiveChat] = useState(1);
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const active = conversations.find((c) => c.id === activeChat);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">Messages 💬</h1>
        <p className="text-sm text-muted-foreground mt-1">Stay connected with your team</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-2xl border border-border bg-card/80 backdrop-blur-sm shadow-card overflow-hidden" style={{ height: "calc(100vh - 220px)" }}>
        {/* Conversation List */}
        <div className="border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations..." className="h-9 w-full rounded-lg border border-input bg-secondary/40 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveChat(c.id)}
                className={cn("w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/40 transition-colors border-b border-border", c.id === activeChat && "bg-primary/[0.06]")}
              >
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-foreground">{c.avatar}</div>
                  {c.online && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground truncate">{c.name}</p>
                    <span className="text-[10px] text-muted-foreground">{c.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMessage}</p>
                </div>
                {c.unread > 0 && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{c.unread}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2 flex flex-col">
          {/* Chat header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-sm font-bold text-foreground">{active?.avatar}</div>
                {active?.online && <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success border-2 border-card" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{active?.name}</p>
                <p className="text-xs text-success">{active?.online ? "Online" : "Offline"}</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center justify-center"><Phone className="h-4 w-4" /></button>
              <button className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center justify-center"><Video className="h-4 w-4" /></button>
              <button className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center justify-center"><MoreHorizontal className="h-4 w-4" /></button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.isMe ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[70%] rounded-2xl px-4 py-2.5", m.isMe ? "bg-primary text-primary-foreground rounded-br-md" : "bg-secondary text-foreground rounded-bl-md")}>
                  <p className="text-sm">{m.text}</p>
                  <p className={cn("text-[10px] mt-1", m.isMe ? "text-primary-foreground/70" : "text-muted-foreground")}>{m.time}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-2">
              <button className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center justify-center"><Paperclip className="h-4 w-4" /></button>
              <input placeholder="Type a message..." className="flex-1 h-10 rounded-xl border border-input bg-secondary/40 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
              <button className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center justify-center"><Smile className="h-4 w-4" /></button>
              <button className="h-10 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
