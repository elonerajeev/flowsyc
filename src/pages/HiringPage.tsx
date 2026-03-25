import { useState } from "react";
import { Search, FileText, ChevronRight } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

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

export default function HiringPage() {
  const [search, setSearch] = useState("");
  const filtered = candidates.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Hiring & Recruitment</h1>
        <p className="text-sm text-muted-foreground mt-1">Track candidates through the hiring pipeline</p>
      </div>

      {/* Pipeline overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stages.map((s) => {
          const count = candidates.filter((c) => c.stage === s).length;
          return (
            <div key={s} className="rounded-xl border border-border bg-card p-4 shadow-card text-center">
              <div className={cn("inline-flex h-10 w-10 items-center justify-center rounded-full mb-2", stageColors[s])}>
                <span className="font-display font-bold text-lg">{count}</span>
              </div>
              <p className="text-sm font-medium text-foreground">{s}</p>
            </div>
          );
        })}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input type="text" placeholder="Search candidates..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-card pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Candidate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Position</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Stage</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Experience</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Applied</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/30 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10 font-semibold text-sm text-accent">{c.avatar}</div>
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{c.role}</td>
                <td className="px-6 py-4"><StatusBadge status={c.status} /></td>
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
    </div>
  );
}
