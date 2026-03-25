import { ArrowUpRight, Clock3, Zap } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { motion } from "framer-motion";

import StatusBadge from "@/components/shared/StatusBadge";
import type { ClientRecord } from "@/types/crm";

type DashboardChartsProps = {
  revenueSeries: Array<{ month: string; revenue: number; deals: number; retention: number }>;
  pipelineBreakdown: Array<{ name: string; value: number; color: string }>;
  operatingCadence: Array<{ name: string; value: number }>;
  focusClients: ClientRecord[];
  atRiskClients: ClientRecord[];
};

export default function DashboardCharts({
  revenueSeries,
  pipelineBreakdown,
  operatingCadence,
  focusClients,
  atRiskClients,
}: DashboardChartsProps) {
  return (
    <>
      <motion.section variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)_/_0.96),hsl(var(--card)_/_0.84))] p-6 shadow-card">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Growth Curve</p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">Revenue and retention momentum</h2>
            </div>
            <div className="rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              Quarter to date
            </div>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={revenueSeries}>
              <defs>
                <linearGradient id="dashboardRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 18,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#dashboardRevenue)" strokeWidth={2.75} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)_/_0.96),hsl(var(--card)_/_0.84))] p-6 shadow-card">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Pipeline Mix</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-foreground">Weighted by stage</h2>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pipelineBreakdown} innerRadius={58} outerRadius={94} dataKey="value" paddingAngle={4}>
                {pipelineBreakdown.map((stage) => (
                  <Cell key={stage.name} fill={stage.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: 18,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid gap-3">
            {pipelineBreakdown.map((stage) => (
              <div key={stage.name} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/30 px-4 py-3">
                <div className="h-3 w-3 rounded-full" style={{ background: stage.color }} />
                <span className="text-sm text-foreground">{stage.name}</span>
                <span className="ml-auto text-sm font-semibold text-foreground">{stage.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Operating Cadence</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Cross-team performance</h2>
            </div>
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={operatingCadence} layout="vertical" margin={{ left: 4, right: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
              <Tooltip
                contentStyle={{
                  borderRadius: 18,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))",
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Priority Accounts</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Account management radar</h2>
            </div>
            <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-4">
            {focusClients.map((client) => (
              <div key={client.id} className="rounded-[1.25rem] border border-border/70 bg-secondary/28 p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/18 via-accent/16 to-info/28 text-sm font-semibold text-foreground">
                      {client.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {client.industry} · {client.segment}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={client.status} />
                </div>
                <div className="grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Health</p>
                    <p className="mt-1 font-semibold text-foreground">{client.healthScore}/100</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Owner</p>
                    <p className="mt-1 font-semibold text-foreground">{client.manager}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Next Action</p>
                    <p className="mt-1 font-semibold text-foreground">{client.nextAction}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
          <div className="mb-5">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Risk Monitor</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Accounts that need intervention</h2>
          </div>
          <div className="space-y-3">
            {atRiskClients.map((client) => (
              <div key={client.id} className="rounded-[1.25rem] border border-border/70 bg-secondary/28 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.nextAction}</p>
                  </div>
                  <span className="rounded-full bg-warning/12 px-3 py-1 text-xs font-semibold text-warning">
                    {client.healthScore}/100
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[1.25rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--secondary)_/_0.6),transparent)] p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock3 className="h-4 w-4 text-primary" />
              Suggested focus this afternoon
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Have customer success call the two lowest-health enterprise accounts before the next billing cycle. That is the highest-leverage frontend workflow to connect to backend reminders and automation later.
            </p>
          </div>
        </div>
      </motion.section>
    </>
  );
}
