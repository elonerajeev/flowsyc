import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Download, Filter, Terminal, Trash2 } from "lucide-react";

import { useRealtime } from "@/contexts/RealtimeContext";
import { cn } from "@/lib/utils";
import { TEXT } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LogEntry {
  level: string;
  message: string;
  timestamp: string;
}

const LEVEL_COLOR: Record<string, string> = {
  error:   "text-red-400",
  warn:    "text-amber-400",
  info:    "text-blue-400",
  http:    "text-emerald-400",
  debug:   "text-slate-500",
  verbose: "text-slate-500",
};

const LEVELS = ["all", "error", "warn", "info", "http", "debug"] as const;
type LevelFilter = typeof LEVELS[number];
const MAX_LOGS = 500;

export default function DevOpsLogsPage() {
  const { socket, isConnected } = useRealtime();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LevelFilter>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;
    const handler = (entry: LogEntry) => {
      setLogs((prev) => {
        const next = [...prev, entry];
        return next.length > MAX_LOGS ? next.slice(-MAX_LOGS) : next;
      });
    };
    socket.on("devops:log", handler);
    return () => { socket.off("devops:log", handler); };
  }, [socket]);

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    setAutoScroll(el.scrollHeight - el.scrollTop - el.clientHeight < 40);
  };

  const filtered = filter === "all" ? logs : logs.filter((l) => l.level === filter);

  const exportLogs = () => {
    const text = filtered.map((l) =>
      `[${l.timestamp}] ${l.level.toUpperCase().padEnd(7)} ${l.message}`
    ).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `flowsyc-logs-${new Date().toISOString().slice(0, 19)}.txt`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
              <Terminal className="h-3.5 w-3.5 text-emerald-500" />
              DevOps Hub · Logs
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Live Logs</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Real-time log stream from the backend via WebSocket.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 rounded-full border px-4 py-2",
              isConnected ? "border-emerald-500/30 bg-emerald-500/10" : "border-muted/50 bg-muted/30",
            )}>
              <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
              <span className={cn("text-sm font-medium", isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-2">
              <span className={cn("text-sm font-medium text-muted-foreground")}>{filtered.length} lines</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={filter} onValueChange={(v) => setFilter(v as LevelFilter)}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => (
                  <SelectItem key={l} value={l} className="text-xs capitalize">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setLogs([])} className="gap-2">
              <Trash2 className="h-3.5 w-3.5" />Clear
            </Button>
            <Button variant="outline" size="sm" onClick={exportLogs} disabled={filtered.length === 0} className="gap-2">
              <Download className="h-3.5 w-3.5" />Export
            </Button>
          </div>
        </div>
      </section>

      {/* Terminal */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-[1.75rem] border border-border overflow-hidden shadow-card"
      >
        <div className="flex items-center gap-3 border-b border-border bg-card px-6 py-4">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">backend · stdout</span>
          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            className={cn("ml-auto text-xs font-medium transition", autoScroll ? "text-emerald-500" : "text-muted-foreground hover:text-foreground")}
          >
            {autoScroll ? "↓ Auto-scroll on" : "↓ Auto-scroll off"}
          </button>
        </div>

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="h-[520px] overflow-y-auto bg-[#0d1117] p-4 font-mono text-xs"
        >
          {filtered.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-600">
              {isConnected ? "Waiting for log entries..." : "Connect to the backend to see live logs"}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filtered.map((l, i) => (
                <div key={i} className="flex gap-3 leading-5 hover:bg-white/5 px-1 rounded">
                  <span className="shrink-0 text-slate-600 select-none">
                    {new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <span className={cn("shrink-0 w-10 font-semibold", LEVEL_COLOR[l.level] ?? "text-slate-400")}>
                    {l.level.slice(0, 4).toUpperCase()}
                  </span>
                  <span className="text-slate-300 break-all">{l.message}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
