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
  Sparkles,
} from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { PrivacyValue } from "@/components/shared/PrivacyValue";
import StatusBadge from "@/components/shared/StatusBadge";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useClients } from "@/hooks/use-crm-data";
import { useListPreferences } from "@/hooks/use-list-preferences";
import { TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const segmentOptions = ["all", "Expansion", "Renewal", "New Business"] as const;

export default function ClientsPage() {
  const { data: clients = [], isLoading, error: clientsError, refetch } = useClients();
  const { role } = useTheme();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segment, setSegment] = useState<(typeof segmentOptions)[number]>("all");
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);
  const PAGE_SIZE = 6;
  const deferredSearch = useDeferredValue(search);
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
        client.manager.toLowerCase().includes(deferredSearch.toLowerCase());
      const statusMatch = statusFilter === "all" || client.status === statusFilter;
      const segmentMatch = segment === "all" || client.segment === segment;
      return searchMatch && statusMatch && segmentMatch;
    });
  }, [deferredSearch, preferredClients, segment, statusFilter]);

  const overview = useMemo(() => {
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
  }, [clients]);

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
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className={cn("inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Client Portfolio
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Clients</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                A clean relationship view for account health, ownership, and next actions.
              </p>
            </div>
          </div>

          {canUseQuickCreate ? (
            <button
              type="button"
              onClick={openQuickCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 px-5 py-3 text-sm font-semibold text-white shadow-lg transition"
            >
              <Plus className="h-4 w-4" />
              Add Client
            </button>
          ) : (
            <div className="inline-flex items-center rounded-2xl border border-border bg-secondary px-5 py-3 text-sm font-semibold text-muted-foreground">
              Read only
            </div>
          )}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Accounts", value: String(overview.total), icon: Building2 },
            { label: "Enterprise Tier", value: String(overview.enterprise), icon: ShieldCheck },
            { label: "Average Health", value: `${overview.avgHealth}/100`, icon: HeartPulse },
            { label: "Expansion Plays", value: String(overview.expansion), icon: ArrowUpRight },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.25rem] border border-border/70 bg-secondary/22 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className={cn("uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>{item.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-card">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(event) => {
                  const next = event.target.value;
                  startTransition(() => setSearch(next));
                }}
                placeholder="Search accounts, industries, or owners"
                className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            {segmentOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSegment(option)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-semibold transition",
                  segment === option
                    ? "bg-primary text-primary-foreground"
                    : "border border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          {clients.length === 0 ? (
            <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-8 text-center shadow-card">
              <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-display text-xl font-semibold text-foreground">No clients yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Add your first client to start tracking the portfolio.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-8 text-center shadow-card">
              <p className="font-display text-xl font-semibold text-foreground">No clients found</p>
              <p className="mt-2 text-sm text-muted-foreground">Try a different search term or clear the filters.</p>
            </div>
          ) : (
            filtered.slice(0, visibleCount).map((client) => (
              <article
                key={client.id}
                draggable
                onDragStart={() => setDraggedClientId(String(client.id))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedClientId) move(draggedClientId, String(client.id));
                  setDraggedClientId(null);
                }}
                onDragEnd={() => setDraggedClientId(null)}
                className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card transition hover:border-border hover:bg-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => togglePin(String(client.id))}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl border transition",
                        pinnedIds.includes(String(client.id))
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/55 font-display text-lg font-bold text-foreground">
                      {client.avatar}
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold text-foreground">{client.name}</h2>
                      <p className="text-xs text-muted-foreground">{client.industry} · {client.tier}</p>
                      <p className="text-xs text-muted-foreground/60">{client.manager}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={client.status} />
                    <span className="text-xs text-muted-foreground"><PrivacyValue value={client.revenue} /></span>
                  </div>
                </div>

                {/* Health score bar */}
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
                        client.healthScore >= 80 ? "bg-success/70" :
                        client.healthScore >= 60 ? "bg-warning/70" : "bg-destructive/70"
                      )}
                      style={{ width: `${client.healthScore}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">Next: {client.nextAction}</p>
                </div>
              </article>
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
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4">
              <p className={cn("uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>Portfolio Notes</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">What matters here</h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Health score is the primary risk signal for renewals and customer success follow-up.</p>
              <p>Segment keeps revenue operations and CS routing clean when automation hooks are added.</p>
              <p>Tier separates enterprise accounts from lighter-touch clients without changing the UI contract.</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4">
              <p className={cn("uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>Action Queue</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Top follow-ups</h2>
            </div>
            <div className="space-y-3">
              {filtered.slice(0, 4).length > 0 ? (
                filtered.slice(0, 4).map((client) => (
                  <div key={client.id} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{client.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{client.nextAction}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {client.healthScore}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    {clients.length === 0 ? "No clients yet." : "No clients match the current filters."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
