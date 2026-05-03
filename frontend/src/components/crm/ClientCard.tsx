import { memo } from "react";
import { motion } from "framer-motion";
import { Edit2, HeartPulse, Pin, Trash2, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { PrivacyValue } from "@/components/shared/PrivacyValue";
import StatusBadge from "@/components/shared/StatusBadge";
import type { ClientRecord } from "@/types/crm";

interface ClientCardProps {
  client: ClientRecord;
  pinned: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewCommercialInsights: boolean;
  onTogglePin: (id: string) => void;
  onRecalculateHealth: (id: number) => void;
  onScheduleMeeting: (client: { id: number; name: string; email: string }) => void;
  onEdit: (client: ClientRecord) => void;
  onDelete: (id: number, name: string) => void;
  onDragStart: (id: string) => void;
  onMove: (draggedId: string, targetId: string) => void;
}

export const ClientCard = memo(function ClientCard({
  client,
  pinned,
  canEdit,
  canDelete,
  canViewCommercialInsights,
  onTogglePin,
  onRecalculateHealth,
  onScheduleMeeting,
  onEdit,
  onDelete,
  onDragStart,
  onMove,
}: ClientCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      draggable
      onDragStart={() => onDragStart(String(client.id))}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onMove(String(client.id), String(client.id))} // Note: Logic handled by parent usually, but keeping compatible
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-card transition-all hover:border-border hover:shadow-lg",
        pinned && "ring-1 ring-primary/20 border-primary/30 bg-primary/5"
      )}
    >
      <div className="absolute left-0 top-0 h-0.5 w-0 bg-gradient-to-r from-primary to-info transition-all duration-300 group-hover:w-full" />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onTogglePin(String(client.id))}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-xl border transition",
              pinned
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/60 bg-secondary/30 text-muted-foreground hover:text-foreground",
            )}
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-info/10 font-display text-lg font-bold text-foreground">
            {client.avatar}
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-foreground">{client.name}</h2>
            <p className="text-xs text-muted-foreground">{client.industry} · {client.tier}</p>
            <p className="text-xs text-muted-foreground/60">
              {canViewCommercialInsights ? client.manager : `${client.company} · ${client.location}`}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={() => onRecalculateHealth(client.id)}
                className="p-1.5 rounded-full hover:bg-info/10 text-muted-foreground hover:text-info transition"
                title="Recalculate health"
              >
                <HeartPulse className="h-3.5 w-3.5" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onScheduleMeeting({ id: client.id, name: client.name, email: client.email })}
                className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition"
                title="Schedule meeting"
              >
                <Video className="h-3.5 w-3.5" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={() => onEdit(client)}
                className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition"
                title="Edit client"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(client.id, client.name)}
                className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                title="Delete client"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <StatusBadge status={client.status} />
          </div>
          {canViewCommercialInsights ? (
            <span className="text-xs text-muted-foreground"><PrivacyValue value={client.revenue} /></span>
          ) : null}
        </div>
      </div>

      {canViewCommercialInsights ? (
        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Health Score</span>
            <span className={cn("font-semibold",
              client.healthScore >= 80 ? "text-success" :
              client.healthScore >= 60 ? "text-warning" : "text-destructive"
            )}>{client.healthScore}/100</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
            <div
              className={cn("h-full rounded-full transition-all",
                client.healthScore >= 80 ? "bg-gradient-to-r from-success to-success/60" :
                client.healthScore >= 60 ? "bg-gradient-to-r from-warning to-warning/60" : "bg-gradient-to-r from-destructive to-destructive/60"
              )}
              style={{ width: `${client.healthScore}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">Next: {client.nextAction}</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2">{client.email}</div>
          <div className="rounded-lg border border-border/40 bg-secondary/20 px-3 py-2">{client.phone}</div>
        </div>
      )}
    </motion.article>
  );
});
