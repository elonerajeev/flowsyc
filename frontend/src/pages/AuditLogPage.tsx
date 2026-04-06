import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Filter, RefreshCw, Search, Shield, User } from "lucide-react";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import PageLoader from "@/components/shared/PageLoader";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AuditLogRecord } from "@/types/crm";

const AUDIT_PAGE_SIZE = 10;

const actionColors: Record<string, string> = {
  create: "bg-green-500/10 text-green-600 border-green-500/20",
  update: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  delete: "bg-red-500/10 text-red-600 border-red-500/20",
  login: "bg-primary/10 text-primary border-primary/20",
  logout: "bg-muted text-muted-foreground border-border",
  stage_change: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  email_sent: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  reminder: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  offer_letter_sent: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  hired: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-600 border-red-500/20",
};

const entityIcons: Record<string, string> = {
  Client: "bg-blue-500/10 text-blue-600",
  Project: "bg-violet-500/10 text-violet-600",
  Task: "bg-emerald-500/10 text-emerald-600",
  Invoice: "bg-yellow-500/10 text-yellow-600",
  Candidate: "bg-pink-500/10 text-pink-600",
  User: "bg-orange-500/10 text-orange-600",
  Note: "bg-cyan-500/10 text-cyan-600",
  TeamMember: "bg-indigo-500/10 text-indigo-600",
  JobPosting: "bg-purple-500/10 text-purple-600",
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
  const [visibleLimit, setVisibleLimit] = useState(AUDIT_PAGE_SIZE);
  const deferredSearch = useDeferredValue(search.trim());

  useEffect(() => {
    setVisibleLimit(AUDIT_PAGE_SIZE);
  }, [deferredSearch, actionFilter, entityFilter]);

  const metaQuery = useQuery({
    queryKey: ["audit-logs-meta"],
    queryFn: () => crmService.getAuditLogsPage({ limit: 200 }),
  });

  const { data: auditPage, isLoading, refetch } = useQuery({
    queryKey: ["audit-logs", visibleLimit, deferredSearch, actionFilter, entityFilter],
    queryFn: () =>
      crmService.getAuditLogsPage({
        limit: visibleLimit,
        offset: 0,
        search: deferredSearch || undefined,
        action: actionFilter !== "all" ? actionFilter : undefined,
        entity: entityFilter !== "all" ? entityFilter : undefined,
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
    <div className="flex flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Audit Logs</h1>
            <p className="text-sm text-muted-foreground">
              Track all system actions and changes
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
          {isLoading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {uniqueActions.map((action) => (
              <SelectItem key={action} value={action}>
                {action.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Entities</SelectItem>
            {uniqueEntities.map((entity) => (
              <SelectItem key={entity} value={entity}>
                {entity}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Badge variant="secondary">{total} results</Badge>
        <Badge variant="outline">Loaded {logs.length}</Badge>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
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
      </div>

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
