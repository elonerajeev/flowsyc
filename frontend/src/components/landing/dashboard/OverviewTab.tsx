import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from "recharts";
import { TrendingUp, Users, Activity, CheckCircle2, ArrowUpRight } from "lucide-react";
import { revenueData, pipelineData, dealsBySource, activityFeed } from "./DashboardData";

const stats = [
  { label: "Revenue", value: "$1.8M", change: "+12.3%", icon: TrendingUp, color: "#5355D6" },
  { label: "Clients", value: "328", change: "+24", icon: Users, color: "#2A8F7A" },
  { label: "Pipeline", value: "$4.2M", change: "+8.1%", icon: Activity, color: "#F0A030" },
  { label: "Tasks", value: "847", change: "94%", icon: CheckCircle2, color: "#7B7FFF" },
];

const Tip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[#111827] px-3 py-2 text-xs shadow-xl">
      <p className="text-white/40">{payload[0].name}</p>
      <p className="font-semibold text-white">
        {payload[0].name === "revenue" || payload[0].name === "target"
          ? `$${(payload[0].value / 1000).toFixed(0)}k`
          : payload[0].value}
      </p>
    </div>
  );
};

export default function OverviewTab() {
  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${s.color}15` }}>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#2A8F7A]">
                <ArrowUpRight className="h-3 w-3" />{s.change}
              </span>
            </div>
            <p className="text-xl font-bold text-white">{s.value}</p>
            <p className="mt-0.5 text-[10px] text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-white/50">Revenue vs Target</p>
              <p className="mt-0.5 text-xl font-bold text-white">$192k <span className="text-xs font-normal text-[#2A8F7A]">+23.4%</span></p>
            </div>
            <div className="flex gap-3 text-[10px] text-white/30">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#5355D6]" />Actual</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-white/20" />Target</span>
            </div>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5355D6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#5355D6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip content={<Tip />} />
                <Area type="monotone" dataKey="revenue" stroke="#5355D6" strokeWidth={2} fill="url(#rg)" name="revenue" />
                <Area type="monotone" dataKey="target" stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4 4" fill="none" name="target" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:col-span-2">
          <p className="mb-3 text-xs font-semibold text-white/50">Pipeline Stages</p>
          <div className="flex items-center gap-3">
            <div className="h-36 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pipelineData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={4} dataKey="value" stroke="none">
                    {pipelineData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {pipelineData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] text-white/40">{d.name}</span>
                  <span className="text-[10px] font-bold text-white/70">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity + Bar */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:col-span-2">
          <p className="mb-3 text-xs font-semibold text-white/50">Live Activity</p>
          <div className="space-y-2">
            {activityFeed.map((a) => (
              <div key={a.text} className="flex items-center justify-between rounded-lg border border-white/[0.03] bg-white/[0.01] px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: a.badgeColor }} />
                  <div>
                    <p className="text-[11px] text-white/50">{a.text}</p>
                    {a.amount && <p className="text-[10px] text-white/25">{a.amount}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: `${a.badgeColor}15`, color: a.badgeColor }}>{a.badge}</span>
                  <span className="hidden text-[9px] text-white/15 sm:block">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-semibold text-white/50">Deals by Source</p>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dealsBySource} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} />
                <YAxis dataKey="source" type="category" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.4)" }} axisLine={false} tickLine={false} width={48} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="deals" radius={[0, 4, 4, 0]} barSize={14}>
                  {dealsBySource.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
