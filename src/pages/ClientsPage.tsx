import { startTransition, useDeferredValue, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  HeartPulse,
  GripVertical,
  MapPin,
  Plus,
  Search,
  Pin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useClients } from "@/hooks/use-crm-data";
import { useListPreferences } from "@/hooks/use-list-preferences";
import { cn } from "@/lib/utils";

const segmentOptions = ["all", "Expansion", "Renewal", "New Business"] as const;

export default function ClientsPage() {
  const { data: clients = [], isLoading } = useClients();
  const { role } = useTheme();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [segment, setSegment] = useState<(typeof segmentOptions)[number]>("all");
  const [draggedClientId, setDraggedClientId] = useState<string | null>(null);
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

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
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
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" />
              Add Client
            </button>
          ) : (
            <div className="inline-flex items-center rounded-2xl border border-border/70 bg-secondary/30 px-5 py-3 text-sm font-semibold text-muted-foreground">
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
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
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
              className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary"
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
          {filtered.length === 0 ? (
            <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-8 text-center shadow-card">
              <p className="font-display text-xl font-semibold text-foreground">No clients found</p>
              <p className="mt-2 text-sm text-muted-foreground">Try a different search term or clear the filters.</p>
            </div>
          ) : (
            filtered.map((client) => (
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => togglePin(String(client.id))}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                        pinnedIds.includes(String(client.id))
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground",
                      )}
                      aria-label="Pin client"
                    >
                      <Pin className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(String(client.id), filtered[Math.max(0, filtered.indexOf(client) - 1)]?.id?.toString() ?? String(client.id))}
                      className="rounded-lg border border-border/70 bg-secondary/25 p-1 text-muted-foreground transition hover:text-foreground"
                      aria-label="Move client"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/55 font-display text-lg font-semibold text-foreground">
                      {client.avatar}
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground">{client.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {client.industry} · {client.tier}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {pinnedIds.includes(String(client.id)) && (
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                        Pinned
                      </span>
                    )}
                    <StatusBadge status={client.status} />
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Revenue</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{client.revenue}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Health</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{client.healthScore}/100</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Owner</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{client.manager}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Segment</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{client.segment}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border/70 bg-secondary/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Next action</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{client.nextAction}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{client.location}</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Portfolio Notes</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">What matters here</h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Health score is the primary risk signal for renewals and customer success follow-up.</p>
              <p>Segment keeps revenue operations and CS routing clean when backend workflows are added.</p>
              <p>Tier separates enterprise accounts from lighter-touch clients without changing the UI contract.</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Action Queue</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Top follow-ups</h2>
            </div>
            <div className="space-y-3">
              {filtered.slice(0, 4).map((client) => (
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
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
