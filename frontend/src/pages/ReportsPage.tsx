import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowUpRight, FileText, Sparkles, TrendingUp } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import AdminOnly from "@/components/shared/AdminOnly";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { useReports } from "@/hooks/use-crm-data";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const badgeColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  present: "bg-success/10 text-success border-success/20",
  remote: "bg-info/10 text-info border-info/20",
  absent: "bg-destructive/10 text-destructive border-destructive/20",
  late: "bg-warning/10 text-warning border-warning/20",
  Discovery: "bg-secondary/30 text-muted-foreground border-border/50",
  Build: "bg-primary/10 text-primary border-primary/20",
  Review: "bg-warning/10 text-warning border-warning/20",
  Launch: "bg-success/10 text-success border-success/20",
};

export default function ReportsPage() {
  return <AdminOnly><ReportsPageInner /></AdminOnly>;
}

function ReportsPageInner() {
  const { data: reports = [], isLoading, error: reportsError, refetch } = useReports();
  const [selectedReport, setSelectedReport] = useState<(typeof reports)[0] | null>(null);
  const [visibleReportCount, setVisibleReportCount] = useState(PAGE_SIZE);
  const [visibleRowCount, setVisibleRowCount] = useState(PAGE_SIZE);

  if (isLoading) return <PageLoader />;
  if (reportsError) {
    return (
      <ErrorFallback
        title="Reports failed to load"
        error={reportsError}
        description="The report catalog could not be loaded. Retry to refresh executive reports."
        onRetry={() => refetch()}
        retryLabel="Retry reports"
      />
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className="rounded-2xl border border-border/60 bg-card p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/45 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Reporting Suite
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">
              {selectedReport ? selectedReport.title : "Executive Reports"}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {selectedReport
                ? selectedReport.description
                : "Live reports generated from your real workspace data."}
            </p>
          </div>
          {selectedReport && (
            <button
              onClick={() => setSelectedReport(null)}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/35 px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-secondary"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All Reports
            </button>
          )}
        </div>
      </motion.section>

      <AnimatePresence mode="wait">
        {selectedReport ? (
          /* ── Detail View ── */
          <motion.div
            key="detail"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Metrics */}
            {selectedReport.details?.metrics && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {selectedReport.details.metrics.map((m) => (
                  <div key={m.label} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{m.label}</p>
                    <p className="mt-1 font-display text-2xl font-bold text-foreground">{m.value}</p>
                    {m.sub && <p className="mt-0.5 text-xs text-muted-foreground">{m.sub}</p>}
                  </div>
                ))}
              </div>
            )}

            {/* Rows table */}
            {selectedReport.details?.rows && selectedReport.details.rows.length > 0 && (
              <div className="rounded-[1.5rem] border border-border/70 bg-card/90 shadow-card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Breakdown</p>
                  <span className="ml-auto rounded-full bg-secondary/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                    {selectedReport.details.rows.length} records
                  </span>
                </div>
                <div className="divide-y divide-border/40">
                  {selectedReport.details.rows.slice(0, visibleRowCount).map((row, i) => (
                    <div key={i} className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-secondary/10 transition">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/40 text-xs font-bold text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </div>
                        <p className="text-sm font-medium text-foreground">{row.label}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-semibold text-foreground">{row.value}</p>
                        {row.badge && (
                          <span className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            badgeColors[row.badge] ?? "bg-secondary/30 text-muted-foreground border-border/50"
                          )}>
                            {row.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-3">
                  <ShowMoreButton
                    total={selectedReport.details.rows.length}
                    visible={visibleRowCount}
                    pageSize={PAGE_SIZE}
                    onShowMore={() => setVisibleRowCount(v => Math.min(v + PAGE_SIZE, selectedReport.details!.rows!.length))}
                    onShowLess={() => setVisibleRowCount(PAGE_SIZE)}
                  />
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          /* ── Report Cards ── */
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {reports.length > 0 ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                  {reports.slice(0, visibleReportCount).map((report) => (
                    <article key={report.title} className="rounded-[1.5rem] border border-border/70 bg-card shadow-card overflow-hidden">
                      <div className={`bg-gradient-to-br ${report.gradient} p-6`}>
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-card/75 text-primary shadow-sm">
                          <FileText className="h-5 w-5" />
                        </div>
                        <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {report.type}
                        </span>
                        <h2 className="mt-4 font-display text-xl font-semibold text-foreground">{report.title}</h2>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{report.description}</p>
                      </div>
                      <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{report.date}</p>
                        <button
                          type="button"
                          onClick={() => { setSelectedReport(report); setVisibleRowCount(PAGE_SIZE); }}
                          className="group inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95"
                        >
                          View Details
                          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <ShowMoreButton
                  total={reports.length}
                  visible={visibleReportCount}
                  pageSize={PAGE_SIZE}
                  onShowMore={() => setVisibleReportCount(v => Math.min(v + PAGE_SIZE, reports.length))}
                  onShowLess={() => setVisibleReportCount(PAGE_SIZE)}
                  className="mt-4"
                />
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-12 text-center">
                <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="font-semibold text-foreground">No reports available</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add clients, projects, invoices, and team members to generate reports.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
