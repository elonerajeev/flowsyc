import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Calculator,
  CreditCard,
  FileText,
  Receipt,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { FinanceSkeleton } from "@/components/skeletons";
import ErrorFallback from "@/components/shared/ErrorFallback";
import AdminOnly from "@/components/shared/AdminOnly";
import { SimpleSparkline } from "@/components/shared/SimpleCharts";
import StatusBadge from "@/components/shared/StatusBadge";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { useInvoices, usePayroll } from "@/hooks/use-crm-data";
import { TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { PayrollRecord } from "@/types/crm";

function parseAmount(raw: string): number {
  const numeric = Number(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function FinancePage() {
  return <AdminOnly><FinancePageInner /></AdminOnly>;
}

function FinancePageInner() {
  const { data: invoices = [], isLoading, error, refetch } = useInvoices();
  const {
    data: payrollRecords = [],
    isLoading: payrollLoading,
    error: payrollError,
    refetch: refetchPayroll,
  } = usePayroll();
  const [visibleCount, setVisibleCount] = useState(8);
  const PAGE_SIZE = 8;

  const stats = useMemo(() => {
    const completed = invoices.filter((inv) => inv.status === "completed");
    const pending = invoices.filter((inv) => inv.status === "pending");
    const active = invoices.filter((inv) => inv.status === "active");
    const totalCollected = completed.reduce((sum, inv) => sum + parseAmount(inv.amount), 0);
    const totalOutstanding = [...pending, ...active].reduce((sum, inv) => sum + parseAmount(inv.amount), 0);
    return { completed, pending, active, totalCollected, totalOutstanding, total: invoices.length };
  }, [invoices]);

  const payrollStats = useMemo(() => {
    const currentPeriod = getCurrentPeriod();
    const currentPayroll = payrollRecords.filter((record) => record.period === currentPeriod);
    const payrollBasis = currentPayroll.length > 0 ? currentPayroll : payrollRecords;

    const totalSpend = payrollBasis.reduce((sum, record) => sum + record.netPay, 0);
    const paidSpend = payrollBasis
      .filter((record) => record.status === "paid")
      .reduce((sum, record) => sum + record.netPay, 0);
    const pendingSpend = payrollBasis
      .filter((record) => record.status !== "paid")
      .reduce((sum, record) => sum + record.netPay, 0);

    const teamSpend = payrollBasis.reduce<Record<string, number>>((acc, record) => {
      const teamName = record.member?.team?.trim() || "Unassigned";
      acc[teamName] = (acc[teamName] ?? 0) + record.netPay;
      return acc;
    }, {});

    const spendBreakout = Object.entries(teamSpend)
      .map(([team, amount]) => ({ team, amount }))
      .sort((left, right) => right.amount - left.amount)
      .slice(0, 5);

    return {
      currentPeriod,
      totalSpend,
      paidSpend,
      pendingSpend,
      payrollCount: payrollBasis.length,
      spendBreakout,
    };
  }, [payrollRecords]);

  // Sparkline: last 6 invoice amounts regardless of status
  const revenueSparkline = useMemo(
    () =>
      invoices
        .slice(-6)
        .map((inv) => parseAmount(inv.amount))
        .concat(Array(Math.max(0, 6 - invoices.length)).fill(0)),
    [invoices],
  );

  if (isLoading || payrollLoading) return <FinanceSkeleton />;
  if (error || payrollError) {
    return (
      <ErrorFallback
        title="Finance data failed to load"
        error={error ?? payrollError}
        description="Could not load invoice or payroll data. Retry to refresh."
        onRetry={() => Promise.all([refetch(), refetchPayroll()])}
        retryLabel="Retry finance"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Finance</h1>
            <p className="text-sm text-muted-foreground">
              Live spend, payment settlements, and billing visibility — sourced from your invoice records.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total invoices", value: stats.total > 0 ? String(stats.total) : "None", icon: FileText, color: "text-primary bg-primary/10" },
            { label: "Outstanding", value: stats.totalOutstanding > 0 ? `$${stats.totalOutstanding.toLocaleString()}` : "None", icon: Wallet, color: "text-warning bg-warning/10" },
            { label: "Collected", value: stats.completed.length > 0 ? `$${stats.totalCollected.toLocaleString()}` : "None", icon: Calculator, color: "text-success bg-success/10" },
            { label: "Active", value: stats.active.length > 0 ? String(stats.active.length) : "None", icon: BadgeDollarSign, color: "text-info bg-info/10" },
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-border/60 bg-secondary/20 p-4 flex items-center gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0", card.color)}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{card.label}</p>
                <p className="font-display text-xl font-bold text-foreground">{card.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-4">
          {/* All invoices — real DB records grouped by status */}
          <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Invoices</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">All records</h2>
              </div>
              <CreditCard className="h-5 w-5 text-primary" />
            </div>

            {invoices.length > 0 ? (
              <>
                <div className="mt-4 space-y-3">
                  {invoices.slice(0, visibleCount).map((invoice) => (
                    <article key={invoice.id} className="rounded-xl border border-border/70 bg-secondary/15 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{invoice.client}</p>
                          <p className="text-xs text-muted-foreground">
                            {invoice.id.slice(0, 8)}… · Issued {invoice.date} · Due {invoice.due}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          ${parseAmount(invoice.amount).toLocaleString()}
                        </span>
                      </div>
                      <div className="mt-2">
                        <StatusBadge status={invoice.status} />
                      </div>
                    </article>
                  ))}
                </div>
                <ShowMoreButton
                  total={invoices.length}
                  visible={visibleCount}
                  pageSize={PAGE_SIZE}
                  onShowMore={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, invoices.length))}
                  onShowLess={() => setVisibleCount(PAGE_SIZE)}
                  className="mt-3"
                />
                <div className="mt-4 h-10">
                  <SimpleSparkline
                    data={revenueSparkline}
                    stroke="hsl(var(--success))"
                    fill="hsl(var(--success) / 0.3)"
                    accentFill="hsl(var(--success) / 0.15)"
                  />
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
                <p className="text-sm font-semibold text-foreground">No invoices yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Create an invoice to start tracking billing records here.
                </p>
              </div>
            )}
          </div>

          {/* Expenses */}
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Expenses</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Payroll-backed operating spend</h2>
              </div>
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            {payrollStats.payrollCount > 0 ? (
              <div className="mt-4 space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Payroll spend", value: `$${payrollStats.totalSpend.toLocaleString()}`, hint: `${payrollStats.currentPeriod} cycle` },
                    { label: "Paid out", value: `$${payrollStats.paidSpend.toLocaleString()}`, hint: "Completed salary disbursements" },
                    { label: "Remaining", value: `$${payrollStats.pendingSpend.toLocaleString()}`, hint: "Pending or overdue payroll" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border/70 bg-secondary/20 p-4">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                      <p className="mt-1 font-display text-xl font-semibold text-foreground">{item.value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {payrollStats.spendBreakout.map(({ team, amount }) => (
                    <div key={team} className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/15 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{team}</p>
                        <p className="text-xs text-muted-foreground">Live payroll-derived team cost</p>
                      </div>
                      <p className="text-sm font-semibold text-foreground">${amount.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
                <Calculator className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm font-semibold text-foreground">No payroll spend recorded</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Generate payroll to populate the operating spend view from real salary records.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          {/* Invoice breakdown */}
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="flex items-center gap-3">
              <BadgeDollarSign className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Invoice breakdown</p>
            </div>
            {invoices.length > 0 ? (
              <div className="mt-4 space-y-2">
                {[
                  { label: "Total invoices", value: String(stats.total) },
                  { label: "Completed", value: String(stats.completed.length) },
                  { label: "Pending", value: String(stats.pending.length) },
                  {
                    label: "Other",
                    value: String(
                      invoices.filter((inv) => inv.status !== "completed" && inv.status !== "pending").length,
                    ),
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 px-4 py-3"
                  >
                    <p className="text-sm text-muted-foreground">{row.label}</p>
                    <p className="font-semibold text-foreground">{row.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-secondary/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">No invoice data yet.</p>
              </div>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="flex items-center gap-3">
              <Receipt className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">Current cost controls</p>
            </div>
            {payrollRecords.length > 0 ? (
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 px-4 py-3">
                  <span>Payroll records tracked</span>
                  <span className="font-semibold text-foreground">{payrollRecords.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 px-4 py-3">
                  <span>Outstanding billing</span>
                  <span className="font-semibold text-foreground">${stats.totalOutstanding.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-secondary/20 px-4 py-3">
                  <span>Collections landed</span>
                  <span className="font-semibold text-foreground">${stats.totalCollected.toLocaleString()}</span>
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-border/60 bg-secondary/10 p-4 text-center">
                <p className="text-sm text-muted-foreground">Controls become richer once payroll cycles and invoices are recorded.</p>
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
