import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  CheckCircle, Clock, GitBranch, GitCommit,
  Loader2, Plus, RefreshCw, Rocket, Trash2, XCircle, Ban,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import {
  useDeployments, useCreateDeployment, useDeleteDeployment,
  useUpdateDeploymentStatus, type Deployment, type DeploymentStatus,
} from "@/services/deployments";
import { useSyncPipelines } from "@/services/pipelines";
import { cn } from "@/lib/utils";
import { TEXT } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import DevOpsDialogHeader from "@/components/devops/DevOpsDialogHeader";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  success:   { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Success" },
  failed:    { icon: XCircle,     color: "text-red-500",     bg: "bg-red-500/10",     label: "Failed" },
  running:   { icon: Clock,       color: "text-blue-500",    bg: "bg-blue-500/10",    label: "Running" },
  cancelled: { icon: Ban,         color: "text-muted-foreground", bg: "bg-muted/30",  label: "Cancelled" },
} as const;

const ENV_BADGE: Record<string, string> = {
  production: "border-violet-500/30 bg-violet-500/10 text-violet-500",
  staging:    "border-blue-500/30 bg-blue-500/10 text-blue-500",
  development:"border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Form ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  service:       z.string().min(1, "Required").max(100),
  environment:   z.string().min(1, "Required").max(50),
  status:        z.enum(["success", "failed", "running", "cancelled"]).default("success"),
  commitHash:    z.string().max(40).optional(),
  commitMessage: z.string().max(500).optional(),
  branch:        z.string().max(100).optional(),
  version:       z.string().max(50).optional(),
});
type FormValues = z.infer<typeof schema>;

function DeploymentDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateDeployment();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { status: "success", environment: "production" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await create.mutateAsync(values);
      toast.success("Deployment recorded");
      onClose();
    } catch { toast.error("Something went wrong"); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DevOpsDialogHeader
            icon={Rocket}
            iconColor="text-violet-500"
            iconBg="bg-violet-500/10 border-violet-500/30"
            title="Record Deployment"
            description="Log a release across any service and environment."
          />
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Input {...register("service")} placeholder="Backend API" />
              {errors.service && <p className="text-xs text-destructive">{errors.service.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Input {...register("environment")} placeholder="production" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select defaultValue={watch("status")} onValueChange={(v) => setValue("status", v as DeploymentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Version <span className="text-muted-foreground">(optional)</span></Label>
              <Input {...register("version")} placeholder="v1.2.3" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Commit <span className="text-muted-foreground">(optional)</span></Label>
              <Input {...register("commitHash")} placeholder="abc1234" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Branch <span className="text-muted-foreground">(optional)</span></Label>
              <Input {...register("branch")} placeholder="main" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Commit message <span className="text-muted-foreground">(optional)</span></Label>
            <Input {...register("commitMessage")} placeholder="feat: add new feature" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DevOpsDeploymentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canCreate = user?.role === "admin" || user?.role === "manager";
  const canSync = user?.role === "admin" || user?.role === "manager";
  const { data: deployments, isLoading, error, refetch, isFetching } = useDeployments();
  const deleteDeployment = useDeleteDeployment();
  const updateStatus = useUpdateDeploymentStatus();
  const syncPipelines = useSyncPipelines();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorFallback error={error as Error} onRetry={() => { void refetch(); }} />;

  const list = deployments ?? [];
  const counts = {
    success:   list.filter((d) => d.status === "success").length,
    failed:    list.filter((d) => d.status === "failed").length,
    running:   list.filter((d) => d.status === "running").length,
  };
  const githubSyncedCount = list.filter((d) => d.version?.startsWith("gh-")).length;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
              <Rocket className="h-3.5 w-3.5 text-violet-500" />
              DevOps Hub · Deployments
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Deployments</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Track every release across all services and environments, including GitHub Actions workflow runs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {counts.running > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2">
                <Clock className="h-4 w-4 text-blue-500 shrink-0 animate-pulse" />
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{counts.running} running</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{counts.success} succeeded</span>
            </div>
            {githubSyncedCount > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2">
                <GitBranch className="h-4 w-4 text-violet-500 shrink-0" />
                <span className="text-sm font-medium text-violet-600 dark:text-violet-400">{githubSyncedCount} from GitHub</span>
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

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <p className={cn("text-muted-foreground", TEXT.meta)}>
            {list.length} deployment{list.length !== 1 ? "s" : ""} · auto-refresh every 30s
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
            {canSync && (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const result = await syncPipelines.mutateAsync(50);
                  toast.success(`Synced ${result.data.processed} GitHub runs`);
                }}
                disabled={syncPipelines.isPending}
                className="gap-2"
              >
                {syncPipelines.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Sync GitHub
              </Button>
            )}
            {canCreate && (
              <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-3.5 w-3.5" /> Record Deploy
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Deployments list ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-[1.75rem] border border-border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Rocket className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Recent Deployments</span>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <Rocket className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">No deployments yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Record your first deployment to start tracking releases.</p>
            </div>
            {canCreate && (
              <Button onClick={() => setDialogOpen(true)} className="gap-2 mt-1">
                <Plus className="h-4 w-4" /> Record First Deploy
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {list.map((d) => {
              const meta = STATUS[d.status];
              const Icon = meta.icon;
              const envClass = ENV_BADGE[d.environment] ?? "border-border bg-muted/30 text-muted-foreground";

              return (
                <div key={d.id} className="flex items-center gap-4 px-6 py-4 transition hover:bg-muted/20">
                  {/* Status icon */}
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl", meta.bg)}>
                    <Icon className={cn("h-4 w-4", meta.color, d.status === "running" && "animate-pulse")} />
                  </div>

                  {/* Service + commit */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{d.service}</p>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", envClass)}>
                        {d.environment}
                      </span>
                      {d.version?.startsWith("gh-") && (
                        <Badge variant="secondary" className="text-[10px]">GitHub Actions</Badge>
                      )}
                      {d.version && !d.version.startsWith("gh-") && (
                        <Badge variant="outline" className="text-[10px] font-mono">{d.version}</Badge>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {d.commitHash && (
                        <span className="flex items-center gap-1">
                          <GitCommit className="h-3 w-3" />
                          <span className="font-mono">{d.commitHash.slice(0, 7)}</span>
                        </span>
                      )}
                      {d.branch && (
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          <span>{d.branch}</span>
                        </span>
                      )}
                      {d.commitMessage && (
                        <span className="truncate max-w-xs">— {d.commitMessage}</span>
                      )}
                    </div>
                  </div>

                  {/* Who + when */}
                  <div className="hidden md:block text-right shrink-0">
                    <p className="text-xs font-medium text-foreground">{d.deployedBy ?? "—"}</p>
                    <p className={cn("text-muted-foreground", TEXT.meta)}>{timeAgo(d.startedAt)}</p>
                  </div>

                  {/* Status badge */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <span className={cn("text-xs font-semibold", meta.color)}>{meta.label}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Mark running as success/failed */}
                    {canCreate && d.status === "running" && (
                      <>
                        <Button variant="ghost" size="icon" title="Mark success" className="h-8 w-8 hover:text-emerald-500"
                          onClick={async () => { await updateStatus.mutateAsync({ id: d.id, status: "success" }); toast.success("Marked as success"); }}>
                          <CheckCircle className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Mark failed" className="h-8 w-8 hover:text-red-500"
                          onClick={async () => { await updateStatus.mutateAsync({ id: d.id, status: "failed" }); toast.error("Marked as failed"); }}>
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    {isAdmin && (
                      <Button variant="ghost" size="icon" title="Remove" onClick={() => setConfirmDelete(d.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Dialogs */}
      {dialogOpen && <DeploymentDialog onClose={() => setDialogOpen(false)} />}

      <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove deployment?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete this deployment record.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteDeployment.isPending} onClick={async () => {
              if (confirmDelete === null) return;
              await deleteDeployment.mutateAsync(confirmDelete);
              toast.success("Deployment removed");
              setConfirmDelete(null);
            }}>
              {deleteDeployment.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
