import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, Bell, CheckCircle, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { useDevOpsAlerts, useCreateAlert, useResolveAlert, useDeleteAlert, type DevOpsAlert } from "@/services/devops-alerts";
import { cn } from "@/lib/utils";
import { TEXT } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";

const SEV = {
  critical: { icon: AlertTriangle, color: "text-red-500",   bg: "bg-red-500/10",   border: "border-red-500/30",   label: "Critical", pill: "border-red-500/30 bg-red-500/10 text-red-500" },
  warning:  { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", label: "Warning",  pill: "border-amber-500/30 bg-amber-500/10 text-amber-500" },
  info:     { icon: Bell,          color: "text-blue-500",  bg: "bg-blue-500/10",  border: "border-blue-500/30",  label: "Info",     pill: "border-blue-500/30 bg-blue-500/10 text-blue-500" },
} as const;

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const schema = z.object({
  title:       z.string().min(1, "Required").max(200),
  service:     z.string().min(1, "Required").max(100),
  severity:    z.enum(["critical", "warning", "info"]).default("warning"),
  description: z.string().max(1000).optional(),
});
type FormValues = z.infer<typeof schema>;

function AlertDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateAlert();
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { severity: "warning" },
  });
  const onSubmit = async (v: FormValues) => {
    try { await create.mutateAsync(v); toast.success("Alert created"); onClose(); }
    catch { toast.error("Something went wrong"); }
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Create Alert</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input {...register("title")} placeholder="Redis response time > 300ms" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Service</Label>
              <Input {...register("service")} placeholder="Redis Cache" />
              {errors.service && <p className="text-xs text-destructive">{errors.service.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Severity</Label>
              <Select defaultValue={watch("severity")} onValueChange={(v) => setValue("severity", v as FormValues["severity"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
            <Input {...register("description")} placeholder="Additional context..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Create Alert
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AlertRow({ alert, canManage, isAdmin }: { alert: DevOpsAlert; canManage: boolean; isAdmin: boolean }) {
  const resolve = useResolveAlert();
  const del = useDeleteAlert();
  const meta = SEV[alert.severity];
  const Icon = meta.icon;

  return (
    <div className={cn("flex items-center gap-4 px-6 py-4 transition hover:bg-muted/20", alert.resolved && "opacity-60")}>
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border", meta.bg, meta.border)}>
        <Icon className={cn("h-4 w-4", meta.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold text-foreground">{alert.title}</p>
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", meta.pill)}>{meta.label}</span>
        </div>
        <p className={cn("mt-0.5 text-muted-foreground", TEXT.meta)}>{alert.service}</p>
        {alert.description && <p className={cn("mt-0.5 text-muted-foreground truncate", TEXT.meta)}>{alert.description}</p>}
      </div>
      <div className="hidden md:block text-right shrink-0">
        {alert.resolved
          ? <p className={cn("text-emerald-500 font-medium", TEXT.meta)}>Resolved {alert.resolvedAt ? timeAgo(alert.resolvedAt) : ""}</p>
          : <p className={cn("text-muted-foreground", TEXT.meta)}>{timeAgo(alert.createdAt)}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {canManage && !alert.resolved && (
          <Button variant="ghost" size="icon" title="Resolve" className="h-8 w-8 hover:text-emerald-500"
            disabled={resolve.isPending}
            onClick={async () => { await resolve.mutateAsync(alert.id); toast.success("Alert resolved"); }}>
            <CheckCircle className="h-3.5 w-3.5" />
          </Button>
        )}
        {isAdmin && (
          <Button variant="ghost" size="icon" title="Delete" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
            disabled={del.isPending}
            onClick={async () => { await del.mutateAsync(alert.id); toast.success("Alert deleted"); }}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DevOpsAlertsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const canManage = isAdmin || user?.role === "manager";
  const { data, isLoading, error, refetch, isFetching } = useDevOpsAlerts();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorFallback error={error as Error} resetErrorBoundary={() => refetch()} />;

  const list = data ?? [];
  const active = list.filter((a) => !a.resolved);
  const resolved = list.filter((a) => a.resolved);
  const critical = active.filter((a) => a.severity === "critical").length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
              DevOps Hub · Alerts
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Alerts</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Active incidents and infrastructure notifications.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {critical > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">{critical} critical</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2">
              <Bell className="h-4 w-4 text-amber-500 shrink-0" />
              <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{active.length} active</span>
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <p className={cn("text-muted-foreground", TEXT.meta)}>{list.length} total · auto-refresh every 30s</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />Refresh
            </Button>
            {canManage && (
              <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-3.5 w-3.5" />Create Alert
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Active */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-[1.75rem] border border-border bg-card shadow-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-semibold text-foreground">Active</span>
          <span className={cn("ml-auto text-muted-foreground", TEXT.meta)}>{active.length}</span>
        </div>
        {active.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-8 text-sm text-muted-foreground">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            All clear — no active alerts
          </div>
        ) : (
          <div className="divide-y divide-border">
            {active.map((a) => <AlertRow key={a.id} alert={a} canManage={canManage} isAdmin={isAdmin} />)}
          </div>
        )}
      </motion.div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-[1.75rem] border border-border bg-card shadow-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border px-6 py-4">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-semibold text-foreground">Resolved</span>
            <span className={cn("ml-auto text-muted-foreground", TEXT.meta)}>{resolved.length}</span>
          </div>
          <div className="divide-y divide-border">
            {resolved.map((a) => <AlertRow key={a.id} alert={a} canManage={canManage} isAdmin={isAdmin} />)}
          </div>
        </motion.div>
      )}

      {dialogOpen && <AlertDialog onClose={() => setDialogOpen(false)} />}
    </div>
  );
}
