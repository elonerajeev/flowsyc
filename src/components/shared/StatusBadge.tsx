import { cn } from "@/lib/utils";

type Status = "active" | "pending" | "completed" | "rejected" | "in-progress" | "high" | "medium" | "low";

const statusStyles: Record<Status, string> = {
  active: "bg-success/10 text-success border-success/20",
  completed: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  "in-progress": "bg-info/10 text-info border-info/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-warning/10 text-warning border-warning/20",
  low: "bg-info/10 text-info border-info/20",
};

export default function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize", statusStyles[status])}>
      {status.replace("-", " ")}
    </span>
  );
}
