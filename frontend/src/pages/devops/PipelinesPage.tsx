import { useState } from "react";
import { CheckCircle, Clock, GitBranch, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { TEXT } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DevOpsDialogHeader from "@/components/devops/DevOpsDialogHeader";
import { Label } from "@/components/ui/label";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import {
  type PipelineStatus,
  useClearGitHubConfig,
  useGitHubConfigStatus,
  usePipelines,
  useSyncPipelines,
  useUpsertGitHubConfig,
} from "@/services/pipelines";

const STATUS_META: Record<PipelineStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  success: { icon: CheckCircle, color: "text-emerald-500", label: "Passed" },
  failed: { icon: XCircle, color: "text-red-500", label: "Failed" },
  running: { icon: Clock, color: "text-blue-500", label: "Running" },
  cancelled: { icon: XCircle, color: "text-amber-500", label: "Cancelled" },
  queued: { icon: Clock, color: "text-indigo-500", label: "Queued" },
  unknown: { icon: Clock, color: "text-muted-foreground", label: "Unknown" },
};

function formatDuration(durationMs: number | null) {
  if (durationMs == null) return "—";
  const seconds = Math.max(0, Math.floor(durationMs / 1000));
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}m ${sec.toString().padStart(2, "0")}s`;
}

function formatAgo(isoString: string | null) {
  if (!isoString) return "Unknown";
  const value = new Date(isoString).getTime();
  if (!Number.isFinite(value)) return "Unknown";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - value) / 1000));
  if (diffSeconds < 10) return "just now";
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

export default function DevOpsPipelinesPage() {
  const { user } = useAuth();
  const canSync = user?.role === "admin" || user?.role === "manager";
  const canConfigure = user?.role === "admin" || user?.role === "manager" || user?.role === "employee";

  const [status, setStatus] = useState<"all" | PipelineStatus>("all");
  const [branchFilter, setBranchFilter] = useState("");
  const [workflowFilter, setWorkflowFilter] = useState("");

  const [configOpen, setConfigOpen] = useState(false);
  const [ownerInput, setOwnerInput] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [webhookSecretInput, setWebhookSecretInput] = useState("");
  const [webhookOrgInput, setWebhookOrgInput] = useState("");
  const [configError, setConfigError] = useState("");

  const { data, isLoading, error, refetch, isFetching } = usePipelines({
    limit: 50,
    status: status === "all" ? undefined : status,
    branch: branchFilter.trim() || undefined,
    workflow: workflowFilter.trim() || undefined,
  });

  const { data: githubConfigStatus } = useGitHubConfigStatus(canConfigure);
  const syncPipelines = useSyncPipelines();
  const upsertGitHubConfig = useUpsertGitHubConfig();
  const clearGitHubConfig = useClearGitHubConfig();

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorFallback error={error as Error} onRetry={() => { void refetch(); }} />;

  const runs = data?.data ?? [];
  const source = data?.meta.source ?? "deployments";
  const counts = {
    success: runs.filter((run) => run.status === "success").length,
    failed: runs.filter((run) => run.status === "failed").length,
    running: runs.filter((run) => run.status === "running" || run.status === "queued").length,
  };

  const configSourceText =
    githubConfigStatus?.source === "env"
      ? "Environment"
      : githubConfigStatus?.source === "user"
      ? "Your token"
      : "Not configured";

  const openConfig = () => {
    setOwnerInput(githubConfigStatus?.owner ?? "");
    setRepoInput(githubConfigStatus?.repo ?? "");
    setTokenInput("");
    setWebhookSecretInput("");
    setWebhookOrgInput("");
    setConfigError("");
    setConfigOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
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
                Real workflow run status from GitHub Actions (or deployment history fallback).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{counts.success} passed</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2">
              <Clock className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{counts.running} running</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2">
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">{counts.failed} failed</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 border-t border-border pt-4 md:grid-cols-4">
          <Select value={status} onValueChange={(value) => setStatus(value as "all" | PipelineStatus)}>
            <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter branch (e.g. main)"
            value={branchFilter}
            onChange={(event) => setBranchFilter(event.target.value)}
          />
          <Input
            placeholder="Filter workflow name"
            value={workflowFilter}
            onChange={(event) => setWorkflowFilter(event.target.value)}
          />
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
            {canConfigure && (
              <Button
                variant="outline"
                size="sm"
                onClick={openConfig}
              >
                {githubConfigStatus?.configured ? "Update GitHub" : "Connect GitHub"}
              </Button>
            )}
            {canSync && (
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    const result = await syncPipelines.mutateAsync(50);
                    toast.success(`Synced ${result.data.processed} runs (${result.data.source})`);
                  } catch (error) {
                    const message = error instanceof Error ? error.message : "Unable to sync pipelines right now";
                    toast.error(message);
                  }
                }}
                disabled={syncPipelines.isPending}
                className="gap-2"
              >
                {syncPipelines.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Sync
              </Button>
            )}
          </div>
        </div>

        <p className={cn("mt-3 text-muted-foreground", TEXT.meta)}>
          Source: {source === "github" ? "GitHub Actions API" : "Deployment records"} · Auto-refresh every 30s
        </p>
        <p className={cn("mt-1 text-muted-foreground", TEXT.meta)}>
          GitHub config: {configSourceText}
          {githubConfigStatus?.owner && githubConfigStatus?.repo ? ` (${githubConfigStatus.owner}/${githubConfigStatus.repo})` : ""}
        </p>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <GitBranch className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Recent Runs</span>
          <span className={cn("ml-auto text-muted-foreground", TEXT.meta)}>{runs.length} items</span>
        </div>
        {runs.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No pipeline runs found for current filters.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {runs.map((run) => {
              const meta = STATUS_META[run.status] ?? STATUS_META.unknown;
              const Icon = meta.icon;
              const shortSha = run.commitHash ? run.commitHash.slice(0, 8) : "—";

              return (
                <div key={run.id} className="flex items-center gap-4 px-4 py-3">
                  <Icon className={cn("h-4 w-4 shrink-0", meta.color)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{run.workflow}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-mono">{run.branch}</span>
                      <span>·</span>
                      <span className="font-mono">{shortSha}</span>
                      {run.actor && (
                        <>
                          <span>·</span>
                          <span>{run.actor}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-xs font-semibold", meta.color)}>{meta.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDuration(run.durationMs)} · {formatAgo(run.startedAt ?? run.updatedAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="w-[95vw] max-w-xl">
          <DialogHeader>
            <DevOpsDialogHeader
              icon={GitBranch}
              iconColor="text-indigo-500"
              iconBg="bg-indigo-500/10 border-indigo-500/30"
              title="Connect GitHub"
              description="Link your repository to pull CI/CD runs automatically every 5 minutes."
            />
          </DialogHeader>

          <div className="space-y-3">
            <p className={cn("text-muted-foreground", TEXT.meta)}>
              Add your repository and developer token to fetch latest CI/CD runs.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Owner</Label>
                <Input value={ownerInput} onChange={(event) => setOwnerInput(event.target.value)} placeholder="org-or-username" />
              </div>
              <div className="space-y-1.5">
                <Label>Repository</Label>
                <Input value={repoInput} onChange={(event) => setRepoInput(event.target.value)} placeholder="repo-name" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Developer Token</Label>
              <Input
                type="password"
                value={tokenInput}
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="github token"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Webhook Secret (optional)</Label>
                <Input value={webhookSecretInput} onChange={(event) => setWebhookSecretInput(event.target.value)} placeholder="secret" />
              </div>
              <div className="space-y-1.5">
                <Label>Webhook Org ID (optional)</Label>
                <Input value={webhookOrgInput} onChange={(event) => setWebhookOrgInput(event.target.value)} placeholder="organization id" />
              </div>
            </div>
            {configError ? <p className="text-sm text-destructive">{configError}</p> : null}
          </div>

          <DialogFooter>
            {githubConfigStatus?.source === "user" && (
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  try {
                    await clearGitHubConfig.mutateAsync();
                    toast.success("GitHub config removed");
                    setConfigOpen(false);
                  } catch {
                    setConfigError("Unable to remove GitHub config");
                  }
                }}
                disabled={clearGitHubConfig.isPending || upsertGitHubConfig.isPending}
              >
                Remove
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => setConfigOpen(false)} disabled={upsertGitHubConfig.isPending}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (!ownerInput.trim() || !repoInput.trim() || !tokenInput.trim()) {
                  setConfigError("Owner, repository and token are required.");
                  return;
                }

                try {
                  await upsertGitHubConfig.mutateAsync({
                    owner: ownerInput.trim(),
                    repo: repoInput.trim(),
                    token: tokenInput.trim(),
                    ...(webhookSecretInput.trim() ? { webhookSecret: webhookSecretInput.trim() } : {}),
                    ...(webhookOrgInput.trim() ? { webhookOrganizationId: webhookOrgInput.trim() } : {}),
                  });
                  toast.success("GitHub connected");
                  setConfigOpen(false);
                } catch {
                  setConfigError("Failed to save GitHub config.");
                }
              }}
              disabled={upsertGitHubConfig.isPending}
            >
              {upsertGitHubConfig.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
