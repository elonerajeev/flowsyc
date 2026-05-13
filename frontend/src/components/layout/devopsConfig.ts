import { Activity, AlertTriangle, GitBranch, Rocket, Server, Terminal } from "lucide-react";
import type { UserRole } from "@/contexts/ThemeContext";

export type DevOpsSectionKey = "health" | "servers" | "deployments" | "pipelines" | "logs" | "alerts";

export interface DevOpsItem {
  to: string;
  label: string;
  icon: typeof Activity;
  roles: UserRole[];
}

export interface DevOpsSection {
  key: DevOpsSectionKey;
  label: string;
  description: string;
  icon: typeof Activity;
  items: DevOpsItem[];
}

export const devopsSections: DevOpsSection[] = [
  {
    key: "health" as DevOpsSectionKey,
    label: "Health",
    description: "Monitor uptime and response times",
    icon: Activity,
    items: [
      { to: "/devops/health", label: "Service Health", icon: Activity, roles: ["admin", "manager"] },
    ],
  },
  {
    key: "servers" as DevOpsSectionKey,
    label: "Servers",
    description: "CPU, memory and disk across nodes",
    icon: Server,
    items: [
      { to: "/devops/servers", label: "Servers", icon: Server, roles: ["admin", "manager"] },
    ],
  },
  {
    key: "deployments" as DevOpsSectionKey,
    label: "Deployments",
    description: "Latest releases across all services",
    icon: Rocket,
    items: [
      { to: "/devops/deployments", label: "Deployments", icon: Rocket, roles: ["admin", "manager", "employee"] },
    ],
  },
  {
    key: "pipelines" as DevOpsSectionKey,
    label: "Pipelines",
    description: "CI/CD workflow runs and status",
    icon: GitBranch,
    items: [
      { to: "/devops/pipelines", label: "CI/CD Pipelines", icon: GitBranch, roles: ["admin", "manager", "employee"] },
    ],
  },
  {
    key: "logs" as DevOpsSectionKey,
    label: "Logs",
    description: "Configured app logs and ingest health",
    icon: Terminal,
    items: [
      { to: "/devops/logs", label: "Service Logs", icon: Terminal, roles: ["admin", "manager"] },
    ],
  },
  {
    key: "alerts" as DevOpsSectionKey,
    label: "Alerts",
    description: "Active incidents and notifications",
    icon: AlertTriangle,
    items: [
      { to: "/devops/alerts", label: "Alerts", icon: AlertTriangle, roles: ["admin", "manager"] },
    ],
  },
];

export function getDevOpsSectionForPath(pathname: string): DevOpsSectionKey {
  const seg = pathname.split("/")[2];
  return (devopsSections.find((s) => s.key === seg)?.key) ?? "health";
}

export function canAccessDevOpsItem(roles: UserRole[], role: UserRole) {
  return roles.includes(role);
}

export function getAllowedDevOpsRolesForPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  for (const section of devopsSections) {
    for (const item of section.items) {
      if (normalized === item.to || normalized.startsWith(`${item.to}/`)) {
        return item.roles;
      }
    }
  }
  return null;
}
