import { Search, Bell, Sun, Moon, ChevronDown, Command, Sparkles, Plus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useTheme, UserRole } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

const roleLabels: Record<UserRole, { label: string; emoji: string }> = {
  admin: { label: "Admin", emoji: "👑" },
  manager: { label: "Manager", emoji: "" },
  employee: { label: "Employee", emoji: "" },
  client: { label: "Client", emoji: "" },
};

export default function Navbar() {
  const { mode, toggleMode, role, setRole } = useTheme();
  const { openCommandPalette, openQuickCreate, canUseQuickCreate } = useWorkspace();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

  const notifications = [
    { id: 1, text: "New client added: Acme Corp", time: "2m ago", unread: true },
    { id: 2, text: "Task 'Design Review' completed", time: "15m ago", unread: true },
    { id: 3, text: "Meeting with Sarah at 3 PM", time: "1h ago", unread: false },
    { id: 4, text: "Project milestone reached", time: "3h ago", unread: false },
    { id: 5, text: "New message from Lisa Park", time: "5h ago", unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)_/_0.92),hsl(var(--card)_/_0.82))] backdrop-blur-2xl px-6 shadow-[0_14px_34px_hsl(222_36%_8%_/_0.05)]">
      {/* Search */}
      <div className="relative w-full max-w-lg group">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <input
          type="text"
          placeholder="Search anything..."
          onFocus={openCommandPalette}
          className="h-10 w-full rounded-xl border border-border/80 bg-background/72 pl-10 pr-20 text-sm text-foreground placeholder:text-muted-foreground shadow-[inset_0_1px_0_hsl(0_0%_100%_/_0.04)] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-card transition-all"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 rounded-md border border-border/80 bg-secondary/58 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          <Command className="h-2.5 w-2.5" /> K
        </kbd>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1.5 ml-4">
        {canUseQuickCreate ? (
          <button
            onClick={openQuickCreate}
            className="hidden md:inline-flex items-center gap-2 h-9 rounded-xl bg-primary px-3.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground transition hover:brightness-105"
          >
            <Plus className="h-3.5 w-3.5" />
            Quick Create
          </button>
        ) : (
          <div className="hidden md:flex h-9 items-center rounded-xl border border-border/70 bg-secondary/30 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Read only
          </div>
        )}

        {/* Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleSwitcher(!showRoleSwitcher)}
            className="flex items-center gap-1.5 h-9 rounded-xl border border-border/70 bg-secondary/40 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground hover:bg-secondary transition-colors"
          >
            {role === "admin" && <span>👑</span>}
            <span className="hidden sm:inline">{roleLabels[role].label}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
          {showRoleSwitcher && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowRoleSwitcher(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card shadow-xl z-50 animate-scale-in overflow-hidden">
                <div className="p-2 border-b border-border">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2">Switch Role</p>
                </div>
                {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRole(r); setShowRoleSwitcher(false); }}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition-colors",
                      r === role ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <span className="text-base">{r === "admin" ? "👑" : ""}</span>
                    <span>{roleLabels[r].label}</span>
                    {r === role && <Sparkles className="h-3 w-3 ml-auto text-primary" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <button onClick={toggleMode} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-secondary/28 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all hover:scale-105">
          {mode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-secondary/28 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all hover:scale-105"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground min-w-[18px] h-[18px] px-1">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-xl z-50 animate-scale-in overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="font-display font-semibold text-sm text-foreground">Notifications</h3>
                  <span className="text-[10px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">{unreadCount} new</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className={cn("flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border last:border-0", n.unread && "bg-primary/[0.03]")}>
                      <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.unread ? "bg-primary animate-pulse" : "bg-transparent")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{n.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-border text-center">
                  <button className="text-xs text-primary font-medium hover:underline">View all notifications</button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Profile */}
        <div className="ml-1 flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/28 px-3 py-1.5 hover:bg-secondary/50 transition-colors cursor-pointer">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-info/60 via-accent/45 to-primary/55 shadow-[0_8px_24px_hsl(218_80%_8%_/_0.16)]">
              <span className="text-sm font-bold text-foreground">JD</span>
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-semibold text-foreground leading-tight">John Doe</p>
            <p className="text-[10px] text-muted-foreground capitalize">{role === "admin" && "👑 "}{roleLabels[role].label}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
