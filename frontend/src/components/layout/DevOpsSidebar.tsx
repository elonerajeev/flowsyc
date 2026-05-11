import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { RADIUS, TEXT } from "@/lib/design-tokens";
import { devopsSections, type DevOpsSectionKey } from "./devopsConfig";

interface DevOpsSidebarProps {
  activeSection: DevOpsSectionKey;
  width: number;
}

export default function DevOpsSidebar({ activeSection, width }: DevOpsSidebarProps) {
  const section = devopsSections.find((s) => s.key === activeSection) ?? devopsSections[0];
  const compact = width < 180;

  return (
    <aside
      className="fixed left-[72px] top-0 z-30 flex h-screen flex-col border-r border-sidebar-border bg-sidebar"
      style={{ width }}
    >
      {/* Header */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        {!compact && (
          <div>
            <p className="text-sm font-bold text-sidebar-foreground">{section.label}</p>
            <p className={cn("text-sidebar-muted", TEXT.meta)}>DevOps Hub</p>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {section.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2.5 px-3 py-2 transition",
                RADIUS.lg,
                TEXT.body,
                isActive
                  ? "bg-sidebar-active/14 font-semibold text-sidebar-active"
                  : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-foreground",
              )
            }
          >
            {!compact && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
