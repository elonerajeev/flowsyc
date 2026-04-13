import { useMemo, useState } from "react";
import { Download, Plus, Search, Edit2, Trash2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { PrivacyValue } from "@/components/shared/PrivacyValue";
import StatusBadge from "@/components/shared/StatusBadge";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { useInvoices, crmKeys } from "@/hooks/use-crm-data";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useTheme } from "@/contexts/ThemeContext";
import { crmService } from "@/services/crm";
import { useRefresh } from "@/hooks/use-refresh";
import { getRefreshMessage, getRefreshSuccessMessage } from "@/lib/refresh-messages";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function InvoicesPage() {
  const { data: invoices = [], isLoading, error: invoicesError, refetch } = useInvoices();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const { role } = useTheme();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(4);
  const PAGE_SIZE = 4;
  const { refresh, isRefreshing } = useRefresh();

  const handleRefresh = async () => {
    await refresh(
      () => refetch(),
      {
        message: getRefreshMessage("invoices"),
        successMessage: getRefreshSuccessMessage("invoices"),
      }
    );
  };

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin";

  const deleteMutation = useMutation({
    mutationFn: (id: string) => crmService.removeInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.invoices });
      toast.success("Invoice removed successfully");
    },
    onError: () => toast.error("Failed to remove invoice"),
  });

  const filteredInvoices = useMemo(
    () =>
      invoices.filter(
        (invoice) =>
          invoice.id.toLowerCase().includes(query.toLowerCase()) ||
          invoice.client.toLowerCase().includes(query.toLowerCase()),
      ),
    [invoices, query],
  );

  const summary = useMemo(() => {
    const completed = invoices.filter((invoice) => invoice.status === "completed").length;
    const pending = invoices.filter((invoice) => invoice.status === "pending").length;
    const rejected = invoices.filter((invoice) => invoice.status === "rejected").length;
    return { total: invoices.length, completed, pending, rejected };
  }, [invoices]);

  const handleExportCSV = () => {
    window.open("/api/system/export/invoices/csv", "_blank");
    document.body.removeChild(link);
    toast.success("Invoice CSV export started");
  };

  if (isLoading) {
    return <PageLoader />;
  }
  if (invoicesError) {
    return (
      <ErrorFallback
        title="Invoices failed to load"
        error={invoicesError}
        description="The invoice table could not be loaded. Retry to refresh billing data."
        onRetry={() => refetch()}
        retryLabel="Retry invoices"
      />
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className={cn("border border-border/70 bg-card shadow-card", RADIUS.xl, SPACING.card)}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <h1 className="font-display text-3xl font-semibold text-foreground">Finance operations with cleaner visibility.</h1>
            <p className={cn("max-w-2xl text-muted-foreground", TEXT.bodyRelaxed)}>
              Billing is structured to become a real frontend shell for finance APIs later, with searchable invoice rows and status-safe presentation now.
            </p>
          </div>
          {canUseQuickCreate ? (
            <div className="flex gap-2">
              <motion.div whileTap={{ scale: 0.94 }}>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={cn("flex items-center gap-2 border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition", RADIUS.lg, SPACING.button)}
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
                  Refresh Billing
                </Button>
              </motion.div>

              {(role === "admin" || role === "manager") && (
                <motion.div whileTap={{ scale: 0.94 }}>
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    className={cn("flex items-center gap-2 border-border/70 bg-background/50 px-4 font-semibold text-foreground backdrop-blur-sm transition", RADIUS.lg, SPACING.button)}
                  >
                    <Download className="h-4 w-4 text-primary" />
                    Export CSV
                  </Button>
                </motion.div>
              )}
              <Button onClick={openQuickCreate} className={cn("inline-flex items-center gap-2 font-semibold", RADIUS.lg, SPACING.button)}>
                <Plus className="h-4 w-4" />
                Invoice Draft
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <motion.div whileTap={{ scale: 0.94 }}>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={cn("flex items-center gap-2 border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition", RADIUS.lg, SPACING.button)}
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
                  Refresh Billing
                </Button>
              </motion.div>

              {(role === "admin" || role === "manager") && (
                <motion.div whileTap={{ scale: 0.94 }}>
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    className={cn("flex items-center gap-2 border-border/70 bg-background/50 px-4 font-semibold text-foreground backdrop-blur-sm transition", RADIUS.lg, SPACING.button)}
                  >
                    <Download className="h-4 w-4 text-primary" />
                    Export CSV
                  </Button>
                </motion.div>
              )}
              <div className={cn("inline-flex items-center border border-border/70 bg-secondary/30 font-semibold text-muted-foreground", RADIUS.lg, SPACING.button)}>
                Read only
              </div>
            </div>
          )}
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total invoices", value: String(summary.total) },
            { label: "Paid", value: String(summary.completed) },
            { label: "Pending", value: String(summary.pending) },
            { label: "Rejected", value: String(summary.rejected) },
          ].map((card) => (
            <div key={card.label} className={cn("border border-border/70 bg-secondary/28", RADIUS.lg, SPACING.cardCompact)}>
              <p className={cn("text-muted-foreground", TEXT.eyebrow)}>{card.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold text-foreground">{card.value}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section variants={item} className={cn("border border-border/70 bg-card shadow-card backdrop-blur-xl", RADIUS.xl)}>
        <div className={cn("border-b border-border/70", SPACING.cardCompact)}>
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by invoice or client"
              className="h-12 w-full rounded-2xl border border-border/70 bg-background/55 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className={cn("relative overflow-hidden border border-border/70 bg-card/80", RADIUS.lg, SPACING.inset)}>
          <div className="overflow-x-auto" style={{ touchAction: "pan-y" }}>
            <table className="w-full min-w-[760px]">
            <thead className="bg-secondary/24">
              <tr>
                {["Invoice", "Client", "Amount", "Issued", "Due", "Status", "Action"].map((heading) => (
                  <th key={heading} className={cn("px-6 py-4 text-left font-semibold text-muted-foreground", TEXT.eyebrow)}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length > 0 ? (
                filteredInvoices.slice(0, visibleCount).map((invoice) => (
                  <tr key={invoice.id} className="border-t border-border/70 transition hover:bg-secondary/18">
                    <td className={cn("py-4 text-sm font-semibold text-primary", TEXT.body)}>{invoice.id}</td>
                    <td className={cn("px-6 py-4 text-sm text-foreground", TEXT.body)}>{invoice.client}</td>
                    <td className={cn("px-6 py-4 text-sm font-semibold text-foreground", TEXT.body)}><PrivacyValue value={invoice.amount} /></td>
                    <td className={cn("px-6 py-4 text-sm text-muted-foreground", TEXT.body)}>{invoice.date}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">{invoice.due}</td>
                    <td className="px-6 py-4"><StatusBadge status={invoice.status} /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                          {canEdit && (
                            <button
                              onClick={() => {
                                toast.info("Edit mode coming via Quick Create extension");
                                openQuickCreate("invoice", invoice);
                              }}
                              className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition"
                              title="Edit invoice"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        {canDelete && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to remove invoice ${invoice.id}?`)) {
                                deleteMutation.mutate(invoice.id);
                              }
                            }}
                            className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                            title="Delete invoice"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary">
                          <Download className="h-3.5 w-3.5" />
                          PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-foreground">
                      {invoices.length === 0 ? "No invoices yet" : "No invoices match your search"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {invoices.length === 0
                        ? "Create an invoice to start tracking billing."
                        : "Try a different search term."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
          <div className="pointer-events-none absolute inset-y-4 right-0 w-8 bg-gradient-to-l from-card to-transparent" />
        </div>
        <ShowMoreButton
          total={filteredInvoices.length}
          visible={visibleCount}
          pageSize={PAGE_SIZE}
          onShowMore={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, filteredInvoices.length))}
          onShowLess={() => setVisibleCount(PAGE_SIZE)}
        />
      </motion.section>
    </motion.div>
  );
}
