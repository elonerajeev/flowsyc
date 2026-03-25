import { Link2, PlugZap, Slack, Webhook } from "lucide-react";

const integrations = [
  { name: "Slack", status: "Connected", icon: Slack },
  { name: "Email", status: "Connected", icon: Link2 },
  { name: "Webhooks", status: "Pending", icon: Webhook },
];

export default function IntegrationsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <h1 className="font-display text-3xl font-semibold text-foreground">Integrations</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          A small but important system layer for Slack, email, and later API/webhook sync.
        </p>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {integrations.map((item) => (
          <article key={item.name} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <item.icon className="h-5 w-5 text-primary" />
            <p className="mt-3 font-display text-lg font-semibold text-foreground">{item.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.status}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
        <div className="mb-4 flex items-center gap-2">
          <PlugZap className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">Integration policy</p>
        </div>
        <p className="text-sm leading-6 text-muted-foreground">
          Keep integrations separate from settings so product connectivity stays visible and scalable.
        </p>
      </section>
    </div>
  );
}
