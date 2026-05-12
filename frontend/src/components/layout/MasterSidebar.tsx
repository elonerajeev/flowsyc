import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";

import { cn } from "@/lib/utils";
import { canAccessItem, sidebarSections, type SidebarSectionKey } from "./sidebarConfig";
import { canAccessDevOpsItem, devopsSections, type DevOpsSectionKey } from "./devopsConfig";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { requestJson } from "@/lib/api-client";
import type { DevOpsAlert } from "@/services/devops-alerts";
import type { Deployment } from "@/services/deployments";
import type { MonitoredService } from "@/services/monitoring";
import type { PipelineRun } from "@/services/pipelines";
import type { MonitoredServer } from "@/services/servers";
import WorkspaceSwitcher from "./WorkspaceSwitcher";

interface MasterSidebarProps {
  activeSection: SidebarSectionKey;
  onSectionChange: (section: SidebarSectionKey) => void;
}

type BadgeTone = "critical" | "warning" | "neutral";

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  critical: "border-red-500/40 bg-red-500 text-white",
  warning: "border-amber-500/40 bg-amber-500 text-black",
  neutral: "border-sidebar-border bg-sidebar-hover text-sidebar-foreground",
};

function formatBadgeCount(value: number) {
  if (value > 99) return "99+";
  return String(value);
}

export default function MasterSidebar({ activeSection, onSectionChange }: MasterSidebarProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { role } = useTheme();
  const { user } = useAuth();
  const effectiveRole = user?.role ?? role;
  const isDevOps = pathname.startsWith("/devops");
  const canManageDevOps = effectiveRole === "admin" || effectiveRole === "manager";

  const { data: pipelines = [] } = useQuery({
    queryKey: ["devops-sidebar", "pipelines"],
    queryFn: () => requestJson<{ data: PipelineRun[] }>("/pipelines?limit=30").then((res) => res.data),
    enabled: isDevOps,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: deployments = [] } = useQuery({
    queryKey: ["devops-sidebar", "deployments"],
    queryFn: () => requestJson<{ data: Deployment[] }>("/deployments?limit=30").then((res) => res.data),
    enabled: isDevOps,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: servers = [] } = useQuery({
    queryKey: ["devops-sidebar", "servers"],
    queryFn: () => requestJson<{ data: MonitoredServer[] }>("/servers").then((res) => res.data),
    enabled: isDevOps,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const { data: healthServices = [] } = useQuery({
    queryKey: ["devops-sidebar", "health"],
    queryFn: () => requestJson<{ data: MonitoredService[] }>("/monitoring/services").then((res) => res.data),
    enabled: isDevOps && canManageDevOps,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ["devops-sidebar", "alerts"],
    queryFn: () => requestJson<{ data: DevOpsAlert[] }>("/devops/alerts").then((res) => res.data),
    enabled: isDevOps && canManageDevOps,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const sectionBadges: Partial<Record<DevOpsSectionKey, { text: string; tone: BadgeTone }>> = {};

  const failedPipelines = pipelines.filter((run) => run.status === "failed").length;
  const activePipelines = pipelines.filter((run) => run.status === "running" || run.status === "queued").length;
  if (failedPipelines > 0) {
    sectionBadges.pipelines = { text: formatBadgeCount(failedPipelines), tone: "critical" };
  } else if (activePipelines > 0) {
    sectionBadges.pipelines = { text: formatBadgeCount(activePipelines), tone: "warning" };
  }

  const failedDeployments = deployments.filter((row) => row.status === "failed").length;
  const runningDeployments = deployments.filter((row) => row.status === "running").length;
  if (failedDeployments > 0) {
    sectionBadges.deployments = { text: formatBadgeCount(failedDeployments), tone: "critical" };
  } else if (runningDeployments > 0) {
    sectionBadges.deployments = { text: formatBadgeCount(runningDeployments), tone: "warning" };
  }

  if (servers.length > 0) {
    sectionBadges.servers = { text: formatBadgeCount(servers.length), tone: "neutral" };
  }

  const activeAlerts = alerts.filter((alert) => !alert.resolved).length;
  const criticalAlerts = alerts.filter((alert) => !alert.resolved && alert.severity === "critical").length;
  if (criticalAlerts > 0) {
    sectionBadges.alerts = { text: formatBadgeCount(criticalAlerts), tone: "critical" };
  } else if (activeAlerts > 0) {
    sectionBadges.alerts = { text: formatBadgeCount(activeAlerts), tone: "warning" };
  }

  const downServices = healthServices.filter((service) => service.latestCheck?.status === "down").length;
  const degradedServices = healthServices.filter((service) => service.latestCheck?.status === "degraded").length;
  if (downServices > 0) {
    sectionBadges.health = { text: formatBadgeCount(downServices), tone: "critical" };
  } else if (degradedServices > 0) {
    sectionBadges.health = { text: formatBadgeCount(degradedServices), tone: "warning" };
  }

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
                const isLocked = !canAccessDevOpsItem(section.items[0].roles, effectiveRole);
                const badge = sectionBadges[section.key];
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
                      navigate(section.items[0].to);
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
                      {!isLocked && badge && (
                        <span className={cn(
                          "absolute -right-2 -top-2 min-w-[1.1rem] rounded-full border px-1 py-0.5 text-[9px] font-semibold leading-none",
                          BADGE_TONE_CLASS[badge.tone],
                        )}>
                          {badge.text}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            : sidebarSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.key;
                const allowedItems = section.items.filter((item) => canAccessItem(item.roles, effectiveRole));
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
