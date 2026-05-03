import { Check } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";

const barData = [
  { name: "Conversion", value: 85, last: 72 },
  { name: "Retention", value: 72, last: 68 },
  { name: "Revenue", value: 68, last: 55 },
];

const lineData = [
  { month: "Jan", efficiency: 62, cost: 48 },
  { month: "Feb", efficiency: 68, cost: 52 },
  { month: "Mar", efficiency: 71, cost: 45 },
  { month: "Apr", efficiency: 78, cost: 40 },
  { month: "May", efficiency: 82, cost: 36 },
  { month: "Jun", efficiency: 88, cost: 30 },
];

const donutData = [
  { name: "Positive", value: 70, color: "#2A8F7A" },
  { name: "Neutral", value: 20, color: "#5355D6" },
  { name: "Negative", value: 10, color: "#DC3545" },
];

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border border-white/10 bg-[#111827] px-3 py-2 shadow-xl">
        <p className="text-[10px] text-white/40">{payload[0].name}</p>
        <p className="text-sm font-semibold text-white">{payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

interface ShowcaseProps {
  reverse?: boolean;
  id: string;
  label: string;
  title: string;
  accentWord: string;
  description: string;
  bullets: { title: string; description: string }[];
  chart: React.ReactNode;
  metric?: string;
  metricLabel?: string;
}

function Showcase({ reverse = false, id, label, title, accentWord, description, bullets, chart, metric, metricLabel }: ShowcaseProps) {
  return (
    <section id={id} className="bg-[#030308] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className={`flex flex-col gap-10 lg:gap-16 ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center`}>
          {/* Text */}
          <div className="flex-1 text-center lg:text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#5355D6]">
              {label}
            </p>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              {title}{" "}
              <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
                {accentWord}
              </span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/35">
              {description}
            </p>

            {metric && (
              <div className="mt-6 inline-flex items-baseline gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2">
                <span className="text-2xl font-bold text-white">{metric}</span>
                <span className="text-xs text-white/30">{metricLabel}</span>
              </div>
            )}

            <div className="mt-8 space-y-5">
              {bullets.map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#5355D6]/20 bg-[#5355D6]/10">
                    <Check className="h-3.5 w-3.5 text-[#5355D6]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-white/80">{b.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/30">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 w-full">
            <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6">
              {/* Top accent */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5355D6]/20 to-transparent" />
              {chart}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ShowcaseDecision() {
  return (
    <Showcase
      id="sales-pipeline"
      label="Sales Pipeline"
      title="Close more deals with"
      accentWord="full pipeline visibility"
      description="Flowsyc's sales module gives you Clients, Contacts, Leads, and a visual Pipeline — all linked. Track every deal from first touch to closed-won with real-time stage updates."
      metric="85%"
      metricLabel="avg. pipeline conversion"
      bullets={[
        {
          title: "Leads → Deals → Clients in one flow",
          description: "Capture leads, convert to deals, close as clients — no copy-pasting between tools. Every stage tracked automatically.",
        },
        {
          title: "Revenue forecasting built in",
          description: "See predicted monthly revenue based on active deals, probability scores, and historical win rates — live on your dashboard.",
        },
      ]}
      chart={
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold text-white/40">Performance Metrics</p>
            <div className="flex gap-3 text-[10px] text-white/30">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-[#5355D6]" /> Current</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-white/10" /> Previous</span>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#5355D6" />
                <Bar dataKey="last" radius={[4, 4, 0, 0]} fill="rgba(255,255,255,0.08)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      }
    />
  );
}

export function ShowcaseEfficiency() {
  return (
    <Showcase
      id="automation-engine"
      reverse
      label="Automation Engine"
      title="Build rules, let Flowsyc"
      accentWord="do the work"
      description="Flowsyc's automation engine lets you create conditional triggers across every module — assign leads, send emails, update deal stages, fire alerts, and schedule tasks automatically."
      metric="20h+"
      metricLabel="saved per team per week"
      bullets={[
        {
          title: "Rules, Alerts, Schedules & GTM Flows",
          description: "Four automation types: rule-based triggers, threshold alerts, scheduled jobs, and go-to-market playbooks — all configurable without code.",
        },
        {
          title: "Cross-module actions",
          description: "One rule can update a deal stage, notify a team member via Socket.IO, create a follow-up task, and log the action — simultaneously.",
        },
      ]}
      chart={
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold text-white/40">Efficiency vs Cost</p>
            <div className="flex gap-3 text-[10px] text-white/30">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#5355D6]" /> Efficiency</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F0A030]" /> Cost</span>
            </div>
          </div>
          <div className="mb-4 flex gap-3">
            <div className="flex-1 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <p className="text-[9px] text-white/30">Efficiency</p>
              <p className="mt-1 text-lg font-bold text-white">88 <span className="text-xs text-[#2A8F7A]">+3.5%</span></p>
            </div>
            <div className="flex-1 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <p className="text-[9px] text-white/30">Cost Reduction</p>
              <p className="mt-1 text-lg font-bold text-white">55 <span className="text-xs text-[#F0A030]">-20%</span></p>
            </div>
          </div>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="month" tick={{ fontSize: 9, fill: "rgba(255,255,255,0.2)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="efficiency" stroke="#5355D6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cost" stroke="#F0A030" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      }
    />
  );
}

export function ShowcaseSatisfaction() {
  return (
    <Showcase
      id="hr-management"
      label="HR & People Management"
      title="Manage your entire team"
      accentWord="in one place"
      description="Flowsyc's HR module covers the full employee lifecycle — hiring pipeline, onboarding, attendance tracking, payroll processing, leave management, and performance reviews."
      metric="4 roles"
      metricLabel="Admin · Manager · Employee · Client"
      bullets={[
        {
          title: "Hiring → Onboarding → Payroll",
          description: "Post jobs, track candidates, onboard new hires, and run payroll — all connected. No separate HR tool needed.",
        },
        {
          title: "Role-based access control",
          description: "Every team member sees only what their role allows. Admins control permissions granularly across all 44 pages of the app.",
        },
      ]}
      chart={
        <div>
          <p className="mb-4 text-xs font-semibold text-white/40">Sentiment Analysis</p>
          <div className="flex items-center gap-8">
            <div className="h-40 w-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-3">
              {donutData.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-sm font-semibold text-white/70">{item.name}</p>
                    <p className="text-[11px] text-white/30">{item.value}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Trend sparkline */}
          <div className="mt-6 rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <p className="mb-2 text-[9px] text-white/30">30-day trend</p>
            <div className="flex h-10 items-end gap-px">
              {[45, 50, 48, 55, 52, 60, 58, 65, 62, 68, 65, 70, 68, 72, 70, 75].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-[#2A8F7A]/40"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>
      }
    />
  );
}
