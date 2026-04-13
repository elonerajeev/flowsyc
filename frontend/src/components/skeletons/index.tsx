/**
 * Page-specific skeleton screens.
 * Each skeleton mirrors the real layout of its page so users see
 * a structural preview instead of a generic spinner.
 * Built on top of the existing shadcn Skeleton primitive.
 */
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ── Small helpers ──────────────────────────────────────────────────────────
function Sk({ className }: { className?: string }) {
  return <Skeleton className={cn("rounded-2xl", className)} />;
}
function SkCard({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-[1.75rem] border border-border/70 bg-card/80 p-5 shadow-card", className)}>
      {children}
    </div>
  );
}
function SkSection({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("rounded-[1.75rem] border border-border bg-card p-6 shadow-card", className)}>
      {children}
    </div>
  );
}
function SkHeader() {
  return (
    <SkSection>
      <Sk className="h-5 w-24 rounded-full mb-3" />
      <Sk className="h-9 w-56 mb-2" />
      <Sk className="h-4 w-96 max-w-full" />
    </SkSection>
  );
}
function SkStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className={cn("grid gap-4", count === 4 ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2 lg:grid-cols-3")}>
      {Array.from({ length: count }).map((_, i) => (
        <SkCard key={i} className="p-5">
          <div className="flex items-center justify-between mb-4">
            <Sk className="h-10 w-10 rounded-2xl" />
            <Sk className="h-5 w-14 rounded-full" />
          </div>
          <Sk className="h-3 w-20 mb-2" />
          <Sk className="h-7 w-28 mb-1" />
          <Sk className="h-3 w-3/4" />
        </SkCard>
      ))}
    </div>
  );
}
function SkFilterBar({ inputs = 1, selects = 2 }: { inputs?: number; selects?: number }) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-4 shadow-card">
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: inputs }).map((_, i) => <Sk key={`i${i}`} className="h-11 flex-1 min-w-[180px]" />)}
        {Array.from({ length: selects }).map((_, i) => <Sk key={`s${i}`} className="h-11 w-36" />)}
      </div>
    </div>
  );
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* hero */}
      <div className="rounded-[1.75rem] border border-border bg-card p-8 shadow-card">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <Sk className="h-5 w-28 rounded-full" />
            <Sk className="h-12 w-4/5" />
            <Sk className="h-4 w-full" />
            <Sk className="h-4 w-3/4" />
            <div className="flex gap-3 mt-6">
              <Sk className="h-10 w-32" />
              <Sk className="h-10 w-28" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            {[80, 55, 70].map((w, i) => (
              <div key={i} className="flex items-center gap-3">
                <Sk className="h-8 w-8 rounded-full" />
                <Sk className={`h-4 w-[${w}%]`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <SkStatCards count={4} />

      {/* main grid */}
      <div className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
        {/* left - chart + projects */}
        <div className="space-y-5">
          <SkCard className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-2">
                <Sk className="h-3 w-24" />
                <Sk className="h-6 w-44" />
              </div>
              <Sk className="h-8 w-24" />
            </div>
            <Sk className="h-52 w-full rounded-2xl" />
          </SkCard>
          <SkCard className="p-6">
            <Sk className="h-5 w-40 mb-5" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Sk className="h-10 w-10 rounded-xl" />
                  <div className="flex-1 space-y-1.5">
                    <Sk className="h-4 w-3/5" />
                    <Sk className="h-3 w-full" />
                  </div>
                  <Sk className="h-4 w-12" />
                </div>
              ))}
            </div>
          </SkCard>
        </div>

        {/* right - activity */}
        <div className="space-y-5">
          <SkCard className="p-6">
            <Sk className="h-5 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Sk className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Sk className="h-3 w-full" />
                    <Sk className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          </SkCard>
        </div>
      </div>
    </div>
  );
}

// ── Audit Log ──────────────────────────────────────────────────────────────
export function AuditLogSkeleton() {
  return (
    <div className="space-y-6">
      {/* header */}
      <SkSection>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Sk className="h-5 w-36 rounded-full" />
            <Sk className="h-9 w-40" />
            <Sk className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Sk className="h-9 w-20 rounded-full" />
            <Sk className="h-11 w-28 rounded-2xl" />
          </div>
        </div>
      </SkSection>

      {/* filters */}
      <SkFilterBar inputs={1} selects={4} />

      {/* table */}
      <div className="rounded-[1.75rem] border border-border/70 bg-card/90 shadow-card overflow-hidden">
        {/* thead */}
        <div className="flex gap-4 border-b border-border/50 bg-secondary/30 px-5 py-3">
          {[180, 140, 100, 120, 260].map((w, i) => (
            <Sk key={i} className="h-3.5" style={{ width: w }} />
          ))}
        </div>
        {/* rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-border/30 px-5 py-3.5 items-center">
            <Sk className="h-4 w-[140px]" />
            <div className="flex items-center gap-2 w-[140px]">
              <Sk className="h-7 w-7 rounded-full" />
              <Sk className="h-4 w-24" />
            </div>
            <Sk className="h-5 w-[80px] rounded-md" />
            <Sk className="h-5 w-[90px] rounded-md" />
            <Sk className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Teams ──────────────────────────────────────────────────────────────────
export function TeamsSkeleton() {
  return (
    <div className="space-y-6">
      {/* header + stats */}
      <SkSection>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
          <div className="space-y-3">
            <Sk className="h-5 w-36 rounded-full" />
            <Sk className="h-9 w-28" />
            <Sk className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Sk className="h-11 w-28 rounded-2xl" />
            <Sk className="h-11 w-32 rounded-2xl" />
          </div>
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-[1.25rem] border border-border/70 bg-secondary/22 p-4">
              <Sk className="h-8 w-8 rounded-xl mb-3" />
              <Sk className="h-3 w-20 mb-1.5" />
              <Sk className="h-6 w-12" />
            </div>
          ))}
        </div>
      </SkSection>

      {/* search + filter */}
      <SkFilterBar inputs={1} selects={1} />

      {/* team cards */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkCard key={i} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Sk className="h-12 w-12 rounded-2xl" />
                <div className="space-y-1.5">
                  <Sk className="h-5 w-32" />
                  <Sk className="h-3.5 w-20 rounded-full" />
                </div>
              </div>
              <Sk className="h-7 w-7 rounded-xl" />
            </div>
            <Sk className="h-3 w-full mb-1.5" />
            <Sk className="h-3 w-3/4 mb-4" />
            <div className="flex gap-1 mb-4">
              {[0, 1, 2].map((j) => <Sk key={j} className="h-7 w-7 rounded-full" />)}
              <Sk className="h-7 w-14 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Sk className="h-9 flex-1 rounded-xl" />
              <Sk className="h-9 w-9 rounded-xl" />
            </div>
          </SkCard>
        ))}
      </div>
    </div>
  );
}

// ── Finance ────────────────────────────────────────────────────────────────
export function FinanceSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Sk className="h-5 w-32 rounded-full" />
            <Sk className="h-9 w-40" />
            <Sk className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Sk className="h-11 w-28 rounded-2xl" />
            <Sk className="h-11 w-32 rounded-2xl" />
          </div>
        </div>
      </SkSection>

      <SkStatCards count={4} />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        {/* left - invoices */}
        <div className="space-y-3">
          <SkCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <Sk className="h-5 w-32" />
              <Sk className="h-8 w-24 rounded-2xl" />
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3 border-b border-border/30 last:border-0">
                <Sk className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Sk className="h-4 w-2/3" />
                  <Sk className="h-3 w-1/2" />
                </div>
                <Sk className="h-5 w-16 rounded-full" />
                <Sk className="h-5 w-20" />
              </div>
            ))}
          </SkCard>
        </div>

        {/* right - sidebar */}
        <div className="space-y-4">
          <SkCard className="p-5">
            <Sk className="h-5 w-40 mb-4" />
            {["Paid", "Pending", "Overdue"].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <Sk className="h-2.5 w-2.5 rounded-full" />
                  <Sk className="h-3.5 w-16" />
                </div>
                <Sk className="h-4 w-20" />
              </div>
            ))}
          </SkCard>
          <SkCard className="p-5">
            <Sk className="h-5 w-32 mb-3" />
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-3.5 w-full" />)}
            </div>
          </SkCard>
        </div>
      </div>
    </div>
  );
}

// ── Team (People) ──────────────────────────────────────────────────────────
export function TeamPageSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-6">
          <div className="space-y-3">
            <Sk className="h-5 w-36 rounded-full" />
            <Sk className="h-9 w-40" />
            <Sk className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-11 w-28 rounded-2xl" />)}
          </div>
        </div>
        <SkStatCards count={4} />
      </SkSection>

      {/* productivity metrics */}
      <SkCard className="p-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Sk className="h-3 w-20" />
              <Sk className="h-7 w-16" />
            </div>
          ))}
        </div>
        <Sk className="h-52 w-full rounded-2xl" />
      </SkCard>

      {/* member list */}
      <SkCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <Sk className="h-5 w-40" />
          <Sk className="h-8 w-28 rounded-2xl" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0">
              <Sk className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Sk className="h-4 w-32" />
                <Sk className="h-3 w-24" />
              </div>
              <Sk className="h-5 w-16 rounded-full" />
              <Sk className="h-8 w-24 rounded-xl" />
            </div>
          ))}
        </div>
      </SkCard>
    </div>
  );
}

// ── Sales ──────────────────────────────────────────────────────────────────
export function SalesSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Sk className="h-5 w-28 rounded-full" />
            <Sk className="h-9 w-48" />
            <Sk className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Sk className="h-11 w-28 rounded-2xl" />
            <Sk className="h-11 w-32 rounded-2xl" />
          </div>
        </div>
      </SkSection>

      <SkStatCards count={4} />

      {/* tabs */}
      <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-4 shadow-card">
        <div className="flex items-center gap-3">
          <Sk className="h-9 w-24 rounded-xl" />
          <Sk className="h-9 w-20 rounded-xl" />
          <div className="flex-1" />
          <Sk className="h-11 w-48 rounded-2xl" />
          <Sk className="h-11 w-36 rounded-2xl" />
        </div>
      </div>

      {/* deal cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkCard key={i} className="p-5">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="space-y-1.5">
                <Sk className="h-5 w-48" />
                <div className="flex gap-2">
                  <Sk className="h-5 w-20 rounded-full" />
                  <Sk className="h-5 w-16 rounded-full" />
                </div>
              </div>
              <Sk className="h-8 w-8 rounded-xl flex-shrink-0" />
            </div>
            <Sk className="h-3 w-full mb-1.5" />
            <Sk className="h-3 w-4/5 mb-4" />
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1">
                  <Sk className="h-3 w-16" />
                  <Sk className="h-4 w-24" />
                </div>
              ))}
            </div>
          </SkCard>
        ))}
      </div>
    </div>
  );
}

// ── Hiring ─────────────────────────────────────────────────────────────────
export function HiringSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <Sk className="h-5 w-24 rounded-full" />
            <Sk className="h-9 w-48" />
            <Sk className="h-4 w-80 max-w-full" />
          </div>
          <Sk className="h-11 w-28 rounded-2xl" />
        </div>
      </SkSection>

      <div className="grid gap-5 lg:grid-cols-[1fr_0.88fr]">
        {/* left - pipeline */}
        <div className="space-y-4">
          <SkCard className="p-5">
            <Sk className="h-5 w-40 mb-4" />
            {/* stage flow */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-1 flex-shrink-0">
                  <Sk className="h-9 w-28 rounded-xl" />
                  {i < 4 && <Sk className="h-3 w-3 rounded-full" />}
                </div>
              ))}
            </div>
            {/* candidate rows */}
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                  <Sk className="h-9 w-9 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Sk className="h-4 w-36" />
                    <Sk className="h-3 w-24" />
                  </div>
                  <Sk className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </SkCard>
          {/* stats */}
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkCard key={i} className="p-4">
                <Sk className="h-3 w-20 mb-2" />
                <Sk className="h-6 w-12" />
              </SkCard>
            ))}
          </div>
        </div>

        {/* right - job postings */}
        <SkCard className="p-5">
          <Sk className="h-5 w-24 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border/60 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="space-y-1.5">
                    <Sk className="h-5 w-40" />
                    <div className="flex gap-2">
                      <Sk className="h-4 w-16 rounded-full" />
                      <Sk className="h-4 w-20 rounded-full" />
                    </div>
                  </div>
                  <Sk className="h-7 w-7 rounded-xl" />
                </div>
                <div className="flex gap-2 mt-3">
                  <Sk className="h-8 flex-1 rounded-xl" />
                  <Sk className="h-8 w-8 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        </SkCard>
      </div>
    </div>
  );
}

// ── Activity ───────────────────────────────────────────────────────────────
export function ActivitySkeleton() {
  return (
    <div className="space-y-6">
      {/* hero */}
      <div className="rounded-[1.75rem] border border-border bg-card p-8 shadow-card">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <Sk className="h-5 w-32 rounded-full" />
            <Sk className="h-12 w-full" />
            <Sk className="h-4 w-4/5" />
            <div className="grid grid-cols-3 gap-3 mt-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border/60 p-3 space-y-1.5">
                  <Sk className="h-3 w-20" />
                  <Sk className="h-6 w-12" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-8 w-20 rounded-full" />)}
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-4">
            <Sk className="h-36 w-36 rounded-full" />
            <Sk className="h-4 w-40" />
          </div>
        </div>
      </div>

      {/* main grid */}
      <div className="grid gap-5 lg:grid-cols-[1.18fr_0.82fr]">
        {/* left - timeline */}
        <SkCard className="p-5">
          <Sk className="h-5 w-32 mb-5" />
          <div className="space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex flex-col items-center gap-1">
                  <Sk className="h-8 w-8 rounded-full" />
                  {i < 6 && <Sk className="h-8 w-0.5 rounded-full" />}
                </div>
                <div className="flex-1 pb-2 space-y-1.5">
                  <Sk className="h-4 w-3/4" />
                  <Sk className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </SkCard>

        {/* right */}
        <div className="space-y-4">
          <SkCard className="p-5">
            <Sk className="h-5 w-28 mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-0">
                <Sk className="h-9 w-9 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Sk className="h-4 w-28" />
                  <Sk className="h-3 w-20" />
                </div>
                <Sk className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </SkCard>
          <SkCard className="p-5">
            <Sk className="h-5 w-32 mb-3" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-2">
                <Sk className="h-4 w-4 rounded" />
                <Sk className="h-3.5 w-full" />
              </div>
            ))}
          </SkCard>
          <SkCard className="p-5">
            <Sk className="h-5 w-28 mb-3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-2 border-b border-border/30 last:border-0">
                <Sk className="h-5 w-14 rounded-full" />
                <Sk className="h-3.5 flex-1" />
              </div>
            ))}
          </SkCard>
        </div>
      </div>
    </div>
  );
}

// ── Notes ──────────────────────────────────────────────────────────────────
export function NotesSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex items-center justify-between">
          <div className="space-y-3">
            <Sk className="h-5 w-28 rounded-full" />
            <Sk className="h-9 w-32" />
            <Sk className="h-4 w-64 max-w-full" />
          </div>
          <Sk className="h-11 w-28 rounded-2xl" />
        </div>
      </SkSection>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        {/* notes grid */}
        <div className="grid gap-3 sm:grid-cols-2 content-start">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkCard key={i} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sk className="h-2.5 w-2.5 rounded-full" />
                  <Sk className="h-4 w-28" />
                </div>
                <Sk className="h-7 w-7 rounded-xl" />
              </div>
              <Sk className="h-3 w-full mb-1.5" />
              <Sk className="h-3 w-4/5 mb-1.5" />
              <Sk className="h-3 w-3/5 mb-3" />
              <Sk className="h-3 w-24 mt-auto" />
            </SkCard>
          ))}
        </div>

        {/* sidebar */}
        <div className="space-y-4">
          <SkCard className="p-5">
            <Sk className="h-5 w-32 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-3.5 w-full" />)}
            </div>
          </SkCard>
          <SkCard className="p-5">
            <Sk className="h-5 w-28 mb-4" />
            <Sk className="h-11 w-full rounded-2xl mb-3" />
            <div className="flex gap-2 mb-3">
              {Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-7 w-7 rounded-full" />)}
            </div>
            <Sk className="h-24 w-full rounded-2xl mb-3" />
            <Sk className="h-10 w-full rounded-2xl" />
          </SkCard>
        </div>
      </div>
    </div>
  );
}

// ── Reports ────────────────────────────────────────────────────────────────
export function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <Sk className="h-5 w-32 rounded-full" />
            <Sk className="h-9 w-48" />
            <Sk className="h-4 w-80 max-w-full" />
          </div>
        </div>
      </SkSection>

      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkCard key={i} className="overflow-hidden p-0">
            <div className="p-6 pb-4">
              <Sk className="h-12 w-12 rounded-2xl mb-4" />
              <Sk className="h-4 w-20 rounded-full mb-4" />
              <Sk className="h-6 w-48 mb-2" />
              <Sk className="h-4 w-full mb-1" />
              <Sk className="h-4 w-4/5" />
            </div>
            <div className="flex items-center justify-between border-t border-border/50 px-6 py-4">
              <Sk className="h-3.5 w-24" />
              <Sk className="h-9 w-28 rounded-full" />
            </div>
          </SkCard>
        ))}
      </div>
    </div>
  );
}

// ── Analytics ──────────────────────────────────────────────────────────────
export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Sk className="h-5 w-32 rounded-full" />
            <Sk className="h-9 w-40" />
            <Sk className="h-4 w-72 max-w-full" />
          </div>
          <Sk className="h-11 w-28 rounded-2xl" />
        </div>
      </SkSection>

      <SkStatCards count={4} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkCard key={i} className="p-4">
            <Sk className="h-3 w-24 mb-2" />
            <Sk className="h-7 w-20" />
          </SkCard>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkCard key={i} className="p-6">
            <Sk className="h-5 w-36 mb-1.5" />
            <Sk className="h-3.5 w-48 mb-5" />
            <Sk className="h-52 w-full rounded-2xl" />
          </SkCard>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[0.65fr_1.35fr]">
        <SkCard className="p-6">
          <Sk className="h-5 w-32 mb-1.5" />
          <Sk className="h-3.5 w-40 mb-5" />
          <Sk className="h-44 w-full rounded-full mx-auto" style={{ maxWidth: 176 }} />
        </SkCard>
        <SkCard className="p-6">
          <Sk className="h-5 w-40 mb-5" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Sk className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Sk className="h-3.5 w-36" />
                  <Sk className="h-2.5 w-full rounded-full" />
                </div>
                <Sk className="h-4 w-12" />
              </div>
            ))}
          </div>
        </SkCard>
      </div>
    </div>
  );
}

export function ProjectsSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Sk className="h-5 w-36 rounded-full" />
            <div className="flex items-center gap-2">
              <Sk className="h-9 w-24" />
              <div className="flex items-center gap-2">
                <Sk className="h-8 w-16 rounded-xl" />
                <Sk className="h-8 w-16 rounded-xl" />
                <Sk className="h-8 w-20 rounded-xl bg-primary" />
              </div>
            </div>
            <Sk className="h-4 w-96 max-w-full" />
          </div>
        </div>
      </SkSection>

      <SkStatCards count={3} />

      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkCard key={i} className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-3 flex-1">
                <Sk className="h-6 w-3/4" />
                <Sk className="h-4 w-full" />
                <Sk className="h-4 w-2/3" />
              </div>
              <Sk className="h-6 w-16 rounded-full" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              {[60, 80, 40].map((w, j) => (
                <div key={j}>
                  <Sk className="h-3 w-12 mb-1" />
                  <Sk className="h-5 w-8" />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/30">
              <div className="flex items-center gap-2">
                <Sk className="h-5 w-12" />
                <Sk className="h-4 w-16" />
              </div>
              <Sk className="h-8 w-16 rounded-xl" />
            </div>
          </SkCard>
        ))}
      </div>
    </div>
  );
}

export function CandidatesSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Sk className="h-5 w-32 rounded-full" />
            <Sk className="h-9 w-40" />
            <Sk className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Sk className="h-11 w-24 rounded-2xl" />
            <Sk className="h-11 w-32 rounded-2xl" />
          </div>
        </div>
      </SkSection>

      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <SkCard key={i} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="space-y-2">
                <Sk className="h-5 w-32" />
                <Sk className="h-3 w-24" />
              </div>
              <Sk className="h-6 w-16 rounded-full" />
            </div>
            <Sk className="h-20 w-full rounded-xl mb-4" />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Sk className="h-4 w-20" />
                <Sk className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Sk className="h-4 w-24" />
                <Sk className="h-4 w-14" />
              </div>
            </div>
          </SkCard>
        ))}
      </div>

      <SkCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Sk className="h-6 w-32" />
          <div className="flex items-center gap-2">
            <Sk className="h-8 w-20 rounded-xl" />
            <Sk className="h-8 w-24 rounded-xl" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-border/30 rounded-xl">
              <Sk className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Sk className="h-4 w-48" />
                <Sk className="h-3 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Sk className="h-6 w-16 rounded-full" />
                <Sk className="h-8 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </SkCard>
    </div>
  );
}

export function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Sk className="h-5 w-28 rounded-full" />
            <Sk className="h-9 w-48" />
            <Sk className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Sk className="h-11 w-28 rounded-2xl" />
            <Sk className="h-11 w-32 rounded-2xl" />
          </div>
        </div>
      </SkSection>

      <SkStatCards count={4} />

      <SkCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Sk className="h-6 w-32" />
          <Sk className="h-8 w-24 rounded-xl" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border border-border/30 rounded-xl">
              <Sk className="h-10 w-10 rounded-xl" />
              <div className="flex-1 grid grid-cols-3 gap-4">
                <div>
                  <Sk className="h-3 w-16 mb-1" />
                  <Sk className="h-4 w-20" />
                </div>
                <div>
                  <Sk className="h-3 w-12 mb-1" />
                  <Sk className="h-4 w-16" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Sk className="h-3 w-10 mb-1" />
                    <Sk className="h-4 w-14" />
                  </div>
                  <Sk className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SkCard>
    </div>
  );
}

export function CalendarSkeleton() {
  return (
    <div className="space-y-6">
      <SkSection>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Sk className="h-5 w-32 rounded-full" />
            <Sk className="h-9 w-40" />
            <Sk className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Sk className="h-11 w-24 rounded-2xl" />
            <Sk className="h-11 w-28 rounded-2xl" />
          </div>
        </div>
      </SkSection>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <SkCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Sk className="h-6 w-32" />
            <div className="flex items-center gap-2">
              <Sk className="h-8 w-8 rounded-xl" />
              <Sk className="h-8 w-8 rounded-xl" />
              <Sk className="h-8 w-20 rounded-xl" />
            </div>
          </div>
          <Sk className="h-96 w-full rounded-xl" />
        </SkCard>

        <div className="space-y-4">
          <SkCard className="p-4">
            <Sk className="h-4 w-24 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-border/30 rounded-lg">
                  <Sk className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Sk className="h-3 w-32 mb-1" />
                    <Sk className="h-2 w-24" />
                  </div>
                  <Sk className="h-4 w-12" />
                </div>
              ))}
            </div>
          </SkCard>

          <SkCard className="p-4">
            <Sk className="h-4 w-28 mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-3 border border-border/30 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <Sk className="h-4 w-36" />
                    <Sk className="h-5 w-16 rounded-full" />
                  </div>
                  <Sk className="h-3 w-48 mb-1" />
                  <Sk className="h-3 w-32" />
                </div>
              ))}
            </div>
          </SkCard>
        </div>
      </div>
    </div>
  );
}
