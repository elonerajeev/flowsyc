import { Users, DollarSign, ClipboardList, FolderKanban, ArrowUpRight, Clock } from "lucide-react";
import StatCard from "@/components/shared/StatCard";
import StatusBadge from "@/components/shared/StatusBadge";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

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

const activities = [
  { id: 1, text: "Sarah closed deal with Acme Corp", time: "5 min ago", type: "completed" as const },
  { id: 2, text: "New task assigned to Mike: UI Review", time: "20 min ago", type: "pending" as const },
  { id: 3, text: "Client meeting scheduled with TechStart", time: "1 hour ago", type: "active" as const },
  { id: 4, text: "Project 'CRM v2' reached 80% completion", time: "2 hours ago", type: "in-progress" as const },
  { id: 5, text: "New candidate applied for Frontend role", time: "3 hours ago", type: "pending" as const },
  { id: 6, text: "Invoice #1024 sent to GlobalTech", time: "5 hours ago", type: "completed" as const },
];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back, John. Here's what's happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Clients" value="1,284" change="12.5% from last month" changeType="up" icon={Users} />
        <StatCard title="Revenue" value="$84,254" change="8.2% from last month" changeType="up" icon={DollarSign} iconColor="bg-success/10 text-success" />
        <StatCard title="Active Tasks" value="42" change="3 completed today" changeType="up" icon={ClipboardList} iconColor="bg-warning/10 text-warning" />
        <StatCard title="Projects" value="12" change="2 due this week" changeType="down" icon={FolderKanban} iconColor="bg-accent/10 text-accent" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 13%, 91%)", fontSize: 13 }} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(173, 58%, 39%)" fillOpacity={1} fill="url(#colorRevenue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h3 className="font-display font-semibold text-foreground mb-4">Team Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={performanceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "hsl(220, 9%, 46%)" }} width={70} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(220, 13%, 91%)", fontSize: 13 }} />
              <Bar dataKey="value" fill="hsl(173, 58%, 39%)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Activity Log */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-semibold text-foreground">Recent Activity</h3>
          <button className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowUpRight className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-0">
          {activities.map((a) => (
            <div key={a.id} className="flex items-start gap-4 py-3 border-b border-border last:border-0">
              <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary">
                <Clock className="h-4 w-4 text-muted-foreground" />
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
    </div>
  );
}
