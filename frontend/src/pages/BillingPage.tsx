import { useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Receipt, ShieldCheck, Zap, AlertCircle } from "lucide-react";
import { useInvoices } from "@/hooks/use-crm-data";
import ErrorFallback from "@/components/shared/ErrorFallback";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { cn } from "@/lib/utils";
import { BillingSkeleton } from "@/components/skeletons";

const BILLING_PAGE_SIZE = 8;

export default function BillingPage() {
  const { data: invoices = [], isLoading, error, refetch } = useInvoices();
  const [visibleInvoiceCount, setVisibleInvoiceCount] = useState(BILLING_PAGE_SIZE);

  if (isLoading) return <BillingSkeleton />;
  if (error) return <ErrorFallback title="Billing data failed to load" error={error} onRetry={() => refetch()} retryLabel="Retry" />;

  const totalPaid = invoices
    .filter((i) => i.status === "completed")
    .reduce((sum, i) => sum + Number(String(i.amount).replace(/[^0-9.]/g, "")), 0);

  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const now = Date.now();
  const pendingDueTimes = pendingInvoices
    .map((invoice) => new Date(invoice.due).getTime())
    .filter((dueTime) => Number.isFinite(dueTime));
  const overdueCount = pendingDueTimes.filter((dueTime) => dueTime < now).length;
  const dueSoonCount = pendingDueTimes.filter((dueTime) => {
    const days = (dueTime - now) / (1000 * 60 * 60 * 24);
    return days >= 0 && days <= 7;
  }).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            Billing & Subscription
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Billing</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Subscription plan, payment methods, and billing history from your account.
          </p>
        </div>
      </section>

      {/* Summary from real invoice data */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Paid",
            value: invoices.length > 0 ? `$${totalPaid.toLocaleString()}` : "No data",
            icon: Receipt,
            sub: `${invoices.filter(i => i.status === "completed").length} invoices paid`,
          },
          {
            label: "Pending",
            value: invoices.length > 0 ? String(pendingInvoices.length) : "No data",
            icon: CreditCard,
            sub: pendingInvoices.length > 0 ? `$${pendingInvoices.reduce((s, i) => s + Number(String(i.amount).replace(/[^0-9.]/g, "")), 0).toLocaleString()} outstanding` : "All clear",
          },
          {
            label: "Total Invoices",
            value: invoices.length > 0 ? String(invoices.length) : "No data",
            icon: Zap,
            sub: "All time",
          },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                <p className="font-display text-xl font-semibold text-foreground">{value}</p>
                <p className="text-[11px] text-muted-foreground">{sub}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Recent invoices from DB */}
      <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
        <p className="mb-4 text-sm font-semibold text-foreground">Recent Invoices</p>
        {invoices.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border/60 bg-secondary/10 p-6">
            <AlertCircle className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No invoices found. Create invoices in the Finance section.</p>
          </div>
        ) : (
          <>
          <div className="space-y-2">
            {invoices.slice(0, visibleInvoiceCount).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/10 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{inv.client}</p>
                  <p className="text-xs text-muted-foreground">Due {inv.due}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-foreground">{inv.amount}</span>
                  <span className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                    inv.status === "completed" ? "bg-success/10 text-success border-success/20" :
                    inv.status === "pending" ? "bg-warning/10 text-warning border-warning/20" :
                    "bg-info/10 text-info border-info/20"
                  )}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <ShowMoreButton
            total={invoices.length}
            visible={visibleInvoiceCount}
            pageSize={BILLING_PAGE_SIZE}
            onShowMore={() => setVisibleInvoiceCount(v => Math.min(v + BILLING_PAGE_SIZE, invoices.length))}
            onShowLess={() => setVisibleInvoiceCount(BILLING_PAGE_SIZE)}
            className="mt-3"
          />
          </>
        )}
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
        <p className="mb-4 text-sm font-semibold text-foreground">Collections & Controls</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/70 bg-secondary/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Overdue Invoices</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{overdueCount}</p>
            <p className="text-xs text-muted-foreground">Requires follow-up from finance</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/10 p-4">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Due in 7 Days</p>
            <p className="mt-1 text-xl font-semibold text-foreground">{dueSoonCount}</p>
            <p className="text-xs text-muted-foreground">Use reminders to reduce late payments</p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/10 p-4">
            <div className="flex items-center gap-2 text-foreground">
              <ShieldCheck className="h-4 w-4 text-success" />
              <p className="text-sm font-semibold">Billing Guardrails Active</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Invoice status tracking and aging metrics are running from live records.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/finance/invoices"
            className="inline-flex items-center rounded-lg border border-border bg-secondary/20 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/40"
          >
            Open Invoices
          </Link>
          <Link
            to="/automation/rules"
            className="inline-flex items-center rounded-lg border border-border bg-secondary/20 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/40"
          >
            Configure Reminder Rules
          </Link>
        </div>
      </section>
    </div>
  );
}
