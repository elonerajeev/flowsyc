import { Clock3, Inbox, MessageSquare, Sparkles } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import { useDashboardData } from "@/hooks/use-crm-data";
import { cn } from "@/lib/utils";

export default function ActivityPage() {
  const { data: dashboard, isLoading } = useDashboardData();

  if (isLoading || !dashboard) return <PageLoader />;

  const focusPoints = dashboard.todayFocus ?? [];
  const executionReadiness = dashboard.executionReadiness ?? 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Overview
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Activity</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            A single view for recent events, notifications, and workspace movement.
          </p>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Recent events", value: dashboard.activityFeed.length, icon: Inbox },
            { label: "Unread messages", value: 3, icon: MessageSquare },
            { label: "Focus window", value: "Today", icon: Clock3 },
            { label: "Execution", value: `${executionReadiness}%`, icon: Sparkles },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.25rem] border border-border/70 bg-secondary/20 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-3">
          {dashboard.activityFeed.map((item) => (
            <article key={item.id} className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <div className="flex items-start gap-3">
                <div className={cn("mt-1 h-3 w-3 rounded-full", item.type === "completed" ? "bg-success" : item.type === "active" ? "bg-primary" : item.type === "in-progress" ? "bg-info" : "bg-warning")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Why it matters</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Notification hygiene</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Keep event streams separate from tasks and messages so the product stays legible as it grows.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Today&apos;s focus</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Daily brief</h2>
            <div className="mt-4 space-y-2">
              {focusPoints.map((point) => (
                <div key={point} className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm leading-6 text-muted-foreground">
                  {point}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-secondary/20 p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Execution readiness</span>
                <span className="font-semibold text-foreground">{executionReadiness}%</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-secondary">
                <div className="h-2 rounded-full bg-[linear-gradient(90deg,#C1E8FF,#7DA0CA,#5483B3)]" style={{ width: `${executionReadiness}%` }} />
              </div>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
