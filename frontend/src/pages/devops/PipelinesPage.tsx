import { CheckCircle, Clock, GitBranch, XCircle } from "lucide-react";

const PIPELINES = [
  { name: "CI — Lint, Type-check & Test", branch: "develop", status: "success", duration: "2m 14s", ago: "5m ago" },
  { name: "CD — Deploy to Production",    branch: "main",    status: "success", duration: "4m 38s", ago: "1h ago" },
  { name: "CI — Lint, Type-check & Test", branch: "feature/workspace-switcher", status: "running", duration: "1m 02s", ago: "just now" },
  { name: "CD — Deploy to Staging",       branch: "develop", status: "failed",  duration: "0m 45s", ago: "3h ago" },
];

const STATUS_META = {
  success: { icon: CheckCircle, color: "text-emerald-400", label: "Passed" },
  failed:  { icon: XCircle,     color: "text-red-400",     label: "Failed" },
  running: { icon: Clock,       color: "text-blue-400",    label: "Running" },
};

export default function DevOpsPipelinesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CI/CD Pipelines</h1>
        <p className="text-sm text-muted-foreground mt-1">GitHub Actions workflow runs</p>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Recent Runs</span>
        </div>
        <div className="divide-y divide-border">
          {PIPELINES.map((p, i) => {
            const meta = STATUS_META[p.status as keyof typeof STATUS_META];
            const Icon = meta.icon;
            return (
              <div key={i} className="flex items-center gap-4 px-4 py-3">
                <Icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{p.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <GitBranch className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-mono text-muted-foreground">{p.branch}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${meta.color}`}>{meta.label}</p>
                  <p className="text-xs text-muted-foreground">{p.duration} · {p.ago}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
