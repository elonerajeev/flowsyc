import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  BarChart3, Building2, ChevronRight,
  LogOut, Server, Settings, Sparkles, Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { RADIUS, TEXT } from "@/lib/design-tokens";
import { useAuth } from "@/contexts/AuthContext";

type WorkspaceId = "crm" | "devops";

const WORKSPACES: {
  id: WorkspaceId;
  label: string;
  description: string;
  route: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  {
    id: "crm",
    label: "Flowsyc CRM",
    description: "Clients, leads, deals, HR & finance",
    route: "/overview",
    icon: BarChart3,
    color: "text-violet-400",
    bg: "bg-violet-500/15",
  },
  {
    id: "devops",
    label: "DevOps Hub",
    description: "Infrastructure, health & deployments",
    route: "/devops/health",
    icon: Server,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
  },
];

function getActiveWorkspace(pathname: string): WorkspaceId {
  return pathname.startsWith("/devops") ? "devops" : "crm";
}

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const activeId = getActiveWorkspace(pathname);
  const displayName = user?.name ?? "Guest";
  const email = user?.email ?? "";
  const initials = displayName.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "GU";

  const handleSwitch = (ws: typeof WORKSPACES[number]) => {
    if (ws.id === activeId) return;
    navigate(ws.route);
    setOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="relative px-2 pb-3">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-12 w-full items-center justify-center border transition",
          open
            ? "border-sidebar-active/40 bg-sidebar-active/16 text-sidebar-active"
            : "border-sidebar-border bg-sidebar-hover/40 text-sidebar-foreground hover:border-sidebar-active/30 hover:bg-sidebar-active/10",
          RADIUS.lg,
        )}
        aria-label="Switch workspace"
        title="Switch workspace"
      >
        <div className={cn(
          "relative flex h-9 w-9 items-center justify-center overflow-hidden border border-sidebar-active/30 bg-gradient-to-br from-sidebar-active/28 to-sidebar-primary/16",
          RADIUS.lg,
        )}>
          <span className={cn("font-semibold tracking-wide text-sidebar-active", TEXT.meta)}>{initials}</span>
          <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-sidebar-bg bg-emerald-500" />
        </div>
      </button>

      {/* Panel */}
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className={cn(
            "absolute bottom-0 left-full z-50 ml-3 w-72 border border-sidebar-border bg-sidebar shadow-[0_24px_64px_hsl(var(--sidebar-border)/0.6)]",
            RADIUS.xl,
          )}>

            {/* User header */}
            <div className="border-b border-sidebar-border p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center border border-sidebar-active/30 bg-gradient-to-br from-sidebar-active/28 to-sidebar-primary/16",
                  RADIUS.lg,
                )}>
                  <span className="text-sm font-bold tracking-wide text-sidebar-active">{initials}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
                  <p className={cn("truncate text-sidebar-muted", TEXT.meta)}>{email}</p>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full border border-sidebar-active/20 bg-sidebar-active/12 px-2 py-0.5 font-semibold text-sidebar-active",
                  TEXT.meta,
                )}>
                  <Sparkles className="h-3 w-3" />
                  Live
                </span>
              </div>
            </div>

            {/* Workspace switcher */}
            <div className="border-b border-sidebar-border p-3">
              <p className={cn("mb-2 px-1 font-semibold uppercase tracking-widest text-sidebar-muted", TEXT.meta)}>
                Workspaces
              </p>
              <div className="space-y-1">
                {WORKSPACES.map((ws) => {
                  const Icon = ws.icon;
                  const isActive = ws.id === activeId;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => handleSwitch(ws)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 transition",
                        RADIUS.lg,
                        isActive
                          ? "bg-sidebar-active/10 ring-1 ring-sidebar-active/20"
                          : "hover:bg-sidebar-hover",
                      )}
                    >
                      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center", RADIUS.lg, ws.bg)}>
                        <Icon className={cn("h-4 w-4", ws.color)} />
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className={cn("font-semibold", TEXT.body, isActive ? "text-sidebar-foreground" : "text-sidebar-muted group-hover:text-sidebar-foreground")}>
                          {ws.label}
                        </p>
                        <p className={cn("text-sidebar-muted", TEXT.meta)}>{ws.description}</p>
                      </div>
                      {isActive && <Check className={cn("h-3.5 w-3.5 shrink-0", ws.color)} />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="p-3 space-y-0.5">
              <button
                type="button"
                onClick={() => { navigate("/system/settings"); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-sidebar-muted transition hover:bg-sidebar-hover hover:text-sidebar-foreground",
                  RADIUS.lg,
                )}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span className={cn("flex-1 text-left font-medium", TEXT.body)}>Settings</span>
                <ChevronRight className="h-3.5 w-3.5 opacity-40" />
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-red-400 transition hover:bg-red-500/10 hover:text-red-300",
                  RADIUS.lg,
                )}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className={cn("flex-1 text-left font-medium", TEXT.body)}>Sign out</span>
              </button>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
