import { Calculator, FileText, Receipt } from "lucide-react";

const expenses = [
  { label: "Software", amount: "$4,200", note: "Subscriptions and licenses" },
  { label: "Marketing", amount: "$2,750", note: "Campaign and content spend" },
  { label: "Travel", amount: "$1,180", note: "Client meetings and team travel" },
];

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <h1 className="font-display text-3xl font-semibold text-foreground">Expenses</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Lightweight expense tracking for reporting and budget control.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {expenses.map((expense) => (
            <article key={expense.label} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">{expense.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{expense.note}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{expense.amount}</span>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Budget control</p>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Keep expense data separate from invoices and payments so reporting stays clean and auditable.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <Receipt className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm font-semibold text-foreground">Future-ready</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Ready for receipt uploads, approvals, and monthly closes later.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
