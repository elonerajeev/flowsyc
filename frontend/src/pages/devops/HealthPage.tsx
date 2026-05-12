import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Activity, CheckCircle, Clock, Edit2, Loader2,
  Plus, RefreshCw, Server, Trash2, XCircle, Wifi,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import {
  useMonitoredServices, useCreateService, useUpdateService,
  useDeleteService, useManualCheck, type MonitoredService,
} from "@/services/monitoring";
import { cn } from "@/lib/utils";
import { RADIUS, TEXT } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS = {
  up:       { icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30", label: "Online",   dot: "bg-emerald-500" },
  degraded: { icon: Clock,       color: "text-amber-500",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   label: "Degraded", dot: "bg-amber-500" },
  down:     { icon: XCircle,     color: "text-red-500",     bg: "bg-red-500/10",     border: "border-red-500/30",     label: "Offline",  dot: "bg-red-500" },
  unknown:  { icon: Activity,    color: "text-muted-foreground", bg: "bg-muted/30",   border: "border-border",         label: "Unknown",  dot: "bg-muted-foreground" },
} as const;

// ─── Form ─────────────────────────────────────────────────────────────────────
const schema = z.object({
  name:           z.string().min(1, "Required").max(100),
  url:            z.string().min(1, "Required").max(500),
  checkType:      z.enum(["http", "tcp", "ping"]).default("http"),
  intervalSecs:   z.coerce.number().int().min(10).max(3600).default(30),
  timeoutMs:      z.coerce.number().int().min(500).max(30000).default(5000),
  expectedStatus: z.coerce.number().int().min(100).max(599).default(200),
});
type FormValues = z.infer<typeof schema>;

function ServiceDialog({ service, onClose }: { service?: MonitoredService; onClose: () => void }) {
  const create = useCreateService();
  const update = useUpdateService();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: service
      ? { name: service.name, url: service.url, checkType: service.checkType, intervalSecs: service.intervalSecs, timeoutMs: service.timeoutMs, expectedStatus: service.expectedStatus ?? 200 }
      : { checkType: "http", intervalSecs: 30, timeoutMs: 5000, expectedStatus: 200 },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (service) {
        await update.mutateAsync({ id: service.id, ...values });
        toast.success("Service updated");
      } else {
        await create.mutateAsync(values);
        toast.success("Service added — first check running");
      }
      onClose();
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{service ? "Edit Service" : "Add Monitored Service"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input {...register("name")} placeholder="Backend API" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>URL / Endpoint</Label>
            <Input {...register("url")} placeholder="https://api.example.com/health" />
            {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Check Type</Label>
              <Select defaultValue={watch("checkType")} onValueChange={(v) => setValue("checkType", v as "http" | "tcp" | "ping")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                  <SelectItem value="ping">Ping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Interval (sec)</Label>
              <Input {...register("intervalSecs")} type="number" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Timeout (ms)</Label>
              <Input {...register("timeoutMs")} type="number" />
            </div>
            <div className="space-y-1.5">
              <Label>Expected Status</Label>
              <Input {...register("expectedStatus")} type="number" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {service ? "Save Changes" : "Add Service"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DevOpsHealthPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: services, isLoading, error, refetch, isFetching } = useMonitoredServices();
  const deleteService = useDeleteService();
  const manualCheck = useManualCheck();

  const [dialog, setDialog] = useState<{ open: boolean; service?: MonitoredService }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorFallback error={error as Error} resetErrorBoundary={() => refetch()} />;

  const list = services ?? [];
  const counts = {
    up:       list.filter((s) => s.latestCheck?.status === "up").length,
    degraded: list.filter((s) => s.latestCheck?.status === "degraded").length,
    down:     list.filter((s) => !s.latestCheck || s.latestCheck.status === "down").length,
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className={cn(
              "inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground",
              TEXT.eyebrow,
            )}>
              <Server className="h-3.5 w-3.5 text-emerald-500" />
              DevOps Hub · Health
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Service Health</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Monitor uptime, response times and availability across all your services and infrastructure endpoints.
              </p>
            </div>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2">
              <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{counts.up} online</span>
            </div>
            {counts.degraded > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-2">
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">{counts.degraded} degraded</span>
              </div>
            )}
            {counts.down > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2">
                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400">{counts.down} offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <p className={cn("text-muted-foreground", TEXT.meta)}>
            {list.length} service{list.length !== 1 ? "s" : ""} monitored · auto-refresh every 30s
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => setDialog({ open: true })} className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                Add Service
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Services table */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-[1.75rem] border border-border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Wifi className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Monitored Services</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className={cn("text-muted-foreground", TEXT.meta)}>Live</span>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <Server className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">No services yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your first service to start monitoring its health and uptime.</p>
            </div>
            {isAdmin && (
              <Button onClick={() => setDialog({ open: true })} className="gap-2 mt-1">
                <Plus className="h-4 w-4" /> Add First Service
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {list.map((svc) => {
              const statusKey = (svc.latestCheck?.status ?? "unknown") as keyof typeof STATUS;
              const meta = STATUS[statusKey];
              const Icon = meta.icon;
              const isChecking = manualCheck.isPending && manualCheck.variables === svc.id;

              return (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-4 px-6 py-4 transition hover:bg-muted/20"
                >
                  {/* Status icon */}
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border", meta.bg, meta.border)}>
                    <Icon className={cn("h-4.5 w-4.5", meta.color)} />
                  </div>

                  {/* Name + URL */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">{svc.checkType}</Badge>
                      {!svc.isActive && <Badge variant="outline" className="text-[10px]">Paused</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{svc.url}</p>
                  </div>

                  {/* Status + response */}
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                    <span className={cn("text-sm font-medium", meta.color)}>{meta.label}</span>
                  </div>

                  <div className="hidden md:block text-right shrink-0 w-16">
                    <p className="text-sm font-semibold text-foreground">
                      {svc.latestCheck?.responseMs != null ? `${svc.latestCheck.responseMs}ms` : "—"}
                    </p>
                    <p className={cn("text-muted-foreground", TEXT.meta)}>response</p>
                  </div>

                  <div className="hidden lg:block text-right shrink-0 w-20">
                    <p className={cn("text-muted-foreground", TEXT.meta)}>
                      {svc.latestCheck
                        ? new Date(svc.latestCheck.checkedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "Never"}
                    </p>
                    <p className={cn("text-muted-foreground", TEXT.meta)}>last check</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon"
                      title="Check now"
                      disabled={isChecking}
                      onClick={() => manualCheck.mutate(svc.id)}
                      className="h-8 w-8"
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", isChecking && "animate-spin")} />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button
                          variant="ghost" size="icon"
                          title="Edit"
                          onClick={() => setDialog({ open: true, service: svc })}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          title="Remove"
                          onClick={() => setConfirmDelete(svc.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Add/Edit dialog */}
      {dialog.open && (
        <ServiceDialog service={dialog.service} onClose={() => setDialog({ open: false })} />
      )}

      {/* Delete confirm */}
      <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove service?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will stop monitoring and permanently delete all check history for this service.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteService.isPending}
              onClick={async () => {
                if (confirmDelete === null) return;
                await deleteService.mutateAsync(confirmDelete);
                toast.success("Service removed");
                setConfirmDelete(null);
              }}
            >
              {deleteService.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
