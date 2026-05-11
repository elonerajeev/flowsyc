import { CheckCircle, GitCommit, Rocket, XCircle } from "lucide-react";

const DEPLOYS = [
  { id: "d-001", service: "Backend API",  env: "production", commit: "df2e92c", msg: "fix(ci): fix migration, OAuth secret isolation", by: "Rajeev", time: "2m ago",  status: "success" },
  { id: "d-002", service: "Frontend",     env: "production", commit: "b4eed68", msg: "feat(email): redesign all email templates",       by: "Rajeev", time: "1h ago",  status: "success" },
  { id: "d-003", service: "Backend API",  env: "staging",    commit: "7403da7", msg: "feat: finalize org isolation, google auth popup",  by: "Rajeev", time: "3h ago",  status: "success" },
  { id: "d-004", service: "Worker",       env: "production", commit: "a1b2c3d", msg: "chore: update dependencies",                       by: "EloneX", time: "5h ago",  status: "failed" },
];

const ENV_COLOR: Record<string, string> = {
  production: "bg-violet-500/15 text-violet-400",
  staging:    "bg-blue-500/15 text-blue-400",
};

export default function DevOpsDeploymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Deployments</h1>
        <p className="text-sm text-muted-foreground mt-1">Latest deployments across all services</p>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Rocket className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Recent Deployments</span>
        </div>
        <div className="divide-y divide-border">
          {DEPLOYS.map((d) => (
            <div key={d.id} className="flex items-center gap-4 px-4 py-3">
              {d.status === "success"
                ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
                : <XCircle className="h-4 w-4 shrink-0 text-red-400" />}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">{d.service}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${ENV_COLOR[d.env] ?? ""}`}>{d.env}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <GitCommit className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-mono text-muted-foreground">{d.commit}</span>
                  <span className="text-xs text-muted-foreground truncate">— {d.msg}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-foreground">{d.by}</p>
                <p className="text-xs text-muted-foreground">{d.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
