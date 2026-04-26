import { memo } from "react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface PrivacyValueProps {
  value: string | number;
  className?: string;
  blur?: boolean; // use blur instead of *** mask
}

export const PrivacyValue = memo(function PrivacyValue({ value, className, blur = false }: PrivacyValueProps) {
  const { privacyMode } = useWorkspace();

  if (!privacyMode) {
    return <span className={className}>{value}</span>;
  }

  if (blur) {
    return (
      <span className={cn("select-none blur-sm", className)}>
        {value}
      </span>
    );
  }

  // Mask with *** keeping same approximate length
  const masked = typeof value === "number"
    ? "••••"
    : "•".repeat(Math.min(String(value).length, 8));

  return <span className={cn("select-none tracking-widest text-muted-foreground/60", className)}>{masked}</span>;
});
