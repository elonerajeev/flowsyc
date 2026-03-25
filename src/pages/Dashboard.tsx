import { Users, DollarSign, ClipboardList, FolderKanban, ArrowUpRight, Clock, TrendingUp, Target, Zap } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { motion } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";

const salesData = [
  { month: "Jan", revenue: 4000, deals: 24 },
  { month: "Feb", revenue: 3000, deals: 18 },
  { month: "Mar", revenue: 5000, deals: 29 },
  { month: "Apr", revenue: 4500, deals: 22 },
  { month: "May", revenue: 6000, deals: 34 },
  { month: "Jun", revenue: 5500, deals: 31 },
  { month: "Jul", revenue: 7000, deals: 40 },
];

const performanceData = [
  { name: "Sales", value: 85 },
  { name: "Support", value: 72 },
  { name: "Marketing", value: 90 },
  { name: "Dev", value: 78 },
  { name: "Design", value: 88 },
];

const pieData = [
  { name: "Active", value: 45, color: "hsl(173, 58%, 39%)" },
  { name: "Pending", value: 25, color: "hsl(38, 92%, 50%)" },
  { name: "Completed", value: 20, color: "hsl(152, 69%, 31%)" },
  { name: "Cancelled", value: 10, color: "hsl(0, 72%, 51%)" },
];

const activities = [
  { id: 1, text: "Sarah closed deal with Acme Corp", time: "5 min ago", type: "completed" as const, emoji: "🎉" },
  { id: 2, text: "New task assigned to Mike: UI Review", time: "20 min ago", type: "pending" as const, emoji: "📋" },
  { id: 3, text: "Client meeting scheduled with TechStart", time: "1 hour ago", type: "active" as const, emoji: "📅" },
  { id: 4, text: "Project 'CRM v2' reached 80% completion", time: "2 hours ago", type: "in-progress" as const, emoji: "🚀" },
  { id: 5, text: "New candidate applied for Frontend role", time: "3 hours ago", type: "pending" as const, emoji: "👤" },
  { id: 6, text: "Invoice #1024 sent to GlobalTech", time: "5 hours ago", type: "completed" as const, emoji: "💰" },
];

const quickActions = [
  { label: "New Client", emoji: "👤", color: "from-primary/20 to-primary/5" },
  { label: "New Task", emoji: "📝", color: "from-accent/20 to-accent/5" },
  { label: "New Project", emoji: "🚀", color: "from-success/20 to-success/5" },
  { label: "Send Invoice", emoji: "💳", color: "from-warning/20 to-warning/5" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
};

export default function Dashboard() {
  const { role } = useTheme();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Welcome banner */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-accent/5 to-primary/5 border border-primary/10 p-6">
        <div className="relative z-10">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            Welcome back, John! <span className="text-2xl">👋</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your projects today.</p>
          {role === "admin" && (
            <div className="flex gap-3 mt-4">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  className={`flex items-center gap-2 rounded-xl bg-gradient-to-br ${a.color} border border-border/50 px-4 py-2 text-sm font-medium text-foreground hover:shadow-md transition-all hover:-translate-y-0.5`}
                >
                  <span className="text-lg">{a.emoji}</span>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Decorative circles */}
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-20">
          <div className="absolute right-10 top-5 h-20 w-20 rounded-full bg-primary/30 blur-xl" />
          <div className="absolute right-32 bottom-5 h-16 w-16 rounded-full bg-accent/30 blur-xl" />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value="1,284" change="12.5% from last month" changeType="up" icon={Users} />
        <StatCard title="Revenue" value="$84,254" change="8.2% from last month" changeType="up" icon={DollarSign} iconColor="bg-success/10 text-success" />
        <StatCard title="Active Tasks" value="42" change="3 completed today" changeType="up" icon={ClipboardList} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Projects" value="12" change="2 due this week" changeType="down" icon={FolderKanban} iconColor="bg-accent/10 text-accent" />
      </motion.div>

      {/* Charts */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Revenue Overview
            </h3>
            <div className="flex gap-1 rounded-lg bg-secondary/60 p-0.5">
              {["Week", "Month", "Year"].map((p) => (
                <button key={p} className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${p === "Month" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13, background: "hsl(var(--card))" }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-accent" /> Deal Status
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value">
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13, background: "hsl(var(--card))" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-semibold text-foreground ml-auto">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Performance + Activity */}
      <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-warning" /> Team Performance
          </h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={performanceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} width={70} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", fontSize: 13, background: "hsl(var(--card))" }} />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-foreground">Recent Activity</h3>
            <button className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-0">
            {activities.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-3 border-b border-border last:border-0 group hover:bg-secondary/30 -mx-3 px-3 rounded-lg transition-colors">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-base">
                  {a.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.time}</p>
                </div>
                <StatusBadge status={a.type} />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
