import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Construction,
  KeyRound,
  Loader2,
  PlugZap,
  Send,
  Webhook,
  XCircle,
} from "lucide-react";
import {
  SiGooglecalendar,
  SiGmail,
  SiZapier,
  SiStripe,
  SiGithub,
  SiNotion,
  SiHubspot,
  SiJira,
  SiMailchimp,
} from "@icons-pack/react-simple-icons";
import { toast } from "sonner";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { TEXT } from "@/lib/design-tokens";

// ── Slack icon inline ──────────────────────────────────────────────────────
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  );
}

// ── Event toggle options ───────────────────────────────────────────────────
const SHARED_EVENTS = [
  { id: "task_assigned", label: "Task assigned", desc: "When a task is created or reassigned" },
  { id: "invoice_sent", label: "Invoice sent", desc: "When an invoice is created" },
  { id: "deal_stage_change", label: "Deal stage change", desc: "When a deal moves to a new stage" },
  { id: "candidate_hired", label: "Candidate hired", desc: "When a candidate is marked as hired" },
  { id: "new_client", label: "New client added", desc: "When a new client is created" },
] as const;

type SlackConfig = {
  webhookUrl: string;
  events: string[];
};

type ZapierConfig = {
  webhookUrl: string;
  events: string[];
};

// ── Slack integration panel ────────────────────────────────────────────────
function SlackPanel() {
  const qc = useQueryClient();

  const { data: intData } = useQuery({
    queryKey: ["integrations"],
    queryFn: crmService.getIntegrations,
  });

  const saved = intData?.data?.find((i) => i.id === "slack");
  const isConnected = saved?.status === "connected";
  const savedConfig = (saved?.config ?? {}) as Partial<SlackConfig>;

  const [webhookUrl, setWebhookUrl] = useState(savedConfig.webhookUrl ?? "");
  const [events, setEvents] = useState<string[]>(savedConfig.events ?? SHARED_EVENTS.map((e) => e.id));
  const [expanded, setExpanded] = useState(!isConnected);

  // Sync local state when server data loads
  useEffect(() => {
    if (savedConfig.webhookUrl) setWebhookUrl(savedConfig.webhookUrl);
    if (savedConfig.events) setEvents(savedConfig.events);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.config]);

  const saveMutation = useMutation({
    mutationFn: (status: "connected" | "disconnected") =>
      crmService.updateIntegration("slack", {
        name: "Slack",
        status,
        config: { webhookUrl, events },
      }),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(status === "connected" ? "Slack integration connected!" : "Slack integration disconnected.");
      if (status === "connected") setExpanded(false);
    },
    onError: () => toast.error("Failed to save Slack integration."),
  });

  const testMutation = useMutation({
    mutationFn: () => crmService.testSlackIntegration(webhookUrl),
    onSuccess: () => toast.success("Test message sent to Slack!"),
    onError: (err: Error) => toast.error(`Test failed: ${err.message}`),
  });

  function toggleEvent(id: string) {
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  const urlValid = webhookUrl.startsWith("https://hooks.slack.com/");

  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70"
            style={{ backgroundColor: "#4A154B18" }}
          >
            <SlackIcon className="h-6 w-6" style={{ color: "#4A154B" } as React.CSSProperties} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground text-lg">Slack</p>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-secondary/30 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <XCircle className="h-3 w-3" /> Not connected
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Send CRM alerts, task updates, and deal notifications to Slack channels.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isConnected && (
            <button
              type="button"
              onClick={() => saveMutation.mutate("disconnected")}
              disabled={saveMutation.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/5 px-3 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
            >
              Disconnect
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-secondary/30 px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Collapse" : "Configure"}
          </button>
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="mt-6 space-y-5 border-t border-border/50 pt-5">
          {/* Webhook URL */}
          <div className="space-y-1.5">
            <label className={cn("font-medium text-foreground", TEXT.body)}>
              Incoming Webhook URL
            </label>
            <p className={cn("text-muted-foreground", TEXT.meta)}>
              Create an incoming webhook in Slack (Apps → Incoming WebHooks) and paste the URL below.
            </p>
            <input
              type="url"
              placeholder="https://hooks.slack.com/services/T.../B.../..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {webhookUrl && !urlValid && (
              <p className="text-xs text-destructive mt-1">Must start with https://hooks.slack.com/</p>
            )}
          </div>

          {/* Event toggles */}
          <div className="space-y-2">
            <p className={cn("font-medium text-foreground", TEXT.body)}>Notify on events</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SHARED_EVENTS.map((ev) => (
                <label
                  key={ev.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                    events.includes(ev.id)
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 bg-secondary/20 hover:bg-secondary/40"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-primary"
                    checked={events.includes(ev.id)}
                    onChange={() => toggleEvent(ev.id)}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{ev.label}</p>
                    <p className="text-xs text-muted-foreground">{ev.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => testMutation.mutate()}
              disabled={!urlValid || testMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-secondary/30 px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 text-primary" />
              )}
              Send test message
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate("connected")}
              disabled={!urlValid || events.length === 0 || saveMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isConnected ? "Save changes" : "Connect Slack"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Zapier integration panel ────────────────────────────────────────────────
function ZapierPanel() {
  const qc = useQueryClient();

  const { data: intData } = useQuery({
    queryKey: ["integrations"],
    queryFn: crmService.getIntegrations,
  });

  const saved = intData?.data?.find((i) => i.id === "zapier");
  const isConnected = saved?.status === "connected";
  const savedConfig = (saved?.config ?? {}) as Partial<ZapierConfig>;

  const [webhookUrl, setWebhookUrl] = useState(savedConfig.webhookUrl ?? "");
  const [events, setEvents] = useState<string[]>(savedConfig.events ?? SHARED_EVENTS.map((e) => e.id));
  const [expanded, setExpanded] = useState(!isConnected);

  // Sync local state when server data loads
  useEffect(() => {
    if (savedConfig.webhookUrl) setWebhookUrl(savedConfig.webhookUrl);
    if (savedConfig.events) setEvents(savedConfig.events);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved?.config]);

  const saveMutation = useMutation({
    mutationFn: (status: "connected" | "disconnected") =>
      crmService.updateIntegration("zapier", {
        name: "Zapier",
        status,
        config: { webhookUrl, events },
      }),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ["integrations"] });
      toast.success(status === "connected" ? "Zapier integration connected!" : "Zapier integration disconnected.");
      if (status === "connected") setExpanded(false);
    },
    onError: () => toast.error("Failed to save Zapier integration."),
  });

  const testMutation = useMutation({
    mutationFn: () => crmService.testZapierIntegration(webhookUrl),
    onSuccess: () => toast.success("Test event sent to Zapier!"),
    onError: (err: Error) => toast.error(`Test failed: ${err.message}`),
  });

  function toggleEvent(id: string) {
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  }

  const urlValid = webhookUrl.startsWith("https://hooks.zapier.com/");

  return (
    <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70"
            style={{ backgroundColor: "#FF4A0018" }}
          >
            <SiZapier className="h-6 w-6" style={{ color: "#FF4A00" } as React.CSSProperties} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground text-lg">Zapier</p>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-secondary/30 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  <XCircle className="h-3 w-3" /> Not connected
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Connect to 5000+ apps and automate workflows with Zapier webhooks.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isConnected && (
            <button
              type="button"
              onClick={() => saveMutation.mutate("disconnected")}
              disabled={saveMutation.isPending}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-destructive/40 bg-destructive/5 px-3 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
            >
              Disconnect
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/70 bg-secondary/30 px-3 text-xs font-semibold text-foreground transition hover:bg-secondary"
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {expanded ? "Collapse" : "Configure"}
          </button>
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="mt-6 space-y-5 border-t border-border/50 pt-5">
          {/* Webhook URL */}
          <div className="space-y-1.5">
            <label className={cn("font-medium text-foreground", TEXT.body)}>
              Zapier Webhook URL
            </label>
            <p className={cn("text-muted-foreground", TEXT.meta)}>
              Create a webhook trigger in Zapier and paste the URL below. <a href="https://zapier.com/developer/documentation/v2/webhooks/" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Learn more</a>
            </p>
            <input
              type="url"
              placeholder="https://hooks.zapier.com/hooks/catch/..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            {webhookUrl && !urlValid && (
              <p className="text-xs text-destructive mt-1">Must start with https://hooks.zapier.com/</p>
            )}
          </div>

          {/* Event toggles */}
          <div className="space-y-2">
            <p className={cn("font-medium text-foreground", TEXT.body)}>Trigger events</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SHARED_EVENTS.map((ev) => (
                <label
                  key={ev.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition",
                    events.includes(ev.id)
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 bg-secondary/20 hover:bg-secondary/40"
                  )}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-primary"
                    checked={events.includes(ev.id)}
                    onChange={() => toggleEvent(ev.id)}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{ev.label}</p>
                    <p className="text-xs text-muted-foreground">{ev.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => testMutation.mutate()}
              disabled={!urlValid || testMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-secondary/30 px-4 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {testMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4 text-primary" />
              )}
              Send test event
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate("connected")}
              disabled={!urlValid || events.length === 0 || saveMutation.isPending}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {isConnected ? "Save changes" : "Connect Zapier"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

// ── Coming-soon integrations ───────────────────────────────────────────────
type ComingSoonItem = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconColor?: string;
  eta: string;
  category: string;
};

const COMING_SOON: ComingSoonItem[] = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync meetings, deadlines, and events with Google Calendar.",
    icon: SiGooglecalendar,
    iconColor: "#4285F4",
    eta: "Q2 2026",
    category: "Calendar",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Send transactional emails and workflow notifications via Gmail API.",
    icon: SiGmail,
    iconColor: "#EA4335",
    eta: "Q2 2026",
    category: "Communication",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts, deals, and pipeline data with HubSpot CRM.",
    icon: SiHubspot,
    iconColor: "#FF7A59",
    eta: "Q3 2026",
    category: "CRM",
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Connect payment processing and invoice automation via Stripe.",
    icon: SiStripe,
    iconColor: "#635BFF",
    eta: "Q3 2026",
    category: "Finance",
  },
  {
    id: "webhooks",
    name: "Webhooks",
    description: "Push real-time event payloads to your backend systems.",
    icon: Webhook,
    iconColor: undefined,
    eta: "Q3 2026",
    category: "Developer",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Link project tasks and milestones to GitHub issues and PRs.",
    icon: SiGithub,
    iconColor: "#181717",
    eta: "Q3 2026",
    category: "Developer",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Sync notes, wikis, and project docs with Notion workspaces.",
    icon: SiNotion,
    iconColor: "#000000",
    eta: "Q4 2026",
    category: "Productivity",
  },
  {
    id: "jira",
    name: "Jira",
    description: "Sync tasks and project milestones with Jira boards.",
    icon: SiJira,
    iconColor: "#0052CC",
    eta: "Q4 2026",
    category: "Productivity",
  },
  {
    id: "mailchimp",
    name: "Mailchimp",
    description: "Sync client lists and trigger email campaigns from CRM events.",
    icon: SiMailchimp,
    iconColor: "#FFE01B",
    eta: "Q4 2026",
    category: "Marketing",
  },
  {
    id: "api-access",
    name: "REST API",
    description: "Manage API keys for external systems and custom integrations.",
    icon: KeyRound,
    iconColor: undefined,
    eta: "Q2 2026",
    category: "Developer",
  },
];

const categories = [...new Set(COMING_SOON.map((i) => i.category))];

// ── Page ───────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className={cn(
              "inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground",
              TEXT.eyebrow
            )}>
              <PlugZap className="h-3.5 w-3.5 text-primary" />
              Integrations
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Integrations</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Connect your workspace with external tools. More integrations arriving throughout 2026.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2">
            <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
            <span className="text-sm font-medium text-success">2 live integrations available</span>
          </div>
        </div>
      </section>

      {/* Live — Slack & Zapier */}
      <div className="space-y-2">
        <p className={cn("px-1 text-muted-foreground", TEXT.eyebrow)}>Live</p>
        <SlackPanel />
        <ZapierPanel />
      </div>

      {/* Coming soon by category */}
      <div className="space-y-2">
        <p className={cn("px-1 text-muted-foreground", TEXT.eyebrow)}>Coming soon</p>

        {categories.map((category) => (
          <section key={category} className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted-foreground/70 px-1 pt-2">{category}</p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {COMING_SOON.filter((i) => i.category === category).map((integration) => (
                <div
                  key={integration.id}
                  className="rounded-[1.5rem] border border-border/60 bg-card/80 p-5 shadow-card opacity-80"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60"
                      style={{ backgroundColor: integration.iconColor ? `${integration.iconColor}18` : undefined }}
                    >
                      <integration.icon
                        className="h-5 w-5"
                        style={{ color: integration.iconColor ?? "currentColor" }}
                      />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{integration.name}</p>
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-secondary/20 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
                        {integration.eta}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{integration.description}</p>
                  <button
                    disabled
                    className="mt-4 w-full rounded-xl border border-dashed border-border/40 bg-secondary/10 py-2 text-xs font-medium text-muted-foreground/50 cursor-not-allowed"
                  >
                    Coming soon · {integration.eta}
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Notify me banner */}
      <section className="rounded-[1.5rem] border border-border/60 bg-secondary/20 p-5">
        <div className="flex items-center gap-4">
          <Construction className="h-5 w-5 text-warning flex-shrink-0" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">More integrations coming.</span>{" "}
            Once connected, you'll receive real-time notifications — no polling, no manual exports.
          </p>
        </div>
      </section>
    </div>
  );
}
