import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Users, DollarSign, ArrowUpRight, ArrowDownRight, Globe } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line } from "recharts";

const monthlyData = [
  { month: "Jan", revenue: 12400, clients: 45, tasks: 120 },
  { month: "Feb", revenue: 15200, clients: 52, tasks: 135 },
  { month: "Mar", revenue: 18300, clients: 61, tasks: 142 },
  { month: "Apr", revenue: 16800, clients: 58, tasks: 128 },
  { month: "May", revenue: 21500, clients: 67, tasks: 155 },
  { month: "Jun", revenue: 24200, clients: 73, tasks: 168 },
];

const metrics = [
  { label: "Conversion Rate", value: "24.8%", change: "+3.2%", up: true, icon: TrendingUp, emoji: "🎯" },
  { label: "Avg Deal Size", value: "$8,420", change: "+12.5%", up: true, icon: DollarSign, emoji: "💰" },
  { label: "Client Retention", value: "94.2%", change: "+1.8%", up: true, icon: Users, emoji: "🤝" },
  { label: "Response Time", value: "2.4h", change: "-18%", up: true, icon: Globe, emoji: "⚡" },
];

const topPerformers = [
  { name: "Sarah Johnson", deals: 28, revenue: "$124K", avatar: "SJ", trend: "+15%" },
  { name: "Mike Chen", deals: 22, revenue: "$98K", avatar: "MC", trend: "+8%" },
  { name: "Lisa Park", deals: 19, revenue: "$87K", avatar: "LP", trend: "+22%" },
  { name: "Emily Davis", deals: 17, revenue: "$76K", avatar: "ED", trend: "+5%" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AnalyticsPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          Analytics <span>📊</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Deep insights into your business performance</p>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-5 shadow-card card-hover">
            <div className="flex items-start justify-between">
              <span className="text-2xl">{m.emoji}</span>
              <span className={`flex items-center gap-0.5 text-xs font-semibold ${m.up ? "text-success" : "text-destructive"}`}>
                {m.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {m.change}
              </span>
            </div>
            <p className="text-2xl font-display font-bold text-foreground mt-3">{m.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Charts */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#analyticsGrad)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Client Growth</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Line type="monotone" dataKey="clients" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ fill: "hsl(var(--accent))", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Top Performers */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">Top Performers 🏆</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {topPerformers.map((p, i) => (
            <div key={p.name} className="rounded-xl border border-border bg-secondary/30 p-4 text-center card-hover">
              <div className="relative mx-auto w-fit mb-3">
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-lg font-bold text-foreground">{p.avatar}</div>
                {i === 0 && <span className="absolute -top-1 -right-1 text-lg">👑</span>}
              </div>
              <p className="font-semibold text-sm text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{p.deals} deals · {p.revenue}</p>
              <p className="text-xs text-success font-medium mt-1">{p.trend}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
