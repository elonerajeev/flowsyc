import { useNavigate, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { canAccessItem, sidebarSections, type SidebarSectionKey } from "./sidebarConfig";
import { devopsSections, type DevOpsSectionKey } from "./devopsConfig";
import { useTheme } from "@/contexts/ThemeContext";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

interface MasterSidebarProps {
  activeSection: SidebarSectionKey;
  onSectionChange: (section: SidebarSectionKey) => void;
}

export default function MasterSidebar({ activeSection, onSectionChange }: MasterSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { role } = useTheme();
  const isDevOps = pathname.startsWith("/devops");

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[72px] flex-col border-r border-sidebar-border bg-sidebar shadow-[4px_0_16px_hsl(var(--sidebar-border)/0.5)]">
      <div className="relative flex h-16 items-center justify-center border-b border-sidebar-border">
        <img src="/logo.png" alt="Flowsyc" className="h-10 w-10 rounded-lg shadow-lg shadow-black/20" />
      </div>

      <div className="flex-1 px-2 py-4">
        <div className="space-y-2">
          {isDevOps
            ? devopsSections.map((section) => {
                const Icon = section.icon;
                const isActive = pathname.startsWith(section.items[0].to);
                return (
                  <button
                    key={section.key}
                    type="button"
                    title={section.label}
                    onClick={() => navigate(section.items[0].to)}
                    className={cn(
                      "group flex h-12 w-full items-center justify-center rounded-2xl border transition",
                      isActive
                        ? "border-sidebar-active/40 bg-sidebar-active/16 text-sidebar-active shadow-[0_10px_24px_hsl(222_58%_5%_/_0.18)]"
                        : "border-transparent text-sidebar-fg hover:border-sidebar-border hover:bg-sidebar-hover hover:text-sidebar-foreground",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })
            : sidebarSections.map((section) => {
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

      <WorkspaceSwitcher />
    </aside>
  );
}
