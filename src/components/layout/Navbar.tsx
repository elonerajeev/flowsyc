import { Search, Bell, Sun, Moon, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  const notifications = [
    { id: 1, text: "New client added: Acme Corp", time: "2m ago", unread: true },
    { id: 2, text: "Task 'Design Review' completed", time: "15m ago", unread: true },
    { id: 3, text: "Meeting with Sarah at 3 PM", time: "1h ago", unread: false },
    { id: 4, text: "Project milestone reached", time: "3h ago", unread: false },
  ];

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-6">
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search clients, tasks, projects..."
          className="h-10 w-full rounded-lg border border-input bg-secondary/50 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
        />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <button onClick={toggleDark} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          </button>
          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-border bg-card shadow-lg animate-scale-in">
              <div className="p-4 border-b border-border">
                <h3 className="font-display font-semibold text-sm">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div key={n.id} className={cn("flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors", n.unread && "bg-primary/5")}>
                    <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.unread ? "bg-primary" : "bg-transparent")} />
                    <div>
                      <p className="text-sm text-foreground">{n.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="ml-2 flex items-center gap-3 rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors cursor-pointer">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-sm font-semibold text-primary">JD</span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-foreground leading-tight">John Doe</p>
            <p className="text-xs text-muted-foreground">Admin</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground hidden md:block" />
        </div>
      </div>
    </header>
  );
}
