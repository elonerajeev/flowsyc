import { useMemo, useState } from "react";
import { BadgeCheck, BarChart3, CheckCircle2, ClipboardList, FolderKanban, KeyRound, Lock, Settings, Shield, UserCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useTheme, type UserRole } from "@/contexts/ThemeContext";
import { canAccessItem, sidebarSections } from "@/components/layout/sidebarConfig";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { RADIUS, TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const SECTION_ITEMS_PAGE_SIZE = 8;

type PermissionStatus = {
  accessible: number;
  blocked: number;
  sections: number;
  quickCreate: boolean;
};

const roleOrder: UserRole[] = ["admin", "manager", "employee", "client"];

const roleMeta: Record<UserRole, { label: string; description: string; icon: string; color: string }> = {
  admin: {
    label: "Admin",
    description: "Full workspace control",
    icon: "◆",
    color: "border-accent/20 bg-accent/10 text-accent",
  },
  manager: {
    label: "Manager",
    description: "Operational and team oversight",
    icon: "◈",
    color: "border-info/20 bg-info/10 text-info",
  },
  employee: {
    label: "Employee",
    description: "Assigned work and shared modules",
    icon: "●",
    color: "border-border bg-secondary/30 text-muted-foreground",
  },
  client: {
    label: "Client",
    description: "Limited external visibility",
    icon: "◌",
    color: "border-success/20 bg-success/10 text-success",
  },
};

const sectionIcons: Record<string, LucideIcon> = {
  Overview: BarChart3,
  People: Users,
  Workspace: ClipboardList,
  Sales: UserCheck,
  Finance: Settings,
  HR: FolderKanban,
  Insights: BarChart3,
  System: Shield,
};

const accessCanUseQuickCreate = (role: UserRole) => role === "admin" || role === "manager";

function PermissionPill({ allowed }: { allowed: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        allowed ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
      )}
    >
      {allowed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
      {allowed ? "Allowed" : "Locked"}
    </span>
  );
}

export default function RolesPage() {
  const { role } = useTheme();
  const { canUseQuickCreate } = useWorkspace();
  const [expandedSections, setExpandedSections] = useState<Record<string, number>>({});

  const permissionStats = useMemo<PermissionStatus>(() => {
    const totalItems = sidebarSections.reduce((sum, section) => sum + section.items.length, 0);
    const accessible = sidebarSections.reduce((sum, section) => {
      return sum + section.items.filter((item) => canAccessItem(item.roles, role)).length;
    }, 0);

    return {
      accessible,
      blocked: totalItems - accessible,
      sections: sidebarSections.filter((section) => section.items.some((item) => canAccessItem(item.roles, role))).length,
      quickCreate: accessCanUseQuickCreate(role),
    };
  }, [role]);

  const sections = useMemo(() => {
    return sidebarSections.map((section) => {
      const allowedItems = section.items.filter((item) => canAccessItem(item.roles, role));
      return {
        ...section,
        allowedItems,
        blockedCount: section.items.length - allowedItems.length,
      };
    });
  }, [role]);

  const roleSummaries = useMemo(
    () =>
      roleOrder.map((candidate) => ({
        role: candidate,
        pages: sidebarSections.reduce((sum, section) => sum + section.items.filter((item) => canAccessItem(item.roles, candidate)).length, 0),
        quickCreate: accessCanUseQuickCreate(candidate),
        description: roleMeta[candidate].description,
      })),
    [],
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <section className={cn("rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card", RADIUS.xl)}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className={cn("inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/45 px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
              <Shield className="h-3.5 w-3.5 text-primary" />
              Access & Permissions
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Role access dashboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Simple view of what this role can open, what stays hidden, and which sections are available.
              </p>
            </div>
          </div>

          <div className={cn("inline-flex items-center gap-2 rounded-2xl border border-border/70 bg-secondary/25 px-4 py-3", TEXT.body)}>
            <span className="text-lg">{roleMeta[role].icon}</span>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Viewing as</p>
              <p className="font-semibold text-foreground">{roleMeta[role].label}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Accessible pages", value: permissionStats.accessible, color: "text-success bg-success/10", desc: "Routes open for this role" },
            { label: "Blocked pages", value: permissionStats.blocked, color: "text-destructive bg-destructive/10", desc: "Hidden or restricted" },
            { label: "Sections", value: permissionStats.sections, color: "text-primary bg-primary/10", desc: "Sidebar groups available" },
            { label: "Quick Create", value: permissionStats.quickCreate ? "On" : "Off", color: permissionStats.quickCreate ? "text-success bg-success/10" : "text-muted-foreground bg-secondary/30", desc: "Workspace action" },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.25rem] border border-border/70 bg-secondary/20 p-4 flex items-center gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0 font-display text-lg font-bold", item.color)}>
                {item.value}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Current role</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">{roleMeta[role].label}</h2>
              </div>
              <div className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]", roleMeta[role].color)}>
                {roleMeta[role].description}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <PermissionPill allowed />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                <BadgeCheck className="h-3.5 w-3.5" />
                Current view
              </span>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <p className={cn("text-muted-foreground", TEXT.eyebrow)}>How it works</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Open pages are shown in the sidebar and can be visited by this role.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Hidden pages stay in the app but are blocked for the current role.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
                <span>Quick create is a separate action that only admin and manager get.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">Role overview</p>
          </div>
          <div className="mt-4 space-y-3">
            {roleSummaries.map((candidate) => (
              <div
                key={candidate.role}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3",
                  candidate.role === role ? "border-primary/25 bg-primary/5" : "border-border/70 bg-secondary/20",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", roleMeta[candidate.role].color)}>
                    <span className="text-sm">{roleMeta[candidate.role].icon}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{roleMeta[candidate.role].label}</p>
                    <p className="text-xs text-muted-foreground">{candidate.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{candidate.pages} pages</p>
                  <p className="text-xs text-muted-foreground">{candidate.quickCreate ? "Quick create on" : "Quick create off"}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className={cn("text-muted-foreground", TEXT.eyebrow)}>What you can open</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Available sections</h2>
            </div>
            <div className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Based on your role
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            {sections.map((section) => {
              const SectionIcon = sectionIcons[section.label] ?? Shield;
              const allowedCount = section.allowedItems.length;

              return (
                <article key={section.key} className="rounded-[1.35rem] border border-border/70 bg-secondary/15 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <SectionIcon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{section.label}</p>
                        <p className="text-xs text-muted-foreground">{section.description}</p>
                      </div>
                    </div>
                    <span className="rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {allowedCount}/{section.items.length}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {section.allowedItems.slice(0, expandedSections[section.key] ?? SECTION_ITEMS_PAGE_SIZE).map((item) => {
                      const ItemIcon = item.icon;
                      return (
                        <div
                          key={item.to}
                          className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success/5 px-3 py-3"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-success/20 bg-success/10 text-success">
                            <ItemIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-foreground">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.to}</p>
                          </div>
                          <PermissionPill allowed />
                        </div>
                      );
                    })}
                    <ShowMoreButton
                      total={section.allowedItems.length}
                      visible={expandedSections[section.key] ?? SECTION_ITEMS_PAGE_SIZE}
                      pageSize={SECTION_ITEMS_PAGE_SIZE}
                      onShowMore={() => setExpandedSections(prev => ({ ...prev, [section.key]: Math.min((prev[section.key] ?? SECTION_ITEMS_PAGE_SIZE) + SECTION_ITEMS_PAGE_SIZE, section.allowedItems.length) }))}
                      onShowLess={() => setExpandedSections(prev => ({ ...prev, [section.key]: SECTION_ITEMS_PAGE_SIZE }))}
                    />
                    {section.blockedCount > 0 && (
                      <p className="px-1 text-xs text-muted-foreground">
                        {section.blockedCount} more item{section.blockedCount === 1 ? "" : "s"} in this section are hidden for this role.
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
