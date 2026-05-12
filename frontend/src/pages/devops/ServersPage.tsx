import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Edit2, Loader2, Pause, Play, Plus,
  RefreshCw, Server, Signal, Trash2, Wifi,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import {
  useServers, useCreateServer, useUpdateServer,
  useDeleteServer, usePingServer, type MonitoredServer,
} from "@/services/servers";
import { cn } from "@/lib/utils";
import { TEXT } from "@/lib/design-tokens";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";

// ─── Form schema ──────────────────────────────────────────────────────────────
const schema = z.object({
  name:     z.string().min(1, "Required").max(100),
  ip:       z.string().min(1, "Required").refine(
    (v) => /^(\d{1,3}\.){3}\d{1,3}$/.test(v) || /^[a-zA-Z0-9._-]+$/.test(v),
    "Must be a valid IP address or hostname"
  ),
  port:     z.coerce.number().int().min(1).max(65535).default(22),
  provider: z.string().max(100).optional(),
  region:   z.string().max(100).optional(),
});
type FormValues = z.infer<typeof schema>;

// ─── Add/Edit dialog ──────────────────────────────────────────────────────────
function ServerDialog({ server, onClose }: { server?: MonitoredServer; onClose: () => void }) {
  const create = useCreateServer();
  const update = useUpdateServer();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: server
      ? { name: server.name, ip: server.ip, port: server.port, provider: server.provider ?? "", region: server.region ?? "" }
      : { port: 22 },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      if (server) { await update.mutateAsync({ id: server.id, ...values }); toast.success("Server updated"); }
      else { await create.mutateAsync(values); toast.success("Server added"); }
      onClose();
    } catch { toast.error("Something went wrong"); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{server ? "Edit Server" : "Add Server"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input {...register("name")} placeholder="prod-api-1" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label>IP / Hostname</Label>
              <Input {...register("ip")} placeholder="185.27.134.55" />
              {errors.ip && <p className="text-xs text-destructive">{errors.ip.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Port</Label>
              <Input {...register("port")} type="number" placeholder="22" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Provider <span className="text-muted-foreground">(optional)</span></Label>
              <Input {...register("provider")} placeholder="AWS EC2" />
            </div>
            <div className="space-y-1.5">
              <Label>Region <span className="text-muted-foreground">(optional)</span></Label>
              <Input {...register("region")} placeholder="us-east-1" />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {server ? "Save Changes" : "Add Server"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function DevOpsServersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: servers, isLoading, error, refetch, isFetching } = useServers();
  const update = useUpdateServer();
  const deleteServer = useDeleteServer();
  const ping = usePingServer();

  const [dialog, setDialog] = useState<{ open: boolean; server?: MonitoredServer }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  // Track live ping results per server
  const [pingResults, setPingResults] = useState<Record<number, { reachable: boolean; responseMs: number | null } | null>>({});

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorFallback error={error as Error} resetErrorBoundary={() => refetch()} />;

  const list = servers ?? [];
  const active = list.filter((s) => s.isActive);

  const handlePing = async (id: number) => {
    setPingResults((p) => ({ ...p, [id]: null }));
    const result = await ping.mutateAsync(id);
    setPingResults((p) => ({ ...p, [id]: result }));
    toast[result.reachable ? "success" : "error"](
      result.reachable ? `Reachable · ${result.responseMs}ms` : "Unreachable"
    );
  };

  const togglePause = async (svc: MonitoredServer) => {
    await update.mutateAsync({ id: svc.id, isActive: !svc.isActive });
    toast.success(svc.isActive ? "Monitoring paused" : "Monitoring resumed");
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ── */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
              <Server className="h-3.5 w-3.5 text-blue-500" />
              DevOps Hub · Servers
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Servers</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Track and ping your infrastructure nodes — EC2 instances, VPS, databases and more.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2">
              <Server className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{list.length} server{list.length !== 1 ? "s" : ""}</span>
            </div>
            {active.length !== list.length && (
              <div className="flex items-center gap-2 rounded-full border border-muted/50 bg-muted/30 px-4 py-2">
                <span className={cn("text-sm font-medium text-muted-foreground", TEXT.meta)}>{list.length - active.length} paused</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <p className={cn("text-muted-foreground", TEXT.meta)}>
            {active.length} active · auto-refresh every 60s
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => setDialog({ open: true })} className="gap-2">
                <Plus className="h-3.5 w-3.5" /> Add Server
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* ── Servers list ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-[1.75rem] border border-border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Wifi className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Infrastructure Nodes</span>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
            <span className={cn("text-muted-foreground", TEXT.meta)}>Live</span>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <Server className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">No servers yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add your first server to track its reachability.</p>
            </div>
            {isAdmin && (
              <Button onClick={() => setDialog({ open: true })} className="gap-2 mt-1">
                <Plus className="h-4 w-4" /> Add First Server
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {list.map((srv) => {
              const isPinging = ping.isPending && ping.variables === srv.id;
              const pingResult = pingResults[srv.id];

              return (
                <div key={srv.id} className={cn("flex items-center gap-4 px-6 py-4 transition hover:bg-muted/20", !srv.isActive && "opacity-60")}>

                  {/* Icon */}
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10">
                      <Server className="h-4 w-4 text-blue-500" />
                    </div>
                    {pingResult !== undefined && (
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                        pingResult === null ? "bg-muted-foreground animate-pulse" :
                        pingResult.reachable ? "bg-emerald-500" : "bg-red-500"
                      )} />
                    )}
                  </div>

                  {/* Name + IP */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{srv.name}</p>
                      {srv.provider && <Badge variant="secondary" className="text-[10px]">{srv.provider}</Badge>}
                      {srv.region && <Badge variant="outline" className="text-[10px]">{srv.region}</Badge>}
                      {!srv.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Paused</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground font-mono">{srv.ip}:{srv.port}</p>
                  </div>

                  {/* Tags */}
                  {srv.tags.length > 0 && (
                    <div className="hidden lg:flex items-center gap-1 shrink-0">
                      {srv.tags.slice(0, 3).map((t) => (
                        <span key={t} className="rounded-md bg-muted/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Ping result */}
                  <div className="hidden md:block text-right shrink-0 w-24">
                    {pingResult !== undefined && pingResult !== null && (
                      <>
                        <p className={cn("text-sm font-semibold", pingResult.reachable ? "text-emerald-500" : "text-red-500")}>
                          {pingResult.reachable ? (pingResult.responseMs != null ? `${pingResult.responseMs}ms` : "Reachable") : "Unreachable"}
                        </p>
                        <p className={cn("text-muted-foreground", TEXT.meta)}>last ping</p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" title="Ping" disabled={isPinging} onClick={() => handlePing(srv.id)} className="h-8 w-8">
                      <Signal className={cn("h-3.5 w-3.5", isPinging && "animate-pulse")} />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" title={srv.isActive ? "Pause" : "Resume"} onClick={() => togglePause(srv)} className="h-8 w-8">
                          {srv.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => setDialog({ open: true, server: srv })} className="h-8 w-8">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Remove" onClick={() => setConfirmDelete(srv.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Dialogs */}
      {dialog.open && <ServerDialog server={dialog.server} onClose={() => setDialog({ open: false })} />}

      <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove server?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will remove the server from monitoring.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteServer.isPending} onClick={async () => {
              if (confirmDelete === null) return;
              await deleteServer.mutateAsync(confirmDelete);
              toast.success("Server removed");
              setConfirmDelete(null);
            }}>
              {deleteServer.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
