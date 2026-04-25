import {
  BarChart3,
  Briefcase,
  Calendar,
  ClipboardList,
  FileText,
  FolderKanban,
  Home,
  BookText,
  BadgeDollarSign,
  CirclePlus,
  CreditCard,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  MessageSquare,
  UserRoundCheck,
  Activity,
  Inbox,
  PieChart,
  Landmark,
  Settings2,
  PlugZap,
  ReceiptText,
  UsersRound,
  Shield,
  Zap,
  Bell,
  Clock,
  Target,
  Workflow,
  Building2,
  ArrowRightLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { UserRole } from "@/contexts/ThemeContext";

export type SidebarSectionKey = "overview" | "people" | "workspace" | "sales" | "finance" | "hr" | "insights" | "automation" | "system";

export interface SidebarItem {
  to: string;
  icon: LucideIcon;
  label: string;
  roles: UserRole[];
  badge?: string;
}

export interface SidebarSection {
  key: SidebarSectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
  items: SidebarItem[];
}

export const sidebarSections: SidebarSection[] = [
  {
    key: "overview",
    label: "Overview",
    description: "Dashboard and activity",
    icon: Home,
    items: [
      { to: "/overview", icon: Home, label: "Dashboard", roles: ["admin", "manager", "employee", "client"] },
      { to: "/overview/activity", icon: Inbox, label: "Activity", roles: ["admin", "manager", "employee", "client"], badge: "New" },
      { to: "/overview/messages", icon: MessageSquare, label: "Messages", roles: ["admin", "manager"], badge: "3" },
      { to: "/overview/inbox", icon: Inbox, label: "Email Inbox", roles: ["admin", "manager", "employee"] },
    ],
  },
  {
    key: "people",
    label: "People",
    description: "Teams, members, attendance",
    icon: Users,
    items: [
      { to: "/people/teams", icon: Users, label: "Team", roles: ["admin", "manager"] },
      { to: "/people/members", icon: UsersRound, label: "Members", roles: ["admin", "manager"] },
      { to: "/people/attendance", icon: UserRoundCheck, label: "Attendance", roles: ["admin", "manager"], badge: "New" },
    ],
  },
  {
    key: "workspace",
    label: "Workspace",
    description: "Tasks, projects, and notes",
    icon: ClipboardList,
    items: [
      { to: "/workspace/tasks", icon: ClipboardList, label: "Tasks", roles: ["admin", "manager", "employee"] },
      { to: "/workspace/projects", icon: FolderKanban, label: "Projects", roles: ["admin", "manager", "employee"] },
      { to: "/workspace/calendar", icon: Calendar, label: "Calendar", roles: ["admin", "manager", "employee"] },
      { to: "/workspace/notes", icon: BookText, label: "Notes", roles: ["admin", "manager", "employee", "client"], badge: "New" },
    ],
  },
  {
    key: "sales",
    label: "Sales & Marketing",
    description: "Clients, leads, pipeline, and deals",
    icon: Target,
    items: [
      { to: "/automation/gtm", icon: Activity, label: "GTM Dashboard", roles: ["admin", "manager", "employee"] },
      { to: "/automation/flow", icon: ArrowRightLeft, label: "How It Works", roles: ["admin", "manager", "employee"] },
      { to: "/sales/leads", icon: CirclePlus, label: "Leads", roles: ["admin", "manager", "employee"] },
      { to: "/sales/pipelines", icon: PieChart, label: "Pipeline", roles: ["admin", "manager", "employee"] },
      { to: "/sales/clients", icon: UserCheck, label: "Clients", roles: ["admin", "manager", "employee"] },
      { to: "/sales/contacts", icon: Users, label: "Contacts", roles: ["admin", "manager", "employee"] },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    description: "Invoices, payments, and expenses",
    icon: Landmark,
    items: [
      { to: "/finance", icon: CreditCard, label: "Finance", roles: ["admin", "manager", "client"] },
      { to: "/finance/reports", icon: FileText, label: "Reports", roles: ["admin"] },
    ],
  },
  {
    key: "hr",
    label: "HR",
    description: "Hiring, employee records, and payroll",
    icon: UsersRound,
    items: [
      { to: "/hr/hiring", icon: Briefcase, label: "Hiring", roles: ["admin", "manager"] },
      { to: "/hr/candidates", icon: CirclePlus, label: "Candidates", roles: ["admin", "manager"], badge: "New" },
      { to: "/hr/employees", icon: UsersRound, label: "Employees", roles: ["admin", "manager"] },
      { to: "/hr/payroll", icon: ReceiptText, label: "Payroll", roles: ["admin", "manager", "employee"] },
    ],
  },
  {
    key: "insights",
    label: "Insights",
    description: "Analytics and performance",
    icon: Activity,
    items: [
      { to: "/insights/analytics", icon: BarChart3, label: "Analytics", roles: ["admin", "manager"], badge: "New" },
    ],
  },
  {
    key: "automation",
    label: "Automation",
    description: "Workflows, alerts, and triggers",
    icon: Zap,
    items: [
      { to: "/automation/rules", icon: Zap, label: "Rules", roles: ["admin", "manager"] },
      { to: "/automation/alerts", icon: Bell, label: "Alerts", roles: ["admin", "manager"] },
      { to: "/automation/scheduled", icon: Clock, label: "Scheduled", roles: ["admin", "manager"] },
      { to: "/automation/logs", icon: Activity, label: "Activity Logs", roles: ["admin", "manager"] },
    ],
  },
  {
    key: "system",
    label: "System",
    description: "Settings, access, integrations, and billing",
    icon: Settings2,
    items: [
      { to: "/system/settings", icon: Settings, label: "Settings", roles: ["admin", "manager", "employee", "client"] },
      { to: "/system/access", icon: ShieldCheck, label: "Access & Permissions", roles: ["admin", "manager", "employee"] },
      { to: "/system/integrations", icon: PlugZap, label: "Integrations", roles: ["admin", "manager"], badge: "New" },
      { to: "/system/audit", icon: Shield, label: "Audit Logs", roles: ["admin", "manager", "employee"] },
      { to: "/system/billing", icon: CreditCard, label: "Billing", roles: ["admin", "manager", "client"] },
    ],
  },
];

export const sectionOrder = sidebarSections.map((section) => section.key);

export function canAccessItem(roles: UserRole[], role: UserRole) {
  return roles.includes(role);
}

export function getVisibleSections(role: UserRole) {
  return sidebarSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessItem(item.roles, role)),
    }))
    .filter((section) => section.items.length > 0);
}

export function getAccessiblePathForRole(role: UserRole) {
  const firstAccessible = sidebarSections
    .flatMap((section) => section.items)
    .find((item) => canAccessItem(item.roles, role));

  return firstAccessible?.to ?? "/overview";
}

export function getAllowedRolesForPath(pathname: string) {
  const normalized = pathname.replace(/\/+$/, "") || "/";

  for (const section of sidebarSections) {
    for (const item of section.items) {
      if (normalized === item.to || normalized.startsWith(`${item.to}/`)) {
        return item.roles;
      }
    }
  }

  return null;
}

export function getSectionForPath(pathname: string): SidebarSectionKey {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  for (const section of sidebarSections) {
    for (const item of section.items) {
      if (normalized === item.to || normalized.startsWith(`${item.to}/`)) {
        return section.key;
      }
    }
  }
  return "overview";
}

export function getSectionMeta(key: SidebarSectionKey) {
  return sidebarSections.find((section) => section.key === key) ?? sidebarSections[0];
}

export function getFirstAccessiblePathForSection(key: SidebarSectionKey, role: UserRole) {
  const section = getVisibleSections(role).find((item) => item.key === key);
  return section?.items[0]?.to ?? getAccessiblePathForRole(role);
}
