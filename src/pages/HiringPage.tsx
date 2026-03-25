import { useMemo, useState } from "react";
import { ChevronRight, FileText, GripVertical, Pin, Search } from "lucide-react";

import StatusBadge from "@/components/shared/StatusBadge";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useListPreferences } from "@/hooks/use-list-preferences";

type HiringStatus = "active" | "pending" | "completed" | "rejected";

const candidates = [
  { id: 1, name: "Alex Rivera", role: "Frontend Developer", status: "active" as HiringStatus, stage: "Interview", appliedDate: "Mar 20", experience: "5 years", avatar: "AR" },
  { id: 2, name: "Priya Sharma", role: "Product Designer", status: "pending" as HiringStatus, stage: "Applied", appliedDate: "Mar 22", experience: "3 years", avatar: "PS" },
  { id: 3, name: "David Kim", role: "Backend Engineer", status: "completed" as HiringStatus, stage: "Selected", appliedDate: "Mar 10", experience: "7 years", avatar: "DK" },
  { id: 4, name: "Maria Garcia", role: "Marketing Manager", status: "rejected" as HiringStatus, stage: "Rejected", appliedDate: "Mar 15", experience: "4 years", avatar: "MG" },
  { id: 5, name: "Chris Johnson", role: "Data Analyst", status: "active" as HiringStatus, stage: "Interview", appliedDate: "Mar 23", experience: "2 years", avatar: "CJ" },
  { id: 6, name: "Nina Patel", role: "Frontend Developer", status: "pending" as HiringStatus, stage: "Applied", appliedDate: "Mar 24", experience: "6 years", avatar: "NP" },
];

const stages = ["Applied", "Interview", "Selected", "Rejected"];

const stageColors: Record<string, string> = {
  Applied: "bg-info/10 text-info",
  Interview: "bg-warning/10 text-warning",
  Selected: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
};

function referenceStatus(id: number) {
  const total = 2 + (id % 2);
  const checked = Math.min(total, 1 + (id % 3));
  return `${checked}/${total}`;
}

export default function HiringPage() {
  const { role } = useTheme();
  const [search, setSearch] = useState("");
  const [draggedCandidateId, setDraggedCandidateId] = useState<string | null>(null);
  const { orderedItems: preferredCandidates, pinnedIds, togglePin, move } = useListPreferences(
    `crm-hiring-preferences-${role}`,
    candidates,
    (candidate) => String(candidate.id),
  );

  const filtered = useMemo(
    () =>
      preferredCandidates.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase())),
    [preferredCandidates, search],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Hiring & Recruitment</h1>
        <p className="mt-1 text-sm text-muted-foreground">Track candidates through the hiring pipeline</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stages.map((s) => {
          const count = candidates.filter((c) => c.stage === s).length;
          return (
            <div key={s} className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
              <div className={cn("mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full", stageColors[s])}>
                <span className="font-display text-lg font-bold">{count}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{s}</p>
            </div>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search candidates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20 transition-all"
        />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Candidate</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">References</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Experience</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Applied</th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                draggable
                onDragStart={() => setDraggedCandidateId(String(c.id))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedCandidateId) move(draggedCandidateId, String(c.id));
                  setDraggedCandidateId(null);
                }}
                onDragEnd={() => setDraggedCandidateId(null)}
                className="border-b border-border last:border-0 transition-colors hover:bg-secondary/30"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => togglePin(String(c.id))}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border transition",
                        pinnedIds.includes(String(c.id))
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/70 bg-secondary/20 text-muted-foreground hover:text-foreground",
                      )}
                      aria-label="Pin candidate"
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(String(c.id), filtered[Math.max(0, filtered.indexOf(c) - 1)]?.id?.toString() ?? String(c.id))}
                      className="rounded-lg border border-border/70 bg-secondary/25 p-1 text-muted-foreground transition hover:text-foreground"
                      aria-label="Move candidate"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 font-semibold text-sm text-accent">
                      {c.avatar}
                    </div>
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{c.role}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={c.status} />
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{referenceStatus(c.id)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{c.experience}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{c.appliedDate}</td>
                <td className="px-6 py-4 text-right">
                  <button className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    <FileText className="h-3 w-3" /> Resume
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Reference system</p>
        <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Candidate checks</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This can become a real reference workflow later with feedback forms, approvals, and verification tracking.
        </p>
      </div>
    </div>
  );
}
