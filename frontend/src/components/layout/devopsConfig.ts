import { Activity, AlertTriangle, GitBranch, Rocket, Server, Terminal } from "lucide-react";

export type DevOpsSectionKey = "health" | "servers" | "deployments" | "pipelines" | "logs" | "alerts";

export const devopsSections = [
  {
    key: "health" as DevOpsSectionKey,
    label: "Health",
    icon: Activity,
    items: [{ to: "/devops/health", label: "Service Health" }],
  },
  {
    key: "servers" as DevOpsSectionKey,
    label: "Servers",
    icon: Server,
    items: [{ to: "/devops/servers", label: "Servers" }],
  },
  {
    key: "deployments" as DevOpsSectionKey,
    label: "Deployments",
    icon: Rocket,
    items: [{ to: "/devops/deployments", label: "Deployments" }],
  },
  {
    key: "pipelines" as DevOpsSectionKey,
    label: "Pipelines",
    icon: GitBranch,
    items: [{ to: "/devops/pipelines", label: "CI/CD Pipelines" }],
  },
  {
    key: "logs" as DevOpsSectionKey,
    label: "Logs",
    icon: Terminal,
    items: [{ to: "/devops/logs", label: "Live Logs" }],
  },
  {
    key: "alerts" as DevOpsSectionKey,
    label: "Alerts",
    icon: AlertTriangle,
    items: [{ to: "/devops/alerts", label: "Alerts" }],
  },
];

export function getDevOpsSectionForPath(pathname: string): DevOpsSectionKey {
  const seg = pathname.split("/")[2];
  return (devopsSections.find((s) => s.key === seg)?.key) ?? "health";
}
