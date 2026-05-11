import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, ChevronRight, LogOut, Settings, ShieldCheck,
  Sparkles, UserCircle, Users, Check,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { RADIUS, TEXT } from "@/lib/design-tokens";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { UserRole } from "@/contexts/ThemeContext";

const ROLE_META: Record<UserRole, { label: string; color: string; icon: React.ElementType }> = {
  admin:    { label: "Admin",    color: "text-violet-400",  icon: ShieldCheck },
  manager:  { label: "Manager",  color: "text-blue-400",    icon: Users },
  employee: { label: "Employee", color: "text-emerald-400", icon: UserCircle },
  client:   { label: "Client",   color: "text-amber-400",   icon: Building2 },
};

export default function WorkspaceSwitcher() {
  const [open, setOpen] = useState(false);
  const { user, logout, switchRole } = useAuth();
  const { role } = useTheme();
  const navigate = useNavigate();

  const displayName = user?.name ?? "Guest";
  const email = user?.email ?? "";
  const orgName = user?.organizationId ? "Flowsyc Org" : "Personal Workspace";
  const initials = displayName.split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "GU";

  const currentRole = ROLE_META[role] ?? ROLE_META.employee;
  const RoleIcon = currentRole.icon;

  const handleSwitchRole = async (target: UserRole) => {
    if (target === role) return;
    await switchRole(target);
    setOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="relative px-2 pb-3">
      {/* Trigger button */}
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
        aria-label="Workspace switcher"
        title="Workspace & account"
      >
        <div className={cn(
          "relative flex h-9 w-9 items-center justify-center overflow-hidden border border-sidebar-active/30 bg-gradient-to-br from-sidebar-active/28 to-sidebar-primary/16",
          RADIUS.lg,
        )}>
          <span className={cn("font-semibold tracking-wide text-sidebar-active", TEXT.meta)}>{initials}</span>
          <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-sidebar-bg bg-emerald-500" />
        </div>
      </button>

      {/* Popup panel */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div className={cn(
            "absolute bottom-0 left-full z-50 ml-3 w-72 border border-sidebar-border bg-sidebar shadow-[0_24px_64px_hsl(var(--sidebar-border)/0.6)]",
            RADIUS.xl,
          )}>

            {/* Workspace header */}
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

              {/* Current workspace */}
              <div className={cn(
                "mt-3 flex items-center gap-2 border border-sidebar-border bg-sidebar-hover/50 px-3 py-2",
                RADIUS.lg,
              )}>
                <Building2 className="h-4 w-4 shrink-0 text-sidebar-active" />
                <div className="min-w-0 flex-1">
                  <p className={cn("font-semibold text-sidebar-foreground", TEXT.meta)}>{orgName}</p>
                  <p className={cn("text-sidebar-muted", TEXT.meta)}>Current workspace</p>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-400",
                  TEXT.meta,
                )}>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active
                </span>
              </div>
            </div>

            {/* Role switcher */}
            <div className="border-b border-sidebar-border p-3">
              <p className={cn("mb-2 px-1 font-semibold uppercase tracking-widest text-sidebar-muted", TEXT.meta)}>
                Switch Role
              </p>
              <div className="space-y-0.5">
                {(Object.entries(ROLE_META) as [UserRole, typeof ROLE_META[UserRole]][]).map(([r, meta]) => {
                  const Icon = meta.icon;
                  const isActive = r === role;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleSwitchRole(r)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 transition",
                        RADIUS.lg,
                        isActive
                          ? "bg-sidebar-active/12 text-sidebar-foreground"
                          : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? meta.color : "")} />
                      <span className={cn("flex-1 text-left font-medium", TEXT.body)}>{meta.label}</span>
                      {isActive && <Check className={cn("h-3.5 w-3.5", meta.color)} />}
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
