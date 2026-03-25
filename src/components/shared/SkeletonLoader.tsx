import { cn } from "@/lib/utils";

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-8 w-20 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
        <div className="h-12 w-12 rounded-xl bg-muted" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card animate-pulse">
      <div className="p-4 border-b border-border">
        <div className="h-5 w-48 rounded bg-muted" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
          <div className="h-10 w-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-3 w-24 rounded bg-muted" />
          </div>
          <div className="h-6 w-16 rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
