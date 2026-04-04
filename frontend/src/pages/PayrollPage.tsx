import { useEffect, useMemo, useState } from "react";
import {
  Banknote,
  BadgeDollarSign,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  HandCoins,
  ReceiptText,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import StatusBadge from "@/components/shared/StatusBadge";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { PrivacyValue } from "@/components/shared/PrivacyValue";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { usePayroll } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import type { PayrollRecord, PayrollStatus, PaymentMode } from "@/types/crm";

function formatCurrency(amount: number | undefined) {
  return amount != null ? `$${Number(amount).toLocaleString()}` : "$0";
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

const statusTone: Record<PayrollStatus, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
  paid: "bg-success/10 text-success border-success/20",
};

const modeLabel: Record<PaymentMode, string> = {
  "bank-transfer": "Bank transfer",
  cash: "Cash / hand salary",
  upi: "UPI",
};

function PayrollSummaryCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: LucideIcon }) {
  return (
    <div className="rounded-[1.25rem] border border-border/70 bg-secondary/20 p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-foreground">
        {label === "Current payroll" ? <PrivacyValue value={value} /> : value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

export default function PayrollPage() {
  const { user } = useAuth();
  const { role } = useTheme();
  const canManagePayroll = role === "admin" || role === "manager";
  const { data: records = [], isLoading, error: payrollError, refetch: refetchPayroll } = usePayroll();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 6;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredRecords = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(r =>
      `${r.memberName} ${r.period}`.toLowerCase().includes(q)
    );
  }, [records, search]);

  // Get current user's payroll record if they are an employee
  const currentUserRecord = useMemo(() => {
    if (role !== "employee") return null;
    return records[0] ?? null;
  }, [records, role]);

  useEffect(() => {
    if (records.length > 0) {
      setSelectedId((curr) => curr ?? records[0].id);
    }
  }, [records]);

  const summary = useMemo(() => {
    if (!canManagePayroll && currentUserRecord) {
      return {
        payrollTotal: currentUserRecord.netPay,
        paid: currentUserRecord.status === "paid" ? 1 : 0,
        pending: currentUserRecord.status === "pending" ? 1 : 0,
        overdue: currentUserRecord.status === "overdue" ? 1 : 0,
      };
    }

    if (!canManagePayroll && role === "employee" && user) {
      return {
        payrollTotal: user.baseSalary + user.allowances - user.deductions,
        paid: 0,
        pending: 0,
        overdue: 0,
      };
    }

    const currentPeriod = getMonthKey(new Date());
    const currentRecords = records.filter(r => r.period === currentPeriod);

    return {
      payrollTotal: currentRecords.reduce((sum, r) => sum + r.netPay, 0),
      paid: currentRecords.filter(r => r.status === "paid").length,
      pending: currentRecords.filter(r => r.status === "pending").length,
      overdue: currentRecords.filter(r => r.status === "overdue").length,
    };
  }, [canManagePayroll, currentUserRecord, records, role, user]);

  const selectedRecord = useMemo(() => {
    if (!canManagePayroll) return currentUserRecord;
    return records.find((record) => record.id === selectedId) ?? records[0] ?? null;
  }, [canManagePayroll, currentUserRecord, records, selectedId]);

  const markPaid = async (recordId: number) => {
    if (!canManagePayroll) return;
    try {
      await crmService.updatePayrollStatus(recordId, "paid");
      refetchPayroll();
    } catch (error) {
      console.error("Failed to mark as paid:", error);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }
  if (payrollError) {
    return (
      <ErrorFallback
        title="Payroll failed to load"
        error={payrollError}
        description="Could not load payroll records from the database. Retry to refresh."
        onRetry={() => refetchPayroll()}
        retryLabel="Retry payroll"
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <BadgeDollarSign className="h-3.5 w-3.5 text-primary" />
              Payroll & Salary
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Salary management</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Monthly salary cycles, pay details, hand salary, and paid status are tracked here in a clear monthly flow.
              </p>
              {/* Employment status removed - now handled in TeamPage */}
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/25 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">View mode</p>
            <p className="mt-1 font-semibold text-foreground">{canManagePayroll ? "HR / Admin payroll" : "Personal salary view"}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PayrollSummaryCard label="Current payroll" value={formatCurrency(summary.payrollTotal)} hint="This month's net salary total" icon={Wallet} />
          <PayrollSummaryCard label="Paid" value={String(summary.paid)} hint="Marked paid for this cycle" icon={ShieldCheck} />
          <PayrollSummaryCard label="Pending" value={String(summary.pending)} hint="Awaiting admin or HR action" icon={Clock3} />
          <PayrollSummaryCard label="Overdue" value={String(summary.overdue)} hint="Past due and still unpaid" icon={ReceiptText} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Personal pay</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">My salary snapshot</h2>
              </div>
              <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]", role === "employee" ? "border-primary/20 bg-primary/10 text-primary" : "border-border/70 bg-secondary/20 text-muted-foreground")}>
                {role === "employee" ? "Employee view" : "Current session"}
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { label: "Base salary", value: formatCurrency(currentUserRecord?.baseSalary ?? user?.baseSalary ?? 0), icon: CircleDollarSign },
                { label: "Allowances", value: formatCurrency(currentUserRecord?.allowances ?? user?.allowances), icon: Banknote },
                { label: "Deductions", value: formatCurrency(currentUserRecord?.deductions ?? user?.deductions), icon: ReceiptText },
                { label: "Net salary", value: formatCurrency(currentUserRecord?.netPay ?? ((user?.baseSalary ?? 0) + (user?.allowances ?? 0) - (user?.deductions ?? 0))), icon: Wallet },
                { label: "Payment mode", value: currentUserRecord ? modeLabel[currentUserRecord.paymentMode] : user?.paymentMode ? modeLabel[user.paymentMode] : "-", icon: HandCoins },
                { label: "Payroll cycle", value: currentUserRecord?.period ?? user?.payrollCycle ?? "-", icon: CalendarDays },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                  <p className="mt-1 font-display text-lg font-semibold text-foreground">
                    {item.label.toLowerCase().includes("salary") || item.label === "Allowances" || item.label === "Deductions"
                      ? <PrivacyValue value={item.value} />
                      : item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-border/70 bg-secondary/20 p-4">
              <p className="text-sm font-semibold text-foreground">How salary updates work</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                A new monthly payroll cycle is generated automatically. If admin or HR has not marked it paid, the status moves from pending to overdue after the due date.
              </p>
            </div>
          </div>

          {!canManagePayroll && (
            <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <p className="text-sm font-semibold text-foreground">Employee access</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Employees see only their own salary snapshot here. Payroll rows and mark-paid actions stay visible only for admin and HR roles.
              </p>
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Monthly ledger</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">{canManagePayroll ? "Team payroll records" : "Current cycle status"}</h2>
            </div>
            <div className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {canManagePayroll ? "Auto-generated monthly" : "Read only"}
            </div>
          </div>

          {canManagePayroll ? (
            <div className="mt-4 space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
                  placeholder="Search by name, department..."
                  className="h-10 w-full rounded-2xl border border-border/70 bg-background/55 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
              </div>

              {filteredRecords.slice(0, visibleCount).map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => setSelectedId(record.id)}
                  className={cn(
                    "w-full rounded-2xl border p-4 text-left transition",
                    selectedId === record.id ? "border-primary bg-primary/[0.05]" : "border-border/70 bg-secondary/15 hover:border-border",
                  )}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{record.memberName}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.period}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={record.status === "paid" ? "completed" : record.status === "overdue" ? "rejected" : "pending"} />
                      <span className={cn("rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]", statusTone[record.status])}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Net pay</p>
                      <p className="mt-1 text-sm font-semibold text-foreground"><PrivacyValue value={formatCurrency(record.netPay)} /></p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Created</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{record.createdAt ? new Date(record.createdAt).toLocaleDateString() : '-'}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card/70 p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">ID</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">#{record.id}</p>
                    </div>
                  </div>
                </button>
              ))}
              {/* Show More */}
              <ShowMoreButton
                total={filteredRecords.length}
                visible={visibleCount}
                pageSize={PAGE_SIZE}
                onShowMore={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, filteredRecords.length))}
                onShowLess={() => setVisibleCount(PAGE_SIZE)}
              />
              {!records.length && (
                <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/15 p-4 text-sm text-muted-foreground">
                  No payroll records yet.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-[1.35rem] border border-border/70 bg-secondary/15 p-4">
              <p className="text-sm leading-6 text-muted-foreground">
                Your salary is shown above. Admin or HR will use the same section to track monthly payout status.
              </p>
              <div className="mt-4 rounded-2xl border border-border/70 bg-card/70 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Due date</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{currentUserRecord?.dueDate ?? user?.payrollDueDate ?? "-"}</p>
              </div>
              {!currentUserRecord && (
                <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-secondary/15 p-4 text-sm text-muted-foreground">
                  No payroll record has been generated for your account yet. Your salary profile is still visible above.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {canManagePayroll && selectedRecord && (
        <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Selected payroll</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">{selectedRecord.memberName}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedRecord.member?.designation ?? "Team member"} · {selectedRecord.member?.team ?? "Unassigned"} · {selectedRecord.period}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canManagePayroll && selectedRecord.status !== "paid" && (
                <button
                  type="button"
                  onClick={() => markPaid(selectedRecord.id)}
                  className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Mark paid
                </button>
              )}
              <span className={cn("rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em]", statusTone[selectedRecord.status])}>
                {selectedRecord.status}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Base", value: formatCurrency(selectedRecord.baseSalary) },
              { label: "Allowances", value: formatCurrency(selectedRecord.allowances) },
              { label: "Deductions", value: formatCurrency(selectedRecord.deductions) },
              { label: "Net pay", value: formatCurrency(selectedRecord.netPay) },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className="mt-1 font-display text-lg font-semibold text-foreground"><PrivacyValue value={item.value} /></p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Payment mode</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{modeLabel[selectedRecord.paymentMode]}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Due date</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{selectedRecord.dueDate}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Paid at</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{selectedRecord.paidAt ?? "Not paid yet"}</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
