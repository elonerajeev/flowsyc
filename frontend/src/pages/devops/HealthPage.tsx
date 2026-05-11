import { Activity, CheckCircle, Clock, XCircle } from "lucide-react";

const MOCK = [
  { name: "Backend API",      url: "https://api.flowsyc.com",     status: "up",      ms: 142, uptime: "99.9%" },
  { name: "Frontend",         url: "https://flowsyc-svuj.vercel.app", status: "up",  ms: 89,  uptime: "100%" },
  { name: "PostgreSQL DB",    url: "localhost:5432",               status: "up",      ms: 4,   uptime: "99.8%" },
  { name: "Redis Cache",      url: "localhost:6379",               status: "degraded",ms: 320, uptime: "97.2%" },
  { name: "Staging API",      url: "https://staging.flowsyc.com", status: "down",    ms: null, uptime: "82.1%" },
];

const STATUS = {
  up:       { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Online" },
  degraded: { icon: Clock,       color: "text-amber-400",   bg: "bg-amber-500/10",   label: "Degraded" },
  down:     { icon: XCircle,     color: "text-red-400",     bg: "bg-red-500/10",     label: "Offline" },
};

export default function DevOpsHealthPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Service Health</h1>
        <p className="text-sm text-muted-foreground mt-1">Real-time status of all monitored services</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Online",   count: 3, color: "text-emerald-400" },
          { label: "Degraded", count: 1, color: "text-amber-400" },
          { label: "Offline",  count: 1, color: "text-red-400" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Services table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Monitored Services</span>
          <span className="ml-auto text-xs text-muted-foreground">Checks every 30s</span>
        </div>
        <div className="divide-y divide-border">
          {MOCK.map((svc) => {
            const meta = STATUS[svc.status as keyof typeof STATUS];
            const Icon = meta.icon;
            return (
              <div key={svc.name} className="flex items-center gap-4 px-4 py-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${meta.bg}`}>
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{svc.url}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{svc.ms ? `${svc.ms}ms` : "—"}</p>
                </div>
                <div className="text-right w-16">
                  <p className="text-xs font-semibold text-foreground">{svc.uptime}</p>
                  <p className="text-xs text-muted-foreground">uptime</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
