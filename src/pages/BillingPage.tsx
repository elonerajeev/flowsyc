import { BadgeDollarSign, CreditCard, Landmark } from "lucide-react";

const plans = [
  { name: "Starter", seats: "5 seats", price: "$49/mo" },
  { name: "Growth", seats: "25 seats", price: "$199/mo" },
  { name: "Scale", seats: "Unlimited", price: "$499/mo" },
];

export default function BillingPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <h1 className="font-display text-3xl font-semibold text-foreground">Billing</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Billing and subscription controls for a future SaaS layer.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <article key={plan.name} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              <p className="font-display text-lg font-semibold text-foreground">{plan.name}</p>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{plan.seats}</p>
            <p className="mt-2 text-2xl font-display font-semibold text-foreground">{plan.price}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <BadgeDollarSign className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Billing note</p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Put subscription, usage, and payment methods here when the backend is ready.
        </p>
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Subscription controls</p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Keep billing under System so account management remains clean and distinct from finance operations.
        </p>
      </section>
    </div>
  );
}
