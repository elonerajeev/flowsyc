import { projects } from "./DashboardData";
import { Calendar, CheckCircle2 } from "lucide-react";

const statusColors: Record<string, string> = {
  "On Track": "#2A8F7A",
  "At Risk": "#F0A030",
  "Planning": "#5355D6",
  "Done": "#7B7FFF",
};

export default function ProjectsTab() {
  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Active Projects", value: "4", color: "#5355D6" },
          { label: "Tasks Completed", value: "49/90", color: "#2A8F7A" },
          { label: "Avg. Progress", value: "59%", color: "#F0A030" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-0.5 text-[10px] text-white/35">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Project cards */}
      {projects.map((p) => (
        <div key={p.name} className="group rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:border-white/10 hover:bg-white/[0.04]">
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ backgroundColor: `${p.color}20` }}>
                {p.name[0]}
              </div>
              <div>
                <p className="text-sm font-semibold text-white/80">{p.name}</p>
                <p className="text-[10px] text-white/30">{p.client}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `${statusColors[p.status]}15`, color: statusColors[p.status] }}>
                {p.status}
              </span>
              <div className="flex items-center gap-1 text-[10px] text-white/25">
                <Calendar className="h-3 w-3" />{p.due}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.progress}%`, backgroundColor: p.color }} />
            </div>
            <span className="text-[10px] font-bold text-white/50">{p.progress}%</span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-white/25">
            <CheckCircle2 className="h-3 w-3" />
            {p.done}/{p.tasks} tasks done
          </div>
        </div>
      ))}
    </div>
  );
}
