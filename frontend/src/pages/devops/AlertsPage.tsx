import { AlertTriangle, Bell, CheckCircle } from "lucide-react";

const ALERTS = [
  { id: 1, title: "Redis response time > 300ms",    service: "Redis Cache",   severity: "warning",  time: "10m ago",  resolved: false },
  { id: 2, title: "Staging API is unreachable",     service: "Staging API",   severity: "critical", time: "25m ago",  resolved: false },
  { id: 3, title: "DB CPU spike > 65%",             service: "db-primary",    severity: "warning",  time: "1h ago",   resolved: false },
  { id: 4, title: "Deploy pipeline failed",         service: "CD Workflow",   severity: "critical", time: "3h ago",   resolved: true },
  { id: 5, title: "Backend restart detected",       service: "Backend API",   severity: "info",     time: "5h ago",   resolved: true },
];

const SEV = {
  critical: { color: "text-red-400",    bg: "bg-red-500/10",    icon: AlertTriangle },
  warning:  { color: "text-amber-400",  bg: "bg-amber-500/10",  icon: AlertTriangle },
  info:     { color: "text-blue-400",   bg: "bg-blue-500/10",   icon: Bell },
};

export default function DevOpsAlertsPage() {
  const open = ALERTS.filter((a) => !a.resolved);
  const resolved = ALERTS.filter((a) => a.resolved);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Alerts</h1>
        <p className="text-sm text-muted-foreground mt-1">{open.length} active · {resolved.length} resolved</p>
      </div>

      {[{ label: "Active", items: open }, { label: "Resolved", items: resolved }].map(({ label, items }) => (
        <div key={label} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">{label}</span>
            <span className="ml-auto text-xs text-muted-foreground">{items.length}</span>
          </div>
          <div className="divide-y divide-border">
            {items.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-emerald-400" /> All clear
              </div>
            )}
            {items.map((a) => {
              const meta = SEV[a.severity as keyof typeof SEV];
              const Icon = meta.icon;
              return (
                <div key={a.id} className="flex items-center gap-4 px-4 py-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}>
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.service}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-semibold ${meta.color}`}>{a.severity}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
