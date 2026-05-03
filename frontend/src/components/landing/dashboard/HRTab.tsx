import { employees } from "./DashboardData";

const deptColors: Record<string, string> = {
  Sales: "#5355D6", Engineering: "#2A8F7A", Design: "#F0A030", HR: "#7B7FFF",
};

export default function HRTab() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Total Staff", value: "5", color: "#5355D6" },
          { label: "Active", value: "4", color: "#2A8F7A" },
          { label: "On Leave", value: "1", color: "#F0A030" },
          { label: "Avg. Attendance", value: "94%", color: "#7B7FFF" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-3 text-center">
            <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="mt-0.5 text-[10px] text-white/35">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
        <div className="grid grid-cols-5 border-b border-white/5 px-4 py-2 text-[9px] font-semibold uppercase tracking-wider text-white/25">
          <span className="col-span-2">Employee</span>
          <span>Department</span>
          <span>Attendance</span>
          <span>Status</span>
        </div>
        {employees.map((e) => (
          <div key={e.name} className="grid grid-cols-5 items-center border-b border-white/[0.03] px-4 py-3 transition-all last:border-0 hover:bg-white/[0.03]">
            <div className="col-span-2 flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: `${deptColors[e.dept] ?? "#5355D6"}20` }}>
                {e.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <p className="text-xs font-semibold text-white/80">{e.name}</p>
                <p className="text-[10px] text-white/30">{e.role}</p>
              </div>
            </div>
            <span className="w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `${deptColors[e.dept] ?? "#5355D6"}15`, color: deptColors[e.dept] ?? "#5355D6" }}>
              {e.dept}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${e.attendance}%`, backgroundColor: e.attendance >= 95 ? "#2A8F7A" : e.attendance >= 85 ? "#F0A030" : "#DC3545" }} />
              </div>
              <span className="text-[10px] text-white/40">{e.attendance}%</span>
            </div>
            <span className={`w-fit rounded-full px-2 py-0.5 text-[9px] font-semibold ${e.status === "Active" ? "bg-[#2A8F7A]/10 text-[#2A8F7A]" : "bg-[#F0A030]/10 text-[#F0A030]"}`}>
              {e.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
