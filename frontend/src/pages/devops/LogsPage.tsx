import { Terminal } from "lucide-react";

const LOGS = [
  { t: "12:43:01", level: "info",  msg: "Backend listening on port 3000" },
  { t: "12:43:05", level: "http",  msg: "POST /api/auth/login 200 345ms" },
  { t: "12:43:12", level: "http",  msg: "GET /api/team-members 200 80ms" },
  { t: "12:43:18", level: "http",  msg: "PATCH /api/team-members/3 200 85ms" },
  { t: "12:45:00", level: "debug", msg: "Running automation cron..." },
  { t: "12:50:00", level: "debug", msg: "Running automation cron..." },
  { t: "12:53:18", level: "warn",  msg: "Failed to send employee invite email: SMTP connection closed" },
  { t: "12:53:19", level: "http",  msg: "POST /api/team-members 201 3219ms" },
  { t: "12:55:00", level: "debug", msg: "Running automation cron..." },
];

const LEVEL_COLOR: Record<string, string> = {
  info:  "text-blue-400",
  http:  "text-emerald-400",
  debug: "text-muted-foreground",
  warn:  "text-amber-400",
  error: "text-red-400",
};

export default function DevOpsLogsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Live Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">Backend log stream — real-time via WebSocket</p>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">backend.log</span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
        <div className="bg-[#0d1117] p-4 font-mono text-xs space-y-1 max-h-[480px] overflow-y-auto">
          {LOGS.map((l, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-muted-foreground shrink-0">{l.t}</span>
              <span className={`shrink-0 w-12 ${LEVEL_COLOR[l.level] ?? "text-foreground"}`}>{l.level}</span>
              <span className="text-slate-300">{l.msg}</span>
            </div>
          ))}
          <div className="flex gap-3 opacity-50">
            <span className="text-muted-foreground">▌</span>
          </div>
        </div>
      </div>
    </div>
  );
}
