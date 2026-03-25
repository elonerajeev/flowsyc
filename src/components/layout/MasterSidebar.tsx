import { useNavigate } from "react-router-dom";
import { Lock, Zap } from "lucide-react";

import { cn } from "@/lib/utils";
import { canAccessItem, sidebarSections, type SidebarSectionKey } from "./sidebarConfig";
import { useTheme } from "@/contexts/ThemeContext";

interface MasterSidebarProps {
  activeSection: SidebarSectionKey;
  onSectionChange: (section: SidebarSectionKey) => void;
}

export default function MasterSidebar({ activeSection, onSectionChange }: MasterSidebarProps) {
  const navigate = useNavigate();
  const { role } = useTheme();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[72px] flex-col border-r border-sidebar-border bg-[linear-gradient(180deg,hsl(var(--sidebar-bg))_0%,hsl(220_42%_14%)_100%)] shadow-[24px_0_60px_hsl(222_58%_5%_/_0.22)]">
      <div className="relative flex h-16 items-center justify-center border-b border-sidebar-border">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-accent to-info shadow-lg shadow-black/20">
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
                  onSectionChange(section.key);
                  navigate(allowedItems[0]?.to ?? "/overview");
                }}
                className={cn(
                  "group flex h-12 w-full items-center justify-center rounded-2xl border transition",
                  isActive
                    ? "border-sidebar-active/40 bg-sidebar-active/16 text-sidebar-active shadow-[0_10px_24px_hsl(222_58%_5%_/_0.18)]"
                    : isLocked
                      ? "border-transparent text-sidebar-muted/80 hover:border-sidebar-border hover:bg-sidebar-hover hover:text-sidebar-foreground"
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
            className="flex h-12 w-full items-center justify-center rounded-2xl border border-sidebar-border bg-[linear-gradient(180deg,hsl(var(--sidebar-active)_/_0.14),hsl(var(--sidebar-hover)_/_0.12))] text-sidebar-foreground transition hover:border-sidebar-active/40 hover:bg-[linear-gradient(180deg,hsl(var(--sidebar-active)_/_0.2),hsl(var(--sidebar-hover)_/_0.16))]"
            aria-label="Workspace profile"
          >
            <div className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-accent to-info shadow-[0_12px_28px_hsl(222_58%_5%_/_0.28)]">
              <span className="text-xs font-bold text-primary-foreground">JD</span>
            </div>
          </button>

          <div className="pointer-events-none absolute left-full bottom-0 z-50 ml-3 w-56 translate-x-2 rounded-[1.25rem] border border-sidebar-border bg-[linear-gradient(180deg,hsl(var(--sidebar-bg)_/_0.98),hsl(220_40%_13%_/_0.98))] p-4 opacity-0 shadow-[0_24px_64px_hsl(222_58%_5%_/_0.32)] transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-accent to-info">
                <span className="text-sm font-bold text-primary-foreground">JD</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-sidebar-foreground">John Doe</p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">admin</p>
                <p className="mt-2 text-xs leading-5 text-sidebar-muted">Backend-ready workspace</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
}
