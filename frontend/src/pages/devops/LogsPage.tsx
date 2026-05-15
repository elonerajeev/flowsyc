import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  AlertTriangle, Cloud, Download, Edit2, Key, Loader2,
  Plus, RefreshCw, Terminal, Trash2, Wifi,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import {
  useLogSources, useLogSourceLogs, useCreateLogSource,
  useUpdateLogSource, useDeleteLogSource, useRegenerateLogSourceKey,
  type DevOpsLogSource, type CreateLogSourceInput,
} from "@/services/devops-log-sources";
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

// ─── Provider config ──────────────────────────────────────────────────────────
const PROVIDERS = [
  { value: "aws-cloudwatch", label: "AWS CloudWatch",  icon: Cloud,    color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30" },
  { value: "ec2-syslog",     label: "EC2 Syslog",      icon: Terminal, color: "text-blue-500",   bg: "bg-blue-500/10 border-blue-500/30" },
  { value: "generic",        label: "Generic / HTTP",  icon: Wifi,     color: "text-emerald-500",bg: "bg-emerald-500/10 border-emerald-500/30" },
] as const;

type ProviderValue = typeof PROVIDERS[number]["value"];

const LEVEL_COLOR: Record<string, string> = {
  error: "text-red-400", warn: "text-amber-400",
  info: "text-blue-400", http: "text-emerald-400",
  debug: "text-slate-500",
};

function providerMeta(provider: string) {
  return PROVIDERS.find((p) => p.value === provider) ?? PROVIDERS[2];
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

// ─── Form schema ──────────────────────────────────────────────────────────────
const schema = z.object({
  name:        z.string().min(1, "Required").max(120),
  provider:    z.string().min(1),
  environment: z.string().min(1).max(50).default("production"),
  endpoint:    z.string().url("Must be a valid URL").optional().or(z.literal("")),
  // CloudWatch fields
  region:      z.string().optional(),
  roleArn:     z.string().optional(),
  logGroupName:z.string().optional(),
  // Generic auth
  authType:    z.enum(["api_key", "bearer", "custom_header"]).default("api_key"),
  headerName:  z.string().optional(),
  headerValue: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function SourceDialog({ source, onClose }: { source?: DevOpsLogSource; onClose: () => void }) {
  const create = useCreateLogSource();
  const update = useUpdateLogSource();
  const isPending = create.isPending || update.isPending;

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: source ? {
      name: source.name,
      provider: source.provider,
      environment: source.environment,
      endpoint: source.endpoint ?? "",
      authType: source.authType,
      region: (source.authConfig as any)?.region ?? "",
      roleArn: (source.authConfig as any)?.roleArn ?? "",
      logGroupName: (source.authConfig as any)?.logGroupName ?? "",
      headerName: (source.authConfig as any)?.headerName ?? "",
      headerValue: "",
    } : { provider: "aws-cloudwatch", environment: "production", authType: "api_key" },
  });

  const provider = watch("provider") as ProviderValue;
  const isCloudWatch = provider === "aws-cloudwatch";

  const onSubmit = async (v: FormValues) => {
    const authConfig: Record<string, string> = {};
    if (isCloudWatch) {
      if (v.region) authConfig.region = v.region;
      if (v.roleArn) authConfig.roleArn = v.roleArn;
      if (v.logGroupName) authConfig.logGroupName = v.logGroupName;
    } else {
      if (v.headerName) authConfig.headerName = v.headerName;
      if (v.headerValue) authConfig.headerValue = v.headerValue;
    }

    const payload: CreateLogSourceInput = {
      name: v.name, provider: v.provider, environment: v.environment,
      authType: isCloudWatch ? "custom_header" : v.authType,
      ...(v.endpoint ? { endpoint: v.endpoint } : {}),
      ...(Object.keys(authConfig).length ? { authConfig } : {}),
    };

    try {
      if (source) { await update.mutateAsync({ id: source.id, ...payload }); toast.success("Source updated"); }
      else { await create.mutateAsync(payload); toast.success("Log source added"); }
      onClose();
    } catch { toast.error("Something went wrong"); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DevOpsDialogHeader
            icon={Terminal}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10 border-emerald-500/30"
            title={source ? "Edit Log Source" : "Add Log Source"}
            description="Connect a log provider to stream and view logs in the DevOps Hub."
          />
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input {...register("name")} placeholder="Production API Logs" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Environment</Label>
              <Input {...register("environment")} placeholder="production" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Provider</Label>
            <Select defaultValue={watch("provider")} onValueChange={(v) => setValue("provider", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* CloudWatch fields */}
          {isCloudWatch && (
            <div className="space-y-3 rounded-xl border border-orange-500/20 bg-orange-500/5 p-4">
              <p className={cn("font-semibold text-orange-500", TEXT.meta)}>AWS CloudWatch Configuration</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Region</Label>
                  <Input {...register("region")} placeholder="us-east-1" />
                </div>
                <div className="space-y-1.5">
                  <Label>Log Group Name</Label>
                  <Input {...register("logGroupName")} placeholder="/aws/lambda/my-function" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>IAM Role ARN</Label>
                <Input {...register("roleArn")} placeholder="arn:aws:iam::123456789:role/LogsReadRole" className="font-mono text-xs" />
                <p className={cn("text-muted-foreground", TEXT.meta)}>The backend will assume this role to read CloudWatch logs securely.</p>
              </div>
            </div>
          )}

          {/* Generic / EC2 fields */}
          {!isCloudWatch && (
            <>
              <div className="space-y-1.5">
                <Label>Endpoint URL <span className="text-muted-foreground">(optional)</span></Label>
                <Input {...register("endpoint")} placeholder="https://logs.example.com/stream" />
                {errors.endpoint && <p className="text-xs text-destructive">{errors.endpoint.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Auth Header Name</Label>
                  <Input {...register("headerName")} placeholder="X-Api-Key" />
                </div>
                <div className="space-y-1.5">
                  <Label>Auth Header Value</Label>
                  <Input {...register("headerValue")} type="password" placeholder="secret" />
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              {source ? "Save Changes" : "Add Source"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Log viewer panel ─────────────────────────────────────────────────────────
function LogViewer({ source, onClose }: { source: DevOpsLogSource; onClose: () => void }) {
  const [limit, setLimit] = useState(200);
  const { data, isLoading, error, refetch, isFetching } = useLogSourceLogs(source.id, limit, true);
  const meta = providerMeta(source.provider);
  const Icon = meta.icon;
  const logs = data ?? [];

  const exportLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.level.toUpperCase().padEnd(7)} ${l.message}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = `${source.name}-logs.txt`;
    a.click();
  };

  return (
    <div className="rounded-[1.75rem] border border-border bg-card shadow-card overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl border", meta.bg)}>
          <Icon className={cn("h-4 w-4", meta.color)} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{source.name}</p>
          <p className={cn("text-muted-foreground", TEXT.meta)}>{source.environment} · {meta.label}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 lines</SelectItem>
              <SelectItem value="200">200 lines</SelectItem>
              <SelectItem value="500">500 lines</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportLogs} disabled={logs.length === 0}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <span className="text-sm">✕</span>
          </Button>
        </div>
      </div>

      <div className="h-[420px] overflow-y-auto bg-[#0d1117] p-4 font-mono text-xs">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center gap-2 text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Failed to load logs — check source configuration</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-slate-600">
            No logs yet. Push logs via the ingest endpoint or wait for CloudWatch sync.
          </div>
        ) : (
          <div className="space-y-0.5">
            {logs.map((l, i) => (
              <div key={i} className="flex gap-3 leading-5 hover:bg-white/5 px-1 rounded">
                <span className="shrink-0 text-slate-600 select-none">
                  {new Date(l.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                <span className={cn("shrink-0 w-10 font-semibold", LEVEL_COLOR[l.level] ?? "text-slate-400")}>
                  {l.level.slice(0, 4).toUpperCase()}
                </span>
                <span className="text-slate-300 break-all">{l.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DevOpsLogsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: sources, isLoading, error, refetch, isFetching } = useLogSources(true);
  const deleteSource = useDeleteLogSource();
  const regenerateKey = useRegenerateLogSourceKey();

  const [dialog, setDialog] = useState<{ open: boolean; source?: DevOpsLogSource }>({ open: false });
  const [activeSource, setActiveSource] = useState<DevOpsLogSource | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorFallback error={error as Error} resetErrorBoundary={() => refetch()} />;

  const list = sources ?? [];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
              <Terminal className="h-3.5 w-3.5 text-emerald-500" />
              DevOps Hub · Logs
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Log Sources</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Connect AWS CloudWatch, EC2 syslog or any HTTP endpoint. Click a source to view its logs.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-2">
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />Refresh
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => setDialog({ open: true })} className="gap-2">
                <Plus className="h-3.5 w-3.5" />Add Source
              </Button>
            )}
          </div>
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <p className={cn("text-muted-foreground", TEXT.meta)}>
            {list.length} source{list.length !== 1 ? "s" : ""} configured
          </p>
        </div>
      </section>

      {/* Sources list */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-[1.75rem] border border-border bg-card shadow-card overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Configured Sources</span>
        </div>

        {list.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/30">
              <Terminal className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-foreground">No log sources yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Add CloudWatch, EC2 or a custom HTTP endpoint to start viewing logs.</p>
            </div>
            {isAdmin && (
              <Button onClick={() => setDialog({ open: true })} className="gap-2 mt-1">
                <Plus className="h-4 w-4" />Add First Source
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {list.map((src) => {
              const meta = providerMeta(src.provider);
              const Icon = meta.icon;
              const isActive = activeSource?.id === src.id;

              return (
                <div
                  key={src.id}
                  className={cn(
                    "flex items-center gap-4 px-6 py-4 transition cursor-pointer",
                    isActive ? "bg-muted/30" : "hover:bg-muted/20",
                    !src.isActive && "opacity-60",
                  )}
                  onClick={() => setActiveSource(isActive ? null : src)}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border", meta.bg)}>
                    <Icon className={cn("h-4 w-4", meta.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground">{src.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                      <Badge variant="outline" className="text-[10px]">{src.environment}</Badge>
                      {!src.isActive && <Badge variant="outline" className="text-[10px] text-muted-foreground">Paused</Badge>}
                    </div>
                    <p className={cn("mt-0.5 text-muted-foreground truncate", TEXT.meta)}>
                      {src.lastIngestAt ? `Last log ${timeAgo(src.lastIngestAt)}` : "No logs yet"}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" title="Regenerate ingest key" className="h-8 w-8"
                          onClick={async () => {
                            await regenerateKey.mutateAsync(src.id);
                            toast.success("Ingest key regenerated");
                          }}>
                          <Key className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" className="h-8 w-8"
                          onClick={() => setDialog({ open: true, source: src })}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" className="h-8 w-8 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmDelete(src.id)}>
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

      {/* Log viewer — shown when a source is selected */}
      {activeSource && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <LogViewer source={activeSource} onClose={() => setActiveSource(null)} />
        </motion.div>
      )}

      {/* Dialogs */}
      {dialog.open && <SourceDialog source={dialog.source} onClose={() => setDialog({ open: false })} />}

      <Dialog open={confirmDelete !== null} onOpenChange={() => setConfirmDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Remove log source?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will delete the source and all stored log entries.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="destructive" disabled={deleteSource.isPending} onClick={async () => {
              if (confirmDelete === null) return;
              await deleteSource.mutateAsync(confirmDelete);
              if (activeSource?.id === confirmDelete) setActiveSource(null);
              toast.success("Source removed");
              setConfirmDelete(null);
            }}>
              {deleteSource.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
