import { NavLink, useLocation } from "react-router-dom";
import type { MouseEvent as ReactMouseEvent } from "react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { RADIUS, TEXT } from "@/lib/design-tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useQueryClient } from "@tanstack/react-query";
import { crmKeys } from "@/hooks/use-crm-data";
import { getSectionMeta, getVisibleSections, type SidebarSectionKey } from "./sidebarConfig";

interface SidebarProps {
  activeSection: SidebarSectionKey;
  width: number;
  onResizeStart: (event: ReactMouseEvent<HTMLDivElement>) => void;
}

export default function Sidebar({ activeSection, width, onResizeStart }: SidebarProps) {
  const location = useLocation();
  const { role } = useTheme();
  const visibleSections = getVisibleSections(role);
  const section = visibleSections.find((item) => item.key === activeSection) ?? visibleSections[0] ?? getSectionMeta(activeSection);
  const compact = width < 180;
  const visibleItems = section.items;
  const queryClient = useQueryClient();

  const prefetchData = (to: string) => {
    if (to.includes("/sales/clients")) {
      queryClient.prefetchInfiniteQuery({
        queryKey: [...crmKeys.clients, { search: "", status: "all", segment: "all", limit: 8 }],
      });
    } else if (to.includes("/workspace/projects")) {
      queryClient.prefetchQuery({ queryKey: crmKeys.projects });
    } else if (to.includes("/workspace/tasks")) {
      queryClient.prefetchQuery({ queryKey: crmKeys.tasks });
    } else if (to.includes("/sales/leads")) {
      queryClient.prefetchQuery({ queryKey: crmKeys.leads });
    } else if (to.includes("/overview")) {
      queryClient.prefetchQuery({ queryKey: ["dashboard-data"] });
    }
  };

  return (
    <aside
      className="fixed left-[72px] top-0 z-30 flex h-screen flex-col border-r border-sidebar-border bg-sidebar shadow-[4px_0_12px_hsl(var(--sidebar-border)/0.4)]"
      style={{ width }}
    >
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onResizeStart}
        className="absolute right-[-5px] top-0 z-20 h-full w-3 cursor-col-resize touch-none"
      >
        <div className="absolute left-1/2 top-1/2 h-12 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sidebar-border/70 transition" />
      </div>
      <div className={cn("relative flex items-center border-b border-sidebar-border", compact ? "h-14 px-3" : "h-16 px-4")}>
        {!compact && (
          <div>
            <p className={cn("font-semibold uppercase tracking-[0.22em] text-sidebar-muted", TEXT.meta)}>Section</p>
            <h2 className="mt-1 font-display text-lg font-semibold text-sidebar-foreground">{section.label}</h2>
          </div>
        )}
        <div className={cn("ml-auto flex items-center justify-center bg-sidebar-hover text-sidebar-active", RADIUS.lg, compact ? "h-10 w-10" : "h-9 w-9")}>
          <section.icon className="h-4.5 w-4.5" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {!compact && <p className={cn("px-2 font-medium text-sidebar-muted", TEXT.meta)}>{section.description}</p>}
        <div className="mt-4 space-y-1.5">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onMouseEnter={() => prefetchData(item.to)}
                className={cn(
                  "group flex items-center rounded-2xl py-2.5 text-sm font-medium transition",
                  compact ? "justify-center px-2" : "gap-3 px-3",
                  isActive
                    ? "bg-sidebar-active/16 text-sidebar-active shadow-[0_10px_24px_hsl(222_58%_5%_/_0.16)]"
                    : "text-sidebar-foreground/92 hover:bg-sidebar-hover hover:text-sidebar-foreground",
                )}
              >
                <div className={cn("flex h-9 w-9 items-center justify-center border transition", RADIUS.md, isActive ? "border-sidebar-active/30 bg-sidebar-active/12" : "border-sidebar-border/80 bg-sidebar-hover/40")}>
                  <item.icon className={cn("h-4.5 w-4.5", isActive ? "text-sidebar-active" : "text-sidebar-muted group-hover:text-sidebar-foreground")} />
                </div>
                {!compact && (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-semibold",
                          item.badge === "New" ? "bg-success/20 text-success-foreground" : "bg-destructive/20 text-destructive-foreground",
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </NavLink>
            );
          })}
        </div>
        {!visibleItems.length && (
          <div className={cn("mt-4 border border-dashed border-sidebar-border/70 bg-sidebar-hover/20 text-center text-sidebar-muted", RADIUS.lg, TEXT.meta, "p-4")}>
            No available pages for this role in this section.
          </div>
        )}
      </div>

    </aside>
  );
}
