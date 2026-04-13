import { startTransition, useDeferredValue, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  HeartPulse,
  MapPin,
  Plus,
  Search,
  Pin,
  ShieldCheck,
  Users,
  Edit2,
  Trash2,
  RefreshCw,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { PrivacyValue } from "@/components/shared/PrivacyValue";
import StatusBadge from "@/components/shared/StatusBadge";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useClients, crmKeys } from "@/hooks/use-crm-data";
import { useListPreferences } from "@/hooks/use-list-preferences";
import { useRefresh } from "@/hooks/use-refresh";
import { useExport } from "@/hooks/use-export";
import { getRefreshMessage, getRefreshSuccessMessage } from "@/lib/refresh-messages";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { crmService } from "@/services/crm";

const segmentOptions = ["all", "Expansion", "Renewal", "New Business"] as const;

export default function ClientsPage() {
  const { data: clients = [], isLoading, error: clientsError, refetch } = useClients();
  const { role } = useTheme();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const canViewCommercialInsights = role === "admin" || role === "manager";
  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin" || role === "manager";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [statusFilter, setStatusFilter] = useState("all");
  const [segment, setSegment] = useState<(typeof segmentOptions)[number]>("all");
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(4);
  const PAGE_SIZE = 4;
  const { refresh, isRefreshing } = useRefresh();

  const handleRefresh = async () => {
    await refresh(
      () => refetch(),
      {
        message: getRefreshMessage("clients"),
        successMessage: getRefreshSuccessMessage("clients"),
      }
    );
  };
  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.removeClient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.clients });
      toast.success("Client removed successfully");
    },
    onError: () => toast.error("Failed to remove client"),
  });
  const recalculateHealthMutation = useMutation({
    mutationFn: (id: number) => crmService.recalculateClientHealth(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.clients });
      queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
      toast.success("Client health recalculated");
    },
    onError: () => toast.error("Failed to recalculate client health"),
  });

  const { exportData, isExporting, LoadingProgressComponent } = useExport();

  const { orderedItems: preferredClients, pinnedIds, togglePin, move } = useListPreferences(
    `crm-clients-preferences-${role}`,
    clients,
    (client) => String(client.id),
  );

  const filtered = useMemo(() => {
    return preferredClients.filter((client) => {
      const searchMatch =
        client.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        client.industry.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        client.company.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        (canViewCommercialInsights && client.manager.toLowerCase().includes(deferredSearch.toLowerCase()));
      const statusMatch = statusFilter === "all" || client.status === statusFilter;
      const segmentMatch = segment === "all" || client.segment === segment;
      return searchMatch && statusMatch && segmentMatch;
    });
  }, [canViewCommercialInsights, deferredSearch, preferredClients, segment, statusFilter]);

  const overview = useMemo(() => {
    if (!canViewCommercialInsights) {
      return {
        total: clients.length,
        enterprise: clients.filter((client) => client.status === "active").length,
        avgHealth: clients.filter((client) => client.status === "pending").length,
        expansion: new Set(clients.map((client) => client.location)).size,
      };
    }

    const enterprise = clients.filter((client) => client.tier === "Enterprise" || client.tier === "Strategic").length;
    const avgHealth = clients.length
      ? Math.round(clients.reduce((sum, client) => sum + client.healthScore, 0) / clients.length)
      : 0;
    const expansion = clients.filter((client) => client.segment === "Expansion").length;

    return {
      total: clients.length,
      enterprise,
      avgHealth,
      expansion,
    };
  }, [canViewCommercialInsights, clients]);
  
  const handleExportCSV = () => {
    if (!clients.length) return;
    const headers = ["Name", "Company", "Industry", "Email", "Tier", "Status", "Revenue", "Manager"];
    const rows = clients.map(client => [
      client.name,
      client.company,
      client.industry,
      client.email,
      client.tier,
      client.status,
      client.revenue,
      client.manager,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(r => r.map(v => String(v).replace(/,/g, "")).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `crm_clients_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV export started");
  };

  if (isLoading) {
    return <PageLoader />;
  }
  if (clientsError) {
    return (
      <ErrorFallback
        title="Client data failed to load"
        error={clientsError}
        description="The client portfolio could not be loaded. Retry to refresh companies and contacts."
        onRetry={() => refetch()}
        retryLabel="Retry clients"
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-info to-success" />
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-primary/5 to-info/5 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-gradient-to-tr from-success/5 to-primary/5 blur-3xl" />

        <div className={cn("relative", SPACING.card)}>
          <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5 text-primary" />
                Portfolio
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">Client</span> Accounts
              </h1>
              <p className={cn("max-w-xl text-muted-foreground", TEXT.bodyRelaxed)}>
                Track account health, ownership, and next actions across your client portfolio.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/automation/gtm">
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  GTM Center
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
              {(role === "admin" || role === "manager") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportData("/api/system/export/clients/csv", "clients.csv", {
                    entityName: "clients",
                    estimatedTime: "15 seconds"
                  })}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export"}
                </Button>
              )}
              {canUseQuickCreate ? (
                <Button size="sm" onClick={() => openQuickCreate("client")} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Client
                </Button>
              ) : (
                <div className="inline-flex h-10 items-center rounded-xl border border-border/60 bg-secondary/40 px-4 text-xs font-medium text-muted-foreground">
                  Read only
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              canViewCommercialInsights
                ? { label: "Total Accounts", value: String(overview.total), icon: Building2, gradient: "from-primary to-primary/60" }
                : { label: "My Accounts", value: String(overview.total), icon: Building2, gradient: "from-primary to-primary/60" },
              canViewCommercialInsights
                ? { label: "Enterprise Tier", value: String(overview.enterprise), icon: ShieldCheck, gradient: "from-info to-info/60" }
                : { label: "Active Accounts", value: String(overview.enterprise), icon: ShieldCheck, gradient: "from-info to-info/60" },
              canViewCommercialInsights
                ? { label: "Avg Health", value: `${overview.avgHealth}%`, icon: HeartPulse, gradient: "from-success to-success/60" }
                : { label: "Pending", value: String(overview.avgHealth), icon: HeartPulse, gradient: "from-success to-success/60" },
              canViewCommercialInsights
                ? { label: "Expansion", value: String(overview.expansion), icon: ArrowUpRight, gradient: "from-warning to-warning/60" }
                : { label: "Locations", value: String(overview.expansion), icon: MapPin, gradient: "from-warning to-warning/60" },
            ].map((stat) => (
              <div key={stat.label} className={cn("relative overflow-hidden rounded-xl border border-border/40 bg-secondary/20 p-3", RADIUS.md)}>
                <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", stat.gradient)} />
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br border", stat.gradient, "text-white border-transparent")}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className={cn("text-muted-foreground", TEXT.meta)}>{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  const next = event.target.value;
                  startTransition(() => setSearch(next));
                }}
                placeholder="Search accounts, industries, or owners..."
                className="h-10 w-full rounded-xl border border-border/40 bg-background/70 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 rounded-xl border border-border/40 bg-background/70 px-4 text-sm outline-none transition-colors focus:border-primary/50"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </motion.section>

      <section className="flex flex-wrap gap-2">
        {segmentOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setSegment(option)}
            className={cn(
              "rounded-full px-4 py-2 text-xs font-semibold transition",
              segment === option
                ? "bg-gradient-to-r from-primary to-info text-white shadow-md"
                : "border border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50",
            )}
          >
            {option}
          </button>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          {clients.length === 0 ? (
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 text-center shadow-card">
              <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-primary via-info to-success" />
              <Building2 className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="font-display text-xl font-semibold text-foreground">No clients yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Add your first client to start tracking the portfolio.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-8 text-center shadow-card">
              <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-primary via-info to-success" />
              <p className="font-display text-xl font-semibold text-foreground">No clients found</p>
              <p className="mt-2 text-sm text-muted-foreground">Try a different search term or clear the filters.</p>
            </div>
          ) : (
            filtered.slice(0, visibleCount).map((client) => (
              <motion.article
                key={client.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                draggable
                onDragStart={() => setDraggedClientId(String(client.id))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedClientId) move(draggedClientId, String(client.id));
                  setDraggedClientId(null);
                }}
                onDragEnd={() => setDraggedClientId(null)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-all hover:border-border hover:shadow-lg",
                  pinnedIds.includes(String(client.id)) && "ring-1 ring-primary/20"
                )}
              >
                <div className="absolute left-0 top-0 h-0.5 w-0 bg-gradient-to-r from-primary to-info transition-all duration-300 group-hover:w-full" />
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => togglePin(String(client.id))}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl border transition",
                        pinnedIds.includes(String(client.id))
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-info/10 font-display text-lg font-bold text-foreground">
                      {client.avatar}
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold text-foreground">{client.name}</h2>
                      <p className="text-xs text-muted-foreground">{client.industry} · {client.tier}</p>
                      <p className="text-xs text-muted-foreground/60">
                        {canViewCommercialInsights ? client.manager : `${client.company} · ${client.location}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      {canEdit && (
                        <button
                          onClick={() => recalculateHealthMutation.mutate(client.id)}
                          className="p-1.5 rounded-full hover:bg-info/10 text-muted-foreground hover:text-info transition"
                          title="Recalculate health"
                        >
                          <HeartPulse className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => openQuickCreate("client", client)}
                          className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition"
                          title="Edit client"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove ${client.name}?`)) {
                              deleteMutation.mutate(client.id);
                            }
                          }}
                          className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                          title="Delete client"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <StatusBadge status={client.status} />
                    </div>
                    {canViewCommercialInsights ? (
                      <span className="text-xs text-muted-foreground"><PrivacyValue value={client.revenue} /></span>
                    ) : null}
                  </div>
                </div>

                {canViewCommercialInsights ? (
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Health Score</span>
                      <span className={cn("font-semibold",
                        client.healthScore >= 80 ? "text-success" :
                        client.healthScore >= 60 ? "text-warning" : "text-destructive"
                      )}>{client.healthScore}/100</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          client.healthScore >= 80 ? "bg-gradient-to-r from-success to-success/60" :
                          client.healthScore >= 60 ? "bg-gradient-to-r from-warning to-warning/60" : "bg-gradient-to-r from-destructive to-destructive/60"
                        )}
                        style={{ width: `${client.healthScore}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Next: {client.nextAction}</p>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2">{client.email}</div>
                    <div className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2">{client.phone}</div>
                  </div>
                )}
              </motion.article>
            ))
          )}
          <ShowMoreButton
            total={filtered.length}
            visible={visibleCount}
            pageSize={PAGE_SIZE}
            onShowMore={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, filtered.length))}
            onShowLess={() => setVisibleCount(PAGE_SIZE)}
          />
        </div>

        <aside className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card"
          >
            <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-primary to-info" />
            <div className="mb-4">
              <p className={cn("uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>Insights</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Portfolio Overview</h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              {canViewCommercialInsights ? (
                <>
                  <p>Health score is the primary risk signal for renewals and customer success follow-up.</p>
                  <p>Segment keeps revenue operations and CS routing clean when automation hooks are added.</p>
                  <p>Tier separates enterprise accounts from lighter-touch clients without changing the UI contract.</p>
                </>
              ) : (
                <>
                  <p>Your client view is intentionally limited to account-safe details tied to your login.</p>
                  <p>Internal ownership, revenue, and health scoring stay hidden outside admin and manager roles.</p>
                  <p>Use this page to review your active accounts and contact details without exposing internal CRM metadata.</p>
                </>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card"
          >
            <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-info to-success" />
            <div className="mb-4">
              <p className={cn("uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>Action Queue</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Top follow-ups</h2>
            </div>
            <div className="space-y-3">
              {filtered.length > 0 ? (
                <>
                {filtered.slice(0, visibleCount).map((client) => (
                  <div key={client.id} className="rounded-xl border border-border/40 bg-secondary/20 p-4 transition-colors hover:bg-secondary/30">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{client.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {canViewCommercialInsights ? client.nextAction : `${client.email} · ${client.phone}`}
                        </p>
                      </div>
                      {canViewCommercialInsights ? (
                        <span className="rounded-full bg-gradient-to-r from-primary/10 to-info/10 px-3 py-1 text-xs font-semibold text-primary">
                          {client.healthScore}
                        </span>
                      ) : (
                        <StatusBadge status={client.status} />
                      )}
                    </div>
                  </div>
                ))}
                <ShowMoreButton
                  total={filtered.length}
                  visible={visibleCount}
                  pageSize={PAGE_SIZE}
                  onShowMore={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, filtered.length))}
                  onShowLess={() => setVisibleCount(PAGE_SIZE)}
                />
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {clients.length === 0 ? "No clients yet." : "No clients match the current filters."}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </aside>
      </section>

      {LoadingProgressComponent}
    </motion.div>
  );
}
