import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TEXT } from "@/lib/design-tokens";

interface Props {
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  title: string;
  description: string;
}

export default function DevOpsDialogHeader({ icon: Icon, iconColor, iconBg, title, description }: Props) {
  return (
    <div className="flex items-start gap-4 pb-2">
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border", iconBg)}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={cn("font-semibold uppercase tracking-[0.18em] text-muted-foreground", TEXT.meta)}>
          Flowsyc · DevOps Hub
        </p>
        <h2 className="mt-0.5 font-display text-xl font-semibold text-foreground">{title}</h2>
        <p className={cn("mt-1 text-muted-foreground leading-5", TEXT.meta)}>{description}</p>
      </div>
    </div>
  );
}
