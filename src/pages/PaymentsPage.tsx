import { Receipt, Wallet } from "lucide-react";

const payments = [
  { client: "Acme Corp", amount: "$12,400", method: "Card", status: "Completed" },
  { client: "GlobalTech", amount: "$8,200", method: "Wire", status: "Pending" },
  { client: "StartUp Labs", amount: "$3,500", method: "ACH", status: "Completed" },
];

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <h1 className="font-display text-3xl font-semibold text-foreground">Payments</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          A clean payment tracking surface for finance ops and later gateway sync.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {payments.map((payment) => (
            <article key={payment.client} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">{payment.client}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{payment.method}</p>
                </div>
                <span className="rounded-full border border-border/70 bg-secondary/20 px-3 py-1 text-xs font-semibold text-foreground">
                  {payment.status}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/20 p-4">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold text-foreground">{payment.amount}</span>
              </div>
            </article>
          ))}
        </div>

        <aside className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Billing flow</p>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Keep payments separate from invoices so cash movement can be tracked independently when the backend arrives.
          </p>
        </aside>
      </section>
    </div>
  );
}
