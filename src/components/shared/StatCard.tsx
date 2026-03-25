import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "up" | "down";
  icon: LucideIcon;
  iconColor?: string;
}

export default function StatCard({ title, value, change, changeType, icon: Icon, iconColor = "bg-primary/10 text-primary" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 card-hover shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-display font-bold text-card-foreground">{value}</p>
          <p className={cn("mt-1 text-sm font-medium", changeType === "up" ? "text-success" : "text-destructive")}>
            {changeType === "up" ? "↑" : "↓"} {change}
          </p>
        </div>
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl", iconColor)}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
