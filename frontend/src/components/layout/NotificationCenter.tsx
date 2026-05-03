import { Bell, CheckCheck, Mail, MonitorSmartphone, MessageSquareMore } from "lucide-react";

import { useNotificationState, useNotificationActions, type NotificationCategory } from "@/contexts/NotificationContext";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const categoryMeta: Record<NotificationCategory, { label: string; tone: string; icon: typeof Bell }> = {
  task: { label: "Tasks", tone: "bg-primary/12 text-primary", icon: Bell },
  lead: { label: "Leads", tone: "bg-blue-500/18 text-blue-600", icon: MessageSquareMore },
  deal: { label: "Deals", tone: "bg-emerald-500/18 text-emerald-600", icon: Bell },
  client: { label: "Clients", tone: "bg-violet-500/18 text-violet-600", icon: Bell },
  project: { label: "Projects", tone: "bg-amber-500/18 text-amber-600", icon: Bell },
  invoice: { label: "Invoices", tone: "bg-rose-500/18 text-rose-600", icon: Bell },
  system: { label: "System", tone: "bg-secondary/45 text-foreground", icon: Bell },
  collaboration: { label: "Collaboration", tone: "bg-cyan-500/18 text-cyan-600", icon: Bell },
};

const preferenceMeta = [
  { key: "inApp" as const, label: "In-app", icon: Bell },
  { key: "liveUpdates" as const, label: "Live", icon: MonitorSmartphone },
  { key: "email" as const, label: "Email", icon: Mail },
];

export default function NotificationCenter() {
  const { notifications, unreadCount, centerOpen, preferences } = useNotificationState();
  const { closeCenter, markRead, markAllRead, setPreference } = useNotificationActions();

  if (!centerOpen) {
    return null;
  }

  const grouped = notifications.reduce<Record<NotificationCategory, typeof notifications>>((acc, notification) => {
    const category = notification.category || "system";
    acc[category] = [...(acc[category] ?? []), notification];
    return acc;
  }, {
    task: [],
    lead: [],
    deal: [],
    client: [],
    project: [],
    invoice: [],
    system: [],
    collaboration: [],
  });

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closeCenter} />
      <div className={cn("fixed right-4 top-[calc(var(--navbar-height)+0.75rem)] z-50 w-[min(92vw,32rem)] overflow-hidden border border-border bg-card shadow-lg", RADIUS.xl)}>
        <div className={cn("border-b border-border", SPACING.inset)}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Notification Center</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Your notifications</h2>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className={cn("premium-hover inline-flex items-center gap-2 border border-border/70 bg-secondary/35 font-semibold text-foreground", RADIUS.pill, SPACING.buttonCompact, TEXT.meta)}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {preferenceMeta.map((item) => {
              const Icon = item.icon;
              const enabled = preferences[item.key];

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setPreference(item.key, !enabled)}
                  className={cn(
                    "premium-hover flex flex-col items-start gap-2 border text-left font-semibold",
                    RADIUS.lg,
                    SPACING.inset,
                    TEXT.meta,
                    enabled ? "border-primary/25 bg-primary/10 text-foreground" : "border-border/70 bg-secondary/25 text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={cn("max-h-[28rem] overflow-y-auto", SPACING.buttonCompact)}>
          <div className="mb-3 flex items-center justify-between px-1">
            <p className={cn("uppercase tracking-[0.16em] text-muted-foreground", TEXT.meta)}>Unread {unreadCount}</p>
            <p className={cn("text-muted-foreground", TEXT.meta)}>Real-time from your CRM</p>
          </div>

          <div className="space-y-4">
            {(Object.keys(grouped) as NotificationCategory[]).map((category) => {
              const items = grouped[category].filter((notification) => notification.unread);
              if (!items.length) return null;
              const meta = categoryMeta[category];
              if (!meta) return null;
              const Icon = meta.icon;

              return (
                <section key={category} className={cn("border border-border/70 bg-background/45", RADIUS.lg, SPACING.inset)}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("flex h-8 w-8 items-center justify-center", RADIUS.md, meta.tone)}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                        <p className={cn("text-muted-foreground", TEXT.meta)}>{items.length} unread</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {items.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => markRead(notification.id)}
                        className={cn("premium-hover w-full border border-border/70 bg-card/70 text-left transition hover:border-primary/20", RADIUS.lg, SPACING.inset)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">{notification.title}</p>
                              {notification.count > 1 ? (
                                <span className={cn("border border-border/70 bg-secondary/40 font-semibold text-muted-foreground", RADIUS.pill, "px-2 py-0.5", TEXT.meta)}>
                                  x{notification.count}
                                </span>
                              ) : null}
                            </div>
                            <p className={cn("mt-1 leading-5 text-muted-foreground", TEXT.meta)}>{notification.description}</p>
                          </div>
                          <p className={cn("whitespace-nowrap uppercase tracking-[0.16em] text-muted-foreground", TEXT.meta)}>
                            {new Date(notification.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {!unreadCount ? (
            <div className={cn("border border-dashed border-border/70 bg-secondary/20 text-center", RADIUS.lg, SPACING.card)}>
              <p className="text-sm font-semibold text-foreground">No unread notifications</p>
              <p className={cn("mt-1 leading-5 text-muted-foreground", TEXT.meta)}>You&apos;re all caught up! New notifications will appear here.</p>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}