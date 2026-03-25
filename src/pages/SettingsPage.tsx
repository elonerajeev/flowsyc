import { motion } from "framer-motion";
import { User, Bell, Shield, Palette, Globe, Key, Monitor, Database } from "lucide-react";
import { useTheme, ThemeColor, UserRole } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

const colorSwatches: { value: ThemeColor; color: string; label: string }[] = [
  { value: "teal", color: "bg-[hsl(173,58%,39%)]", label: "Teal" },
  { value: "violet", color: "bg-[hsl(262,83%,58%)]", label: "Violet" },
  { value: "rose", color: "bg-[hsl(346,77%,50%)]", label: "Rose" },
  { value: "amber", color: "bg-[hsl(38,92%,50%)]", label: "Amber" },
  { value: "blue", color: "bg-[hsl(217,91%,60%)]", label: "Blue" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function SettingsPage() {
  const { mode, toggleMode, color, setColor, role, setRole } = useTheme();

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-4xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">Settings ⚙️</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
      </motion.div>

      {/* Profile */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4"><User className="h-4 w-4 text-primary" /> Profile</h3>
        <div className="flex items-center gap-5 mb-6">
          <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-2xl font-display font-bold text-foreground">JD</div>
          <div>
            <p className="text-lg font-display font-bold text-foreground">John Doe</p>
            <p className="text-sm text-muted-foreground">john@crmpro.com</p>
            <p className="text-xs text-primary capitalize mt-0.5">👑 {role}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
            <input defaultValue="John Doe" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
            <input defaultValue="john@crmpro.com" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
            <input defaultValue="+1 (555) 123-4567" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Location</label>
            <input defaultValue="San Francisco, CA" className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4"><Palette className="h-4 w-4 text-accent" /> Appearance</h3>

        {/* Theme Mode */}
        <div className="mb-6">
          <p className="text-sm font-medium text-foreground mb-3">Theme Mode</p>
          <div className="flex gap-3">
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { if (m !== mode) toggleMode(); }}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-medium transition-all",
                  m === mode ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border text-muted-foreground hover:bg-secondary"
                )}
              >
                {m === "light" ? "☀️" : "🌙"} {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Accent Color */}
        <div>
          <p className="text-sm font-medium text-foreground mb-3">Accent Color</p>
          <div className="flex gap-3">
            {colorSwatches.map((s) => (
              <button
                key={s.value}
                onClick={() => setColor(s.value)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all",
                  color === s.value ? "border-primary shadow-sm bg-primary/5" : "border-border hover:bg-secondary"
                )}
              >
                <div className={cn("h-8 w-8 rounded-full", s.color)} />
                <span className="text-[10px] font-medium text-muted-foreground">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Role (for demo) */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4"><Shield className="h-4 w-4 text-warning" /> Role Simulation (Demo)</h3>
        <p className="text-xs text-muted-foreground mb-3">Switch roles to see how the sidebar and features change for different users.</p>
        <div className="flex flex-wrap gap-3">
          {(["admin", "manager", "employee", "client"] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                r === role ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              {r === "admin" && "👑"}{r === "manager" && "📋"}{r === "employee" && "💼"}{r === "client" && "🤝"}
              <span className="capitalize">{r}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Notifications */}
      <motion.div variants={item} className="rounded-2xl border border-border bg-card/80 backdrop-blur-sm p-6 shadow-card">
        <h3 className="font-display font-semibold text-foreground flex items-center gap-2 mb-4"><Bell className="h-4 w-4 text-info" /> Notifications</h3>
        <div className="space-y-4">
          {[
            { label: "Email notifications", desc: "Receive updates via email", checked: true },
            { label: "Push notifications", desc: "Browser push notifications", checked: true },
            { label: "Task reminders", desc: "Get reminded about upcoming deadlines", checked: false },
            { label: "Weekly digest", desc: "Summary of your week's activity", checked: true },
          ].map((n) => (
            <div key={n.label} className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={n.checked} className="sr-only peer" />
                <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-card after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="flex justify-end pb-8">
        <button className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">Save Changes</button>
      </motion.div>
    </motion.div>
  );
}
