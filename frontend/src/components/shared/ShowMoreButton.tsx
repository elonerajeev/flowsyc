import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShowMoreButtonProps {
  // New props (preferred)
  total?: number;
  visible?: number;
  pageSize?: number;
  onShowMore?: () => void;
  onShowLess?: () => void;
  // Old props (for backwards compatibility)
  onClick?: () => void;
  loading?: boolean;
  className?: string;
}

export default function ShowMoreButton({ 
  total, 
  visible, 
  pageSize = 6, 
  onShowMore, 
  onShowLess, 
  onClick,
  loading = false,
  className 
}: ShowMoreButtonProps) {
  // If using old props (onClick)
  if (onClick !== undefined) {
    return (
      <button
        onClick={onClick}
        disabled={loading}
        className={cn(
          "group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-sm font-medium transition-all duration-200",
          "border-border/50 bg-secondary/10 text-muted-foreground",
          "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
          "active:scale-[0.99]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          className,
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
            Show more
          </>
        )}
      </button>
    );
  }

  // Using new props
  const safeTotal = total ?? 0;
  const safeVisible = visible ?? 0;
  
  if (safeTotal <= pageSize) return null;

  const remaining = safeTotal - safeVisible;
  const isExpanded = safeVisible >= safeTotal;

  return (
    <button
      onClick={isExpanded ? onShowLess : onShowMore}
      className={cn(
        "group flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-sm font-medium transition-all duration-200",
        "border-border/50 bg-secondary/10 text-muted-foreground",
        "hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
        "active:scale-[0.99]",
        className,
      )}
    >
      {isExpanded ? (
        <>
          <ChevronUp className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
          Show less
        </>
      ) : (
        <>
          <ChevronDown className="h-4 w-4 transition-transform group-hover:translate-y-0.5" />
          Show {Math.min(pageSize, remaining)} more
          {remaining > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {remaining} left
            </span>
          )}
        </>
      )}
    </button>
  );
}
