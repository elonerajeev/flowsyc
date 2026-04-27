import { useNavigate } from "react-router-dom";
import { BadgeCheck, Clock3, Lock, Mail, Sparkles, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { RADIUS, TEXT } from "@/lib/design-tokens";
import { canAccessItem, sidebarSections, type SidebarSectionKey } from "./sidebarConfig";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

interface MasterSidebarProps {
  activeSection: SidebarSectionKey;
  onSectionChange: (section: SidebarSectionKey) => void;
}

export default function MasterSidebar({ activeSection, onSectionChange }: MasterSidebarProps) {
  const navigate = useNavigate();
  const { role } = useTheme();
  const { user } = useAuth();

  const displayName = user?.name ?? "Guest user";
  const email = user?.email ?? "No account connected";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "GU";
  const sessionLabel = user ? "Active session" : "No session";
  const workspaceLabel = `${role.charAt(0).toUpperCase()}${role.slice(1)} workspace`;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[72px] flex-col border-r border-sidebar-border bg-sidebar shadow-[4px_0_16px_hsl(var(--sidebar-border)/0.5)]">
      <div className="relative flex h-16 items-center justify-center border-b border-sidebar-border">
        <div className={cn("flex h-10 w-10 items-center justify-center bg-gradient-to-br from-primary via-accent to-info shadow-lg shadow-black/20", RADIUS.lg)}>
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
      </div>

      <div className="flex-1 px-2 py-4">
        <div className="space-y-2">
          {sidebarSections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.key;
            const allowedItems = section.items.filter((item) => canAccessItem(item.roles, role));
            const isLocked = allowedItems.length === 0;
            return (
            <button
                key={section.key}
                type="button"
                title={`${section.label}${isLocked ? " - locked for this role" : ""}`}
                onClick={() => {
                  if (isLocked) {
                    navigate("/restricted", { state: { from: section.label } });
                    return;
                  }
                  onSectionChange(section.key);
                  navigate(allowedItems[0]?.to ?? "/overview");
                }}
                className={cn(
                  "group flex h-12 w-full items-center justify-center rounded-2xl border transition",
                  isActive
                    ? "border-sidebar-active/40 bg-sidebar-active/16 text-sidebar-active shadow-[0_10px_24px_hsl(222_58%_5%_/_0.18)]"
                    : "border-transparent text-sidebar-fg hover:border-sidebar-border hover:bg-sidebar-hover hover:text-sidebar-foreground",
                )}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" />
                  {isLocked && (
                    <Lock className="absolute -right-2 -top-2 h-3 w-3 rounded-full bg-sidebar-bg p-0.5 text-sidebar-muted" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative px-2 pb-3">
        <div className="group relative">
          <button
            type="button"
            className={cn("flex h-12 w-full items-center justify-center border border-sidebar-border bg-[linear-gradient(180deg,hsl(var(--sidebar-active)_/_0.14),hsl(var(--sidebar-hover)_/_0.12))] text-sidebar-foreground transition hover:border-sidebar-active/40 hover:bg-[linear-gradient(180deg,hsl(var(--sidebar-active)_/_0.2),hsl(var(--sidebar-hover)_/_0.16))]", RADIUS.lg)}
            aria-label="Workspace profile"
          >
            <div className={cn("relative flex h-9 w-9 items-center justify-center overflow-hidden border border-sidebar-active/30 bg-[linear-gradient(135deg,hsl(var(--sidebar-active)_/_0.28),hsl(var(--sidebar-primary)_/_0.16))] shadow-[0_10px_24px_hsl(222_58%_5%_/_0.18)]", RADIUS.lg)}>
              <span className={cn("font-semibold tracking-[0.08em] text-sidebar-active", TEXT.meta)}>{initials}</span>
              <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-sidebar-bg bg-success shadow-[0_0_0_2px_hsl(var(--sidebar-bg))]" />
            </div>
          </button>

          <div className={cn("pointer-events-none absolute left-full bottom-0 z-50 ml-3 w-72 translate-x-2 border border-sidebar-border bg-sidebar p-4 opacity-0 shadow-[0_24px_64px_hsl(var(--sidebar-border)/0.5)] transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100", RADIUS.lg)}>
            <div className="flex items-start gap-3">
              <div className={cn("relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden border border-sidebar-active/30 bg-[linear-gradient(135deg,hsl(var(--sidebar-active)_/_0.28),hsl(var(--sidebar-primary)_/_0.16))] shadow-[0_12px_28px_hsl(222_58%_5%_/_0.22)]", RADIUS.xl)}>
                <span className={cn("font-display text-sm font-semibold tracking-[0.08em] text-sidebar-active", TEXT.meta)}>{initials}</span>
                <span className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full border border-sidebar-bg bg-success shadow-[0_0_0_2px_hsl(var(--sidebar-bg))]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
                  <span className={cn("inline-flex items-center gap-1 rounded-full border border-sidebar-active/20 bg-sidebar-active/12 px-2 py-0.5 font-semibold text-sidebar-active", TEXT.meta)}>
                    <Sparkles className="h-3 w-3" />
                    Live
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2 text-sidebar-muted">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <p className={cn("truncate", TEXT.meta)}>{email}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-sidebar-border/80 bg-sidebar-hover/50 px-2.5 py-1 text-sidebar-foreground", TEXT.meta)}>
                    <BadgeCheck className="h-3.5 w-3.5 text-sidebar-active" />
                    {workspaceLabel}
                  </span>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-sidebar-border/80 bg-sidebar-hover/50 px-2.5 py-1 text-sidebar-muted", TEXT.meta)}>
                    <Clock3 className="h-3.5 w-3.5 text-sidebar-active" />
                    {sessionLabel}
                  </span>
                </div>
                <p className={cn("mt-3 leading-5 text-sidebar-muted", TEXT.meta)}>
                  {user ? "Profile synced from the auth session and mirrored into the sidebar." : "Sign in to populate the workspace profile with your account details."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
}
