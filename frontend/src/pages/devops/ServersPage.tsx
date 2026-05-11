import { Server } from "lucide-react";

const SERVERS = [
  { name: "prod-api-1",   ip: "185.27.134.55", cpu: 34, mem: 61, disk: 48, status: "healthy" },
  { name: "prod-api-2",   ip: "185.27.134.56", cpu: 28, mem: 55, disk: 48, status: "healthy" },
  { name: "staging-1",    ip: "10.0.1.10",     cpu: 12, mem: 38, disk: 22, status: "healthy" },
  { name: "db-primary",   ip: "10.0.2.5",      cpu: 67, mem: 82, disk: 71, status: "warning" },
];

function Bar({ value, warn = 70 }: { value: number; warn?: number }) {
  const color = value >= warn ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-muted-foreground w-8">{value}%</span>
    </div>
  );
}

export default function DevOpsServersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Servers</h1>
        <p className="text-sm text-muted-foreground mt-1">CPU, memory and disk across all nodes</p>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Server className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{SERVERS.length} servers</span>
        </div>
        <div className="divide-y divide-border">
          {SERVERS.map((s) => (
            <div key={s.name} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-6 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-foreground">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.ip}</p>
              </div>
              <div><p className="text-xs text-muted-foreground mb-1">CPU</p><Bar value={s.cpu} /></div>
              <div><p className="text-xs text-muted-foreground mb-1">Memory</p><Bar value={s.mem} /></div>
              <div><p className="text-xs text-muted-foreground mb-1">Disk</p><Bar value={s.disk} warn={80} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
