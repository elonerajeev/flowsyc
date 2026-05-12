import { useState } from "react";
import { Activity, CheckCircle, Clock, Edit2, Loader2, Plus, RefreshCw, Trash2, XCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";

import { useAuth } from "@/contexts/AuthContext";
import {
  useMonitoredServices, useCreateService, useUpdateService,
  useDeleteService, useManualCheck, type MonitoredService,
} from "@/services/monitoring";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";

// ─── Status meta ─────────────────────────────────────────────────────────────
const STATUS = {
  up:       { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Online",   dot: "bg-emerald-400" },
  degraded: { icon: Clock,       color: "text-amber-400",   bg: "bg-amber-500/10",   label: "Degraded", dot: "bg-amber-400" },
  down:     { icon: XCircle,     color: "text-red-400",     bg: "bg-red-500/10",     label: "Offline",  dot: "bg-red-400" },
  unknown:  { icon: Activity,    color: "text-muted-foreground", bg: "bg-muted/30",   label: "Unknown",  dot: "bg-muted-foreground" },
};

// ─── Form schema ──────────────────────────────────────────────────────────────
const schema = z.object({
  name:           z.string().min(1, "Required").max(100),
  url:            z.string().min(1, "Required").max(500),
  checkType:      z.enum(["http", "tcp", "ping"]).default("http"),
  intervalSecs:   z.coerce.number().int().min(10).max(3600).default(30),
  timeoutMs:      z.coerce.number().int().min(500).max(30000).default(5000),
  expectedStatus: z.coerce.number().int().min(100).max(599).default(200),
});
type FormValues = z.infer<typeof schema>;

// ─── Add/Edit Dialog ──────────────────────────────────────────────────────────
function ServiceDialog({
  service,
  onClose,
}: {
  service?: MonitoredService;
  onClose: () => void;
}) {
  const create = useCreateService();
  const update = useUpdateService();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: service
      ? { name: service.name, url: service.url, checkType: service.checkType, intervalSecs: service.intervalSecs, timeoutMs: service.timeoutMs, expectedStatus: service.expectedStatus ?? 200 }
      : { checkType: "http", intervalSecs: 30, timeoutMs: 5000, expectedStatus: 200 },
  });

  const onSubmit = async (values: FormValues) => {
    if (service) {
      await update.mutateAsync({ id: service.id, ...values });
    } else {
      await create.mutateAsync(values);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={cn("w-full max-w-md border border-border bg-card shadow-2xl", RADIUS.xl)}>
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">{service ? "Edit Service" : "Add Service"}</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Name</label>
            <input {...register("name")} placeholder="Backend API" className={cn("w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary", RADIUS.lg)} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          {/* URL */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">URL / Host</label>
            <input {...register("url")} placeholder="https://api.example.com/health" className={cn("w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary", RADIUS.lg)} />
            {errors.url && <p className="mt-1 text-xs text-destructive">{errors.url.message}</p>}
          </div>
          {/* Check type + interval */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Check Type</label>
              <select {...register("checkType")} className={cn("w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary", RADIUS.lg)}>
                <option value="http">HTTP</option>
                <option value="tcp">TCP</option>
                <option value="ping">Ping</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Interval (sec)</label>
              <input {...register("intervalSecs")} type="number" className={cn("w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary", RADIUS.lg)} />
            </div>
          </div>
          {/* Timeout + expected status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Timeout (ms)</label>
              <input {...register("timeoutMs")} type="number" className={cn("w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary", RADIUS.lg)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Expected Status</label>
              <input {...register("expectedStatus")} type="number" className={cn("w-full border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary", RADIUS.lg)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={cn("px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 transition", RADIUS.lg)}>Cancel</button>
            <button type="submit" disabled={isPending} className={cn("flex items-center gap-2 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50", RADIUS.lg)}>
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {service ? "Save" : "Add Service"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Page header — matches CRM page style */}
      <motion.section
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card"
      >
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500" />
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-emerald-500/5 to-blue-500/5 blur-3xl" />

        <div className={cn("relative", SPACING.card)}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Activity className="h-3.5 w-3.5 text-emerald-500" />
                DevOps Hub
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                <span className="bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent">Service</span> Health
              </h1>
              <p className={cn("max-w-xl text-muted-foreground", TEXT.bodyRelaxed)}>
                Real-time uptime monitoring for all your services, APIs and infrastructure endpoints.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
                Refresh
              </Button>
              {isAdmin && (
                <Button size="sm" onClick={() => setDialog({ open: true })} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Service
                </Button>
              )}
            </div>
          </div>

          {/* Summary stats inline */}
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-border/60 pt-5">
            {[
              { label: "Online",   count: counts.up,       color: "text-emerald-500", bg: "bg-emerald-500/10", dot: "bg-emerald-500" },
              { label: "Degraded", count: counts.degraded,  color: "text-amber-500",   bg: "bg-amber-500/10",   dot: "bg-amber-500" },
              { label: "Offline",  count: counts.down,      color: "text-red-500",     bg: "bg-red-500/10",     dot: "bg-red-500" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", s.bg)}>
                  <span className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
                </div>
                <div>
                  <p className={cn("text-2xl font-bold", s.color)}>{s.count}</p>
                  <p className={cn("text-muted-foreground", TEXT.meta)}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Services list */}
      <div className={cn("border border-border overflow-hidden", RADIUS.xl)}>
        <div className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Monitored Services</span>
          <span className="ml-auto text-xs text-muted-foreground">{list.length} services</span>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm font-semibold text-foreground">No services monitored yet</p>
            <p className="text-xs text-muted-foreground">Add a service to start monitoring its health</p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setDialog({ open: true })}
                className={cn("mt-2 flex items-center gap-1.5 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110", RADIUS.lg)}
              >
                <Plus className="h-3.5 w-3.5" /> Add First Service
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border bg-card">
            {list.map((svc) => {
              const statusKey = (svc.latestCheck?.status ?? "unknown") as keyof typeof STATUS;
              const meta = STATUS[statusKey];
              const Icon = meta.icon;
              const isChecking = manualCheck.isPending && manualCheck.variables === svc.id;

              return (
                <div key={svc.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center", RADIUS.lg, meta.bg)}>
                    <Icon className={cn("h-4 w-4", meta.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{svc.name}</p>
                      <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">{svc.checkType}</span>
                      {!svc.isActive && <span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Paused</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate">{svc.url}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
                      <p className={cn("text-xs font-semibold", meta.color)}>{meta.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {svc.latestCheck?.responseMs != null ? `${svc.latestCheck.responseMs}ms` : "—"}
                    </p>
                  </div>

                  <div className="text-right shrink-0 w-20">
                    <p className="text-xs text-muted-foreground">
                      {svc.latestCheck ? new Date(svc.latestCheck.checkedAt).toLocaleTimeString() : "Never"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Check now"
                      disabled={isChecking}
                      onClick={() => manualCheck.mutate(svc.id)}
                      className={cn("flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40", RADIUS.md)}
                    >
                      <RefreshCw className={cn("h-3.5 w-3.5", isChecking && "animate-spin")} />
                    </button>
                    {isAdmin && (
                      <>
                        <button
                          type="button"
                          title="Edit"
                          onClick={() => setDialog({ open: true, service: svc })}
                          className={cn("flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:bg-muted hover:text-foreground", RADIUS.md)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="Delete"
                          onClick={() => setConfirmDelete(svc.id)}
                          className={cn("flex h-7 w-7 items-center justify-center text-muted-foreground transition hover:bg-red-500/10 hover:text-red-400", RADIUS.md)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit dialog */}
      {dialog.open && (
        <ServiceDialog
          service={dialog.service}
          onClose={() => setDialog({ open: false })}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={cn("w-full max-w-sm border border-border bg-card p-6 shadow-2xl", RADIUS.xl)}>
            <h2 className="text-base font-semibold text-foreground">Remove service?</h2>
            <p className="mt-2 text-sm text-muted-foreground">This will stop monitoring and delete all check history.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(null)} className={cn("px-4 py-2 text-sm border border-border hover:bg-muted/50 transition", RADIUS.lg)}>Cancel</button>
              <button
                type="button"
                onClick={async () => { await deleteService.mutateAsync(confirmDelete); setConfirmDelete(null); }}
                disabled={deleteService.isPending}
                className={cn("flex items-center gap-2 bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:brightness-110 disabled:opacity-50", RADIUS.lg)}
              >
                {deleteService.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
