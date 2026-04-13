/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { RADIUS, TEXT } from "@/lib/design-tokens";

const statusConfig = {
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-secondary" },
  running: { icon: Activity, color: "text-info", bg: "bg-info/10" },
  completed: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
  failed: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  cancelled: { icon: AlertCircle, color: "text-warning", bg: "bg-warning/10" },
};

const actionLabels: Record<string, string> = {
  send_email: "Send Email",
  create_task: "Create Task",
  assign_lead: "Assign Lead",
  update_score: "Update Score",
  move_deal: "Move Deal",
  create_client: "Create Client",
  send_notification: "Send Notification",
  tag_entity: "Tag Entity",
  update_field: "Update Field",
  webhook: "Webhook",
};

interface RuleLogsProps {
  ruleId: number;
}

export default function RuleLogs({ ruleId }: RuleLogsProps) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["automation-rule-logs", ruleId],
    queryFn: async () => {
      const res = await fetch(`/api/automation/rules/${ruleId}/logs`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
    refetchInterval: 10000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center">
        <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-muted-foreground">No execution logs yet</p>
        <p className="text-sm text-muted-foreground">
          Logs will appear when this rule runs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log: any) => {
        const status = statusConfig[log.status] || statusConfig.pending;
        const StatusIcon = status.icon;
        const actions = log.actionData || [];
        const duration = log.durationMs ? `${log.durationMs}ms` : null;

        return (
          <div
            key={log.id}
            className={cn(
              "overflow-hidden rounded-xl border bg-card",
              RADIUS.lg
            )}
          >
            <div className="flex items-center justify-between border-b border-border/40 p-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    status.bg
                  )}
                >
                  <StatusIcon className={cn("h-4 w-4", status.color)} />
                </div>
                <div>
                  <p className="font-medium capitalize">{log.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.startedAt).toLocaleString()}
                    {duration && ` • ${duration}`}
                  </p>
                </div>
              </div>
              {log.entityType && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{log.entityType}</p>
                  {log.entityId && (
                    <p className="text-sm font-medium">#{log.entityId}</p>
                  )}
                </div>
              )}
            </div>

            {actions.length > 0 && (
              <div className="p-4">
                <p className={cn("mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground", TEXT.eyebrow)}>
                  Actions Executed
                </p>
                <div className="flex flex-wrap gap-2">
                  {actions.map((action: any, idx: number) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm",
                        action.success
                          ? "bg-success/10 text-success"
                          : "bg-destructive/10 text-destructive"
                      )}
                    >
                      {actionLabels[action.action] || action.action}
                      {action.error && (
                        <span className="ml-2 text-xs">({action.error})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {log.error && (
              <div className="border-t border-border/40 bg-destructive/5 p-4">
                <p className="text-sm text-destructive">{log.error}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
