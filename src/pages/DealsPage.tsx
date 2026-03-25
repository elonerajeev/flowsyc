import { PieChart, TrendingUp, Wallet } from "lucide-react";

const deals = [
  { name: "Acme Expansion", value: "$42K", stage: "Proposal", probability: 72 },
  { name: "GlobalTech Renewal", value: "$88K", stage: "Negotiation", probability: 81 },
  { name: "Northwind New Logo", value: "$26K", stage: "Qualified", probability: 54 },
];

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <h1 className="font-display text-3xl font-semibold text-foreground">Deals</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          A compact pipeline view for high-value opportunities and close probability.
        </p>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          {deals.map((deal) => (
            <article key={deal.name} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">{deal.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{deal.stage}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{deal.value}</span>
              </div>
              <div className="mt-4 h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-[linear-gradient(90deg,#5483B3,#7DA0CA,#C1E8FF)]" style={{ width: `${deal.probability}%` }} />
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                <span>Probability</span>
                <span className="font-semibold text-foreground">{deal.probability}%</span>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Close plan</p>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Deals should stay separate from leads so late-stage revenue does not blur qualification.</p>
              <p>This makes forecasting and next-step ownership cleaner later.</p>
            </div>
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <Wallet className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm font-semibold text-foreground">Revenue focus</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Track amount, probability, and next action without extra clutter.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
