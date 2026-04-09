import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, RefreshCw, Search, Shield, User } from "lucide-react";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { TEXT } from "@/lib/design-tokens";
import PageLoader from "@/components/shared/PageLoader";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuditLogRecord } from "@/types/crm";

const AUDIT_PAGE_SIZE = 10;

const actionColors: Record<string, string> = {
  create:           "bg-success/10 text-success border-success/20",
  update:           "bg-info/10 text-info border-info/20",
  delete:           "bg-destructive/10 text-destructive border-destructive/20",
  login:            "bg-primary/10 text-primary border-primary/20",
  logout:           "bg-muted text-muted-foreground border-border",
  stage_change:     "bg-warning/10 text-warning border-warning/20",
  email_sent:       "bg-accent/10 text-accent border-accent/20",
  reminder:         "bg-info/10 text-info border-info/20",
  offer_letter_sent:"bg-primary/10 text-primary border-primary/20",
  hired:            "bg-success/10 text-success border-success/20",
  rejected:         "bg-destructive/10 text-destructive border-destructive/20",
};

const entityIcons: Record<string, string> = {
  Client:     "bg-primary/10 text-primary",
  Project:    "bg-accent/10 text-accent",
  Task:       "bg-success/10 text-success",
  Invoice:    "bg-warning/10 text-warning",
  Candidate:  "bg-info/10 text-info",
  User:       "bg-primary/10 text-primary",
  Note:       "bg-muted text-muted-foreground",
  TeamMember: "bg-accent/10 text-accent",
  JobPosting: "bg-warning/10 text-warning",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [visibleLimit, setVisibleLimit] = useState(AUDIT_PAGE_SIZE);
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    setVisibleLimit(AUDIT_PAGE_SIZE);
  }, [deferredSearch, actionFilter, entityFilter, dateFrom, dateTo]);

  const metaQuery = useQuery({
    queryKey: ["audit-logs-meta"],
    queryFn: () => crmService.getAuditLogsPage({ limit: 200 }),
  });

  const { data: auditPage, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", visibleLimit, deferredSearch, actionFilter, entityFilter, dateFrom, dateTo],
    queryFn: () =>
      crmService.getAuditLogsPage({
        limit: visibleLimit,
        offset: 0,
        search: deferredSearch || undefined,
        action: actionFilter !== "all" ? actionFilter : undefined,
        entity: entityFilter !== "all" ? entityFilter : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
  });
  const logs = auditPage?.data ?? [];
  const total = auditPage?.total ?? 0;

  const uniqueActions = useMemo(
    () => [...new Set((metaQuery.data?.data ?? []).map((l) => l.action))].sort(),
    [metaQuery.data?.data]
  );
  const uniqueEntities = useMemo(
    () => [...new Set((metaQuery.data?.data ?? []).map((l) => l.entity))].sort(),
    [metaQuery.data?.data]
  );

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
              <Shield className="h-3.5 w-3.5 text-primary" />
              Security & Compliance
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Audit Logs</h1>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                Full trail of every system action — who did what, and when.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-border/70 bg-secondary/22 px-3 py-1 text-sm font-semibold text-foreground">
              {total} result{total !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isLoading}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border/70 bg-background/50 px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:opacity-50"
            >
              <RefreshCw className={cn("h-4 w-4 text-primary", isLoading && "animate-spin")} />
              {isLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      {/* ── Filters ── */}
      <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-card">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search logs…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Entities</option>
            {uniqueEntities.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </section>

      {/* ── Table ── */}
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/40">
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[140px]">User</TableHead>
              <TableHead className="w-[100px]">Action</TableHead>
              <TableHead className="w-[120px]">Entity</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-40 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No audit logs found</p>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} className="hover:bg-secondary/20">
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">{log.userName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize",
                        actionColors[log.action] || "bg-secondary text-muted-foreground border-border"
                      )}
                    >
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
                        entityIcons[log.entity] || "bg-secondary text-muted-foreground border-border"
                      )}
                    >
                      {log.entity}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.entityId && (
                      <span className="text-xs text-muted-foreground/70 mr-2">
                        ID: {log.entityId}
                      </span>
                    )}
                    {log.detail || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <ShowMoreButton
        total={total}
        visible={logs.length}
        pageSize={AUDIT_PAGE_SIZE}
        onShowMore={() => setVisibleLimit((current) => current + AUDIT_PAGE_SIZE)}
        onShowLess={() => setVisibleLimit(AUDIT_PAGE_SIZE)}
      />
    </div>
  );
}
