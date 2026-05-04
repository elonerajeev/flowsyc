import { Search, Bell, Sun, Moon, ChevronDown, Command, Plus, Settings, LogOut, User, Shield, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTheme, UserRole } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNotifications } from "@/contexts/NotificationContext";
import NotificationCenter from "@/components/layout/NotificationCenter";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { triggerHaptic } from "@/lib/micro-interactions";
import { useAuth } from "@/contexts/AuthContext";
import { findTeamMemberByEmail, useSharedTeamMembers } from "@/lib/team-roster";
import { toast } from "@/components/ui/sonner";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { getAllowedRolesForPath, getAccessiblePathForRole } from "@/components/layout/sidebarConfig";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
  client: "Client",
};

const prefetchQuickCreate = () => import("@/components/crm/QuickCreateDialog");
const prefetchCommandPalette = () => import("@/components/crm/CommandPalette");

export default function Navbar() {
  const { mode, toggleMode, role: themeRole, setRole } = useTheme();
  const { openCommandPalette, openQuickCreate, canUseQuickCreate, privacyMode, togglePrivacyMode } = useWorkspace();
  const { unreadCount, toggleCenter, centerOpen } = useNotifications();
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = (user?.role ?? themeRole) as UserRole;
  const sharedTeamMembers = useSharedTeamMembers();
  const employeeRecord = findTeamMemberByEmail(sharedTeamMembers, user?.email);
  const displayName = user?.name ?? "Guest";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const computeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };
  const [greeting, setGreeting] = useState(computeGreeting);
  const [switchingRole, setSwitchingRole] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => setGreeting(computeGreeting()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    triggerHaptic();
    await logout();
    navigate("/login");
  };

  const handleSwitchRole = async (targetRole: UserRole) => {
    if (targetRole === role || switchingRole) return;
    setSwitchingRole(true);
    triggerHaptic();

    const result = await switchRole(targetRole);
    setSwitchingRole(false);

    if (result.success) {
      setRole(targetRole);
      toast.success(`Switched to ${roleLabels[targetRole]}`);
      // Navigate to first accessible path for new role to avoid redirect loop
      const allowedRoles = getAllowedRolesForPath(location.pathname);
      if (!allowedRoles || !allowedRoles.includes(targetRole)) {
        navigate(getAccessiblePathForRole(targetRole));
      }
    } else if (result.error === "NO_SESSION") {
      toast.error("Session expired. Please sign in again.");
      navigate(`/login?switchRole=${targetRole}`);
    } else if (result.error === "ROLE_MISMATCH") {
      toast.error("Access denied", {
        description: `Your account does not have the ${roleLabels[targetRole]} role.`,
      });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-border/60 bg-card/95 px-4 py-3 backdrop-blur-xl shadow-sm md:h-16 md:flex-row md:items-center md:justify-between md:px-6 md:py-0">
      <div className="flex items-center gap-4">
        <Breadcrumbs />
      </div>

      {/* Search */}
      <div className="group relative w-full max-w-none md:max-w-xl">
        <div className={cn("premium-hover flex h-11 items-center border border-border/70 bg-card/85 backdrop-blur-xl transition-all", RADIUS.xl, "shadow-[0_2px_8px_hsl(222_42%_12%_/_0.04)] group-focus-within:border-primary/40 group-focus-within:bg-card/95 group-focus-within:shadow-[0_8px_24px_hsl(222_42%_12%_/_0.08)]")}>
          <Search className="ml-3.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            placeholder="Search anything..."
            onFocus={openCommandPalette}
            onMouseEnter={prefetchCommandPalette}
            readOnly
            className={cn("h-full w-full bg-transparent pl-3 pr-20 text-foreground placeholder:text-muted-foreground/80 outline-none focus:outline-none", TEXT.body)}
          />
          <kbd className={cn("absolute right-3 top-1/2 -translate-y-1/2 hidden md:inline-flex items-center gap-0.5 border border-border/80 bg-secondary/55 font-medium uppercase tracking-[0.12em] text-muted-foreground", RADIUS.sm, "px-1.5 py-0.5", TEXT.meta)}>
            <Command className="h-2.5 w-2.5" /> K
          </kbd>
        </div>
      </div>

      {/* Right side */}
      <div className="flex w-full items-center justify-between gap-1.5 md:ml-4 md:w-auto md:justify-end">
        {canUseQuickCreate ? (
          <button
            onClick={() => openQuickCreate()}
            onMouseEnter={prefetchQuickCreate}
            className={cn("premium-hover inline-flex items-center gap-2 h-9 bg-primary font-semibold uppercase tracking-[0.14em] text-primary-foreground transition hover:brightness-105", RADIUS.xl, "px-3.5", TEXT.eyebrow)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Quick Create</span>
          </button>
        ) : (
          <div className={cn("flex h-9 items-center border border-border/70 bg-secondary/30 font-semibold uppercase tracking-[0.14em] text-muted-foreground md:hidden", RADIUS.xl, "px-3", TEXT.meta)}>
            Read only
          </div>
        )}

        {/* Theme toggle */}
        <button onClick={toggleMode} className={cn("premium-hover flex h-9 w-9 items-center justify-center border border-border/70 bg-secondary/28 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all hover:scale-105", RADIUS.xl)}>
          {mode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        {/* Privacy toggle */}
        <button
          onClick={togglePrivacyMode}
          title={privacyMode ? "Privacy mode ON — click to reveal data" : "Click to hide sensitive data"}
          className={cn(
            "premium-hover relative flex h-9 items-center gap-1.5 border px-2.5 transition-all hover:scale-105",
            privacyMode
              ? "border-warning/50 bg-warning/10 text-warning shadow-[0_0_12px_hsl(var(--warning)/0.2)]"
              : "border-border/70 bg-secondary/28 text-muted-foreground hover:bg-secondary hover:text-foreground",
            RADIUS.xl
          )}
        >
          {privacyMode
            ? <><EyeOff className="h-4 w-4" /><span className="text-xs font-semibold hidden sm:inline">Private</span></>
            : <><Eye className="h-4 w-4" /><span className="text-xs font-semibold hidden sm:inline">Visible</span></>
          }
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={toggleCenter}
            className={cn("premium-hover relative flex h-9 w-9 items-center justify-center border border-border/70 bg-secondary/28 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all hover:scale-105", RADIUS.xl)}
            aria-expanded={centerOpen}
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground min-w-[18px] h-[18px] px-1">
                {unreadCount}
              </span>
            )}
          </button>
          <NotificationCenter />
        </div>

        {/* Profile Dropdown — single button, no separate role badge */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "premium-hover ml-1 flex items-center gap-3 border border-border/70 bg-secondary/28 hover:bg-secondary/50 transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-primary/30",
                RADIUS.lg,
                SPACING.buttonCompact,
              )}
            >
              <div className="relative">
                <div className={cn("flex h-9 w-9 items-center justify-center bg-primary/15 border border-primary/25", RADIUS.pill)}>
                  <span className="text-sm font-semibold text-primary">{initials}</span>
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success border-2 border-card" />
              </div>
              <div className="hidden md:block text-left max-w-[120px]">
                <p className={cn("font-semibold text-foreground leading-tight truncate", TEXT.body)}>
                  {displayName.split(" ")[0]}
                </p>
                <p className={cn("text-muted-foreground capitalize truncate", TEXT.meta)}>
                  {roleLabels[role]}
                </p>
              </div>
              <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-72 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-xl shadow-xl p-1.5">

            {/* Profile header — dynamic for all roles */}
            <DropdownMenuLabel className="px-3 py-3">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center bg-primary/15 border border-primary/25 text-base font-semibold text-primary", RADIUS.pill)}>
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email ?? "—"}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {roleLabels[role]}
                    </span>
                    {user?.department && (
                      <span className="rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {user.department}
                      </span>
                    )}
                    {employeeRecord && (
                      <span className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        employeeRecord.terminatedAt
                          ? "border-destructive/25 bg-destructive/10 text-destructive"
                          : employeeRecord.suspendedAt
                            ? "border-warning/25 bg-warning/10 text-warning"
                            : "border-success/25 bg-success/10 text-success",
                      )}>
                        {employeeRecord.terminatedAt ? "Terminated" : employeeRecord.suspendedAt ? "Suspended" : "Active"}
                      </span>
                    )}
                  </div>
                  {user?.designation && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{user.designation} · {user.employeeId}</p>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              onClick={() => navigate("/system/settings")}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm cursor-pointer"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Profile &amp; Settings</span>
            </DropdownMenuItem>

            {(role === "admin" || role === "manager") && (
              <DropdownMenuItem
                onClick={() => navigate("/system/access")}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm cursor-pointer"
              >
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span>Access &amp; Permissions</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuItem
              onClick={() => navigate("/system/settings")}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm cursor-pointer"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Workspace Settings</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            {/* Switch Role */}
            <div className="px-3 py-2">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Switch Role</p>
              <div className="grid grid-cols-2 gap-1.5">
                {(["admin", "manager", "employee", "client"] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={switchingRole || r === role}
                    onClick={() => handleSwitchRole(r)}
                    className={cn(
                      "flex items-center justify-between rounded-xl border px-3 py-2 text-xs font-semibold transition",
                      r === role
                        ? "border-primary/40 bg-primary/10 text-primary cursor-default"
                        : "border-border/60 bg-secondary/30 text-foreground hover:bg-secondary/60 cursor-pointer",
                      switchingRole && r !== role && "opacity-50",
                    )}
                  >
                    <span>{roleLabels[r]}</span>
                    {r === role && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                  </button>
                ))}
              </div>
            </div>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
