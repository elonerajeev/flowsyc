import { NavLink, useLocation } from "react-router-dom";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { RADIUS, TEXT } from "@/lib/design-tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessDevOpsItem, devopsSections, type DevOpsSectionKey } from "./devopsConfig";

interface DevOpsSidebarProps {
  activeSection: DevOpsSectionKey;
  width: number;
  onResizeStart: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

export default function DevOpsSidebar({ activeSection, width, onResizeStart }: DevOpsSidebarProps) {
  const location = useLocation();
  const { role } = useTheme();
  const { user } = useAuth();
  const effectiveRole = user?.role ?? role;
  const section = devopsSections.find((s) => s.key === activeSection) ?? devopsSections[0];
  const compact = width < 180;

  return (
    <aside
      className="fixed left-[72px] top-0 z-30 flex h-screen flex-col border-r border-sidebar-border bg-sidebar shadow-[4px_0_12px_hsl(var(--sidebar-border)/0.4)]"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onResizeStart}
        className="absolute right-[-5px] top-0 z-20 h-full w-3 cursor-col-resize touch-none"
      >
        <div className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sidebar-border/70 transition" />
      </div>

      {/* Header — identical to CRM Sidebar */}
      <div className={cn("relative flex items-center border-b border-sidebar-border", compact ? "h-14 px-3" : "h-16 px-4")}>
        {!compact && (
          <div>
            <p className={cn("font-semibold uppercase tracking-[0.22em] text-sidebar-muted", TEXT.meta)}>DevOps Hub</p>
            <h2 className="mt-1 font-display text-lg font-semibold text-sidebar-foreground">{section.label}</h2>
          </div>
        )}
        <div className={cn("ml-auto flex items-center justify-center bg-sidebar-hover text-sidebar-active", RADIUS.lg, compact ? "h-10 w-10" : "h-9 w-9")}>
          <section.icon className="h-4.5 w-4.5" />
        </div>
      </div>

      {/* Nav items — identical structure to CRM Sidebar */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        {!compact && (
          <p className={cn("px-2 font-medium text-sidebar-muted", TEXT.meta)}>{section.description}</p>
        )}
        <div className="mt-4 space-y-1.5">
          {section.items.map((item) => {
            const isActive = location.pathname === item.to;
            const isLocked = !canAccessDevOpsItem(item.roles, effectiveRole);
            return (
              isLocked ? (
                <button
                  key={item.to}
                  type="button"
                  title={`${item.label} - locked for this role`}
                  className={cn(
                    "group flex w-full items-center rounded-2xl py-2.5 text-sm font-medium transition",
                    compact ? "justify-center px-2" : "gap-3 px-3",
                    "text-sidebar-muted/90 hover:bg-sidebar-hover",
                  )}
                >
                  <div className={cn(
                    "relative flex h-9 w-9 items-center justify-center border",
                    RADIUS.md,
                    "border-sidebar-border/80 bg-sidebar-hover/40",
                  )}>
                    <item.icon className="h-4.5 w-4.5 text-sidebar-muted" />
                    <Lock className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-sidebar-bg p-0.5 text-sidebar-muted" />
                  </div>
                  {!compact && (
                    <span className="truncate">{item.label}</span>
                  )}
                </button>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group flex items-center rounded-2xl py-2.5 text-sm font-medium transition",
                    compact ? "justify-center px-2" : "gap-3 px-3",
                    isActive
                      ? "bg-sidebar-active/16 text-sidebar-active shadow-[0_10px_24px_hsl(222_58%_5%_/_0.16)]"
                      : "text-sidebar-foreground/92 hover:bg-sidebar-hover hover:text-sidebar-foreground",
                  )}
                >
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center border transition",
                    RADIUS.md,
                    isActive
                      ? "border-sidebar-active/30 bg-sidebar-active/12"
                      : "border-sidebar-border/80 bg-sidebar-hover/40",
                  )}>
                    <item.icon className={cn(
                      "h-4.5 w-4.5",
                      isActive ? "text-sidebar-active" : "text-sidebar-muted group-hover:text-sidebar-foreground",
                    )} />
                  </div>
                  {!compact && (
                    <span className="truncate">{item.label}</span>
                  )}
                </NavLink>
              )
            );
          })}
        </div>
      </div>
    </aside>
  );
}
