import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Clock, GitBranch, Loader2,
  Lock, RefreshCw, Settings, Unlink, XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { TEXT } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import DevOpsDialogHeader from "@/components/devops/DevOpsDialogHeader";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import {
  type PipelineStatus, type GitHubRepo,
  useClearGitHubConfig, useGitHubConfigStatus, useListGitHubRepos,
  usePipelines, useSyncPipelines, useUpsertGitHubConfig,
} from "@/services/pipelines";

const STATUS_META: Record<PipelineStatus, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  success:   { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Passed" },
  failed:    { icon: XCircle,     color: "text-red-500",     bg: "bg-red-500/10",     label: "Failed" },
  running:   { icon: Clock,       color: "text-blue-500",    bg: "bg-blue-500/10",    label: "Running" },
  cancelled: { icon: XCircle,     color: "text-amber-500",   bg: "bg-amber-500/10",   label: "Cancelled" },
  queued:    { icon: Clock,       color: "text-indigo-500",  bg: "bg-indigo-500/10",  label: "Queued" },
  unknown:   { icon: Clock,       color: "text-muted-foreground", bg: "bg-muted/30",  label: "Unknown" },
};

function formatDuration(ms: number | null) {
  if (ms == null) return "—";
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// ─── GitHub Connect Dialog ────────────────────────────────────────────────────
function GitHubConnectDialog({ onClose }: { onClose: () => void }) {
  const { data: configStatus } = useGitHubConfigStatus(true);
  const upsert = useUpsertGitHubConfig();
  const clear = useClearGitHubConfig();

  const [owner, setOwner] = useState(configStatus?.owner ?? "");
  const [token, setToken] = useState("");
  const [scope, setScope] = useState<"org" | "user">("org");
  const [selectedRepos, setSelectedRepos] = useState<string[]>(configStatus?.repos ?? []);
  const [fetchEnabled, setFetchEnabled] = useState(false);
  const [error, setError] = useState("");

  const { data: repos, isLoading: reposLoading, error: reposError } = useListGitHubRepos(
    token, owner, scope === "org", fetchEnabled,
  );

  const handleSave = async () => {
    if (!owner.trim() || !token.trim() || selectedRepos.length === 0) {
      setError("Enter owner, token and select at least one repository.");
      return;
    }
    try {
      await upsert.mutateAsync({ owner: owner.trim(), repos: selectedRepos, token: token.trim(), scope });
      toast.success(`GitHub connected · ${selectedRepos.length} repo${selectedRepos.length !== 1 ? "s" : ""}`);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save GitHub config.");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DevOpsDialogHeader
            icon={GitBranch}
            iconColor="text-indigo-500"
            iconBg="bg-indigo-500/10 border-indigo-500/30"
            title="GitHub Integration"
            description="Connect your GitHub account to pull CI/CD pipeline runs automatically every 5 minutes."
          />
        </DialogHeader>

        <div className="space-y-4">
          {/* Currently connected */}
          {configStatus?.configured && (
            <div className="flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
              <div>
                <p className={cn("font-semibold text-foreground", TEXT.meta)}>Currently connected</p>
                <p className={cn("text-muted-foreground", TEXT.meta)}>
                  {configStatus.owner} · {configStatus.repos.join(", ")}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive"
                disabled={clear.isPending}
                onClick={async () => {
                  try { await clear.mutateAsync(); toast.success("GitHub disconnected"); onClose(); }
                  catch { setError("Failed to disconnect."); }
                }}>
                <Unlink className="h-3.5 w-3.5" />Disconnect
              </Button>
            </div>
          )}

          {/* Scope + Owner */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Account Type</Label>
              <Select value={scope} onValueChange={(v) => { setScope(v as "org" | "user"); setFetchEnabled(false); setSelectedRepos([]); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="org">Organization</SelectItem>
                  <SelectItem value="user">Personal Account</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{scope === "org" ? "Organization Name" : "GitHub Username"}</Label>
              <Input
                value={owner}
                onChange={(e) => { setOwner(e.target.value); setFetchEnabled(false); setSelectedRepos([]); }}
                placeholder={scope === "org" ? "my-org" : "username"}
              />
            </div>
          </div>

          {/* Token */}
          <div className="space-y-1.5">
            <Label>Personal Access Token</Label>
            <Input
              type="password"
              value={token}
              onChange={(e) => { setToken(e.target.value); setFetchEnabled(false); setSelectedRepos([]); }}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-xs"
            />
            <div className="flex items-center justify-between">
              <p className={cn("text-muted-foreground", TEXT.meta)}>
                Needs <code className="rounded bg-muted px-1">repo</code>
                {scope === "org" && <> + <code className="rounded bg-muted px-1">read:org</code></>} scope.
              </p>
              <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer"
                className={cn("text-indigo-500 hover:underline", TEXT.meta)}>
                Create token →
              </a>
            </div>
          </div>

          {/* Fetch repos button */}
          <Button
            type="button" variant="outline" className="w-full gap-2"
            disabled={token.length < 10 || !owner.trim() || reposLoading}
            onClick={() => { setFetchEnabled(true); setSelectedRepos([]); setError(""); }}
          >
            {reposLoading
              ? <><Loader2 className="h-4 w-4 animate-spin" />Fetching repositories...</>
              : <><GitBranch className="h-4 w-4" />Fetch Accessible Repositories</>}
          </Button>

          {/* Error */}
          {reposError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
              Failed to fetch repos — check your token and {scope === "org" ? "organization name" : "username"}.
            </div>
          )}

          {/* Repo checklist */}
          {repos && repos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Select Repositories</Label>
                <div className="flex items-center gap-2">
                  <span className={cn("text-muted-foreground", TEXT.meta)}>{selectedRepos.length} of {repos.length} selected</span>
                  <button type="button" onClick={() => setSelectedRepos(repos.map((r: GitHubRepo) => r.name))}
                    className={cn("text-indigo-500 hover:underline", TEXT.meta)}>All</button>
                  <button type="button" onClick={() => setSelectedRepos([])}
                    className={cn("text-muted-foreground hover:text-foreground", TEXT.meta)}>None</button>
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {repos.map((repo: GitHubRepo) => {
                  const checked = selectedRepos.includes(repo.name);
                  return (
                    <button key={repo.name} type="button"
                      onClick={() => setSelectedRepos((p) => checked ? p.filter((r) => r !== repo.name) : [...p, repo.name])}
                      className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/30", checked && "bg-indigo-500/5")}
                    >
                      <div className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                        checked ? "border-indigo-500 bg-indigo-500" : "border-border bg-background")}>
                        {checked && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground">{repo.name}</p>
                        {repo.description && <p className={cn("text-muted-foreground truncate", TEXT.meta)}>{repo.description}</p>}
                      </div>
                      {repo.private && (
                        <span className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground shrink-0">
                          <Lock className="h-2.5 w-2.5" />Private
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" disabled={upsert.isPending || selectedRepos.length === 0} onClick={handleSave} className="gap-2">
            {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save & Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DevOpsPipelinesPage() {
  const { user } = useAuth();
  const canSync = user?.role === "admin" || user?.role === "manager";
  const canConfigure = user?.role === "admin" || user?.role === "manager" || user?.role === "employee";

  const [status, setStatus] = useState<"all" | PipelineStatus>("all");
  const [branchFilter, setBranchFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");
  const [configOpen, setConfigOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = usePipelines({
    limit: 50,
    status: status === "all" ? undefined : status,
    branch: branchFilter.trim() || undefined,
    workflow: workflowFilter.trim() || undefined,
  });

  const { data: githubConfig } = useGitHubConfigStatus(canConfigure);
  const syncPipelines = useSyncPipelines();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorFallback error={error as Error} onRetry={() => { void refetch(); }} />;

  const runs = data?.data ?? [];
  const source = data?.meta.source ?? "deployments";
  const counts = {
    success: runs.filter((r) => r.status === "success").length,
    failed:  runs.filter((r) => r.status === "failed").length,
    running: runs.filter((r) => r.status === "running" || r.status === "queued").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
              <GitBranch className="h-3.5 w-3.5 text-indigo-500" />
              DevOps Hub · Pipelines
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">CI/CD Pipelines</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                GitHub Actions workflow runs across all connected repositories.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {counts.success > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{counts.success} passed</span>
              </div>
            )}
            {counts.running > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2">
                <Clock className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{counts.running} running</span>
              </div>
            )}
            {counts.failed > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2">
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">{counts.failed} failed</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters + actions */}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Select value={status} onValueChange={(v) => setStatus(v as "all" | PipelineStatus)}>
            <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="Branch..." value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="h-8 w-32 text-xs" />
          <Input placeholder="Workflow..." value={workflowFilter} onChange={(e) => setWorkflowFilter(e.target.value)} className="h-8 w-36 text-xs" />

          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />Refresh
            </Button>
            {canSync && githubConfig?.configured && (
              <Button variant="outline" size="sm" className="gap-2"
                onClick={async () => {
                  try { const r = await syncPipelines.mutateAsync(50); toast.success(`Synced ${r.data.processed} runs`); }
                  catch (e) { toast.error(e instanceof Error ? e.message : "Sync failed"); }
                }}
                disabled={syncPipelines.isPending}
              >
                {syncPipelines.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitBranch className="h-3.5 w-3.5" />}
                Sync Now
              </Button>
            )}
            {canConfigure && (
              <Button size="sm" onClick={() => setConfigOpen(true)} className="gap-2">
                <Settings className="h-3.5 w-3.5" />
                {githubConfig?.configured ? "GitHub Settings" : "Connect GitHub"}
              </Button>
            )}
          </div>
        </div>

        {/* Connection status */}
        <div className={cn("mt-3 flex items-center gap-3 rounded-xl border px-4 py-2.5",
          githubConfig?.configured ? "border-indigo-500/20 bg-indigo-500/5" : "border-border bg-muted/20")}>
          <GitBranch className={cn("h-4 w-4 shrink-0", githubConfig?.configured ? "text-indigo-500" : "text-muted-foreground")} />
          {githubConfig?.configured ? (
            <p className={cn("text-foreground", TEXT.meta)}>
              <strong>{githubConfig.owner}</strong> · {githubConfig.repos.map((r) => (
                <Badge key={r} variant="secondary" className="mx-0.5 font-mono text-[10px]">{r}</Badge>
              ))} · <span className="text-muted-foreground">Source: {source === "github" ? "GitHub API" : "Deployment records"}</span>
            </p>
          ) : (
            <p className={cn("text-muted-foreground", TEXT.meta)}>
              Not connected — showing deployment records.{" "}
              {canConfigure && <button type="button" onClick={() => setConfigOpen(true)} className="text-indigo-500 hover:underline">Connect GitHub →</button>}
            </p>
          )}
        </div>
      </section>

      {/* Pipeline runs */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-[1.75rem] border border-border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Recent Runs</span>
          <span className={cn("ml-auto text-muted-foreground", TEXT.meta)}>{runs.length} items</span>
        </div>

        {runs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <GitBranch className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">No pipeline runs</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {githubConfig?.configured ? "No runs match the current filters." : "Connect GitHub to see your CI/CD workflow runs."}
              </p>
            </div>
            {canConfigure && !githubConfig?.configured && (
              <Button onClick={() => setConfigOpen(true)} className="gap-2 mt-1">
                <GitBranch className="h-4 w-4" />Connect GitHub
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {runs.map((run) => {
              const meta = STATUS_META[run.status] ?? STATUS_META.unknown;
              const Icon = meta.icon;
              return (
                <div key={run.id} className="flex items-center gap-4 px-6 py-4 transition hover:bg-muted/20">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl", meta.bg)}>
                    <Icon className={cn("h-4 w-4", meta.color, run.status === "running" && "animate-pulse")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{run.workflow}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">{run.branch}</span>
                      {run.commitHash && <><span>·</span><span className="font-mono">{run.commitHash.slice(0, 7)}</span></>}
                      {run.commitMessage && <span className="truncate max-w-xs">— {run.commitMessage}</span>}
                    </div>
                  </div>
                  <div className="hidden md:block text-right shrink-0">
                    <p className="text-xs text-muted-foreground">{run.actor ?? "—"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xs font-semibold", meta.color)}>{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{formatDuration(run.durationMs)} · {timeAgo(run.startedAt ?? run.updatedAt)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {configOpen && <GitHubConnectDialog onClose={() => setConfigOpen(false)} />}
    </div>
  );
}
