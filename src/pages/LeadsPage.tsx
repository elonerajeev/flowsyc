import { BadgeDollarSign, CirclePlus, Filter, Target } from "lucide-react";

const leads = [
  { name: "Northwind Labs", stage: "Qualified", owner: "Sarah", score: 82 },
  { name: "Blue Peak", stage: "Proposal", owner: "Mike", score: 74 },
  { name: "Aurora Health", stage: "Negotiation", owner: "Lisa", score: 68 },
  { name: "Vertex Retail", stage: "Closed Won", owner: "Emily", score: 91 },
];

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <CirclePlus className="h-3.5 w-3.5 text-primary" />
            Sales
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Leads</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Early-stage opportunities with enough structure to connect to a real pipeline later.
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          {leads.map((lead) => (
            <article key={lead.name} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">{lead.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Owner: {lead.owner}</p>
                </div>
                <span className="rounded-full border border-border/70 bg-secondary/20 px-3 py-1 text-xs font-semibold text-foreground">
                  {lead.stage}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-border/70 bg-secondary/20 p-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Score</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{lead.score}/100</p>
                </div>
                <Target className="h-5 w-5 text-primary" />
              </div>
            </article>
          ))}
        </div>

        <aside className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <BadgeDollarSign className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Pipeline rules</p>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Keep leads separate from clients so top-of-funnel does not pollute the account base.</p>
            <p>Stage and score are the two fields worth wiring to backend automation first.</p>
            <p>This is the right layer for nurture, qualification, and routing logic later.</p>
          </div>
          <button className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            <Filter className="h-4 w-4" />
            Filters
          </button>
        </aside>
      </section>
    </div>
  );
}
