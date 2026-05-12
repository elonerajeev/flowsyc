import { Activity, AlertTriangle, GitBranch, Rocket, Server, Terminal } from "lucide-react";

export type DevOpsSectionKey = "health" | "servers" | "deployments" | "pipelines" | "logs" | "alerts";

export const devopsSections = [
  {
    key: "health" as DevOpsSectionKey,
    label: "Health",
    description: "Monitor uptime and response times",
    icon: Activity,
    items: [
      { to: "/devops/health", label: "Service Health", icon: Activity },
    ],
  },
  {
    key: "servers" as DevOpsSectionKey,
    label: "Servers",
    description: "CPU, memory and disk across nodes",
    icon: Server,
    items: [
      { to: "/devops/servers", label: "Servers", icon: Server },
    ],
  },
  {
    key: "deployments" as DevOpsSectionKey,
    label: "Deployments",
    description: "Latest releases across all services",
    icon: Rocket,
    items: [
      { to: "/devops/deployments", label: "Deployments", icon: Rocket },
    ],
  },
  {
    key: "pipelines" as DevOpsSectionKey,
    label: "Pipelines",
    description: "CI/CD workflow runs and status",
    icon: GitBranch,
    items: [
      { to: "/devops/pipelines", label: "CI/CD Pipelines", icon: GitBranch },
    ],
  },
  {
    key: "logs" as DevOpsSectionKey,
    label: "Logs",
    description: "Live log stream from all services",
    icon: Terminal,
    items: [
      { to: "/devops/logs", label: "Live Logs", icon: Terminal },
    ],
  },
  {
    key: "alerts" as DevOpsSectionKey,
    label: "Alerts",
    description: "Active incidents and notifications",
    icon: AlertTriangle,
    items: [
      { to: "/devops/alerts", label: "Alerts", icon: AlertTriangle },
    ],
  },
];

export function getDevOpsSectionForPath(pathname: string): DevOpsSectionKey {
  const seg = pathname.split("/")[2];
  return (devopsSections.find((s) => s.key === seg)?.key) ?? "health";
}
