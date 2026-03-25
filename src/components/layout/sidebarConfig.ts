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
  Shield,
  Settings,
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
  Receipt,
  UsersRound,
} from "lucide-react";

import type { UserRole } from "@/contexts/ThemeContext";

export type SidebarSectionKey = "overview" | "people" | "workspace" | "sales" | "finance" | "hr" | "insights" | "system";

export interface SidebarItem {
  to: string;
  icon: any;
  label: string;
  roles: UserRole[];
  badge?: string;
}

export interface SidebarSection {
  key: SidebarSectionKey;
  label: string;
  description: string;
  icon: any;
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
      { to: "/overview/messages", icon: MessageSquare, label: "Messages", roles: ["admin", "manager", "employee", "client"], badge: "3" },
    ],
  },
  {
    key: "people",
    label: "People",
    description: "Team, attendance, and access",
    icon: Users,
    items: [
      { to: "/people/team", icon: Users, label: "Team", roles: ["admin", "manager"] },
      { to: "/people/attendance", icon: UserRoundCheck, label: "Attendance", roles: ["admin", "manager"], badge: "New" },
      { to: "/people/roles", icon: Shield, label: "Roles & Access", roles: ["admin"] },
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
    label: "Sales",
    description: "Clients, leads, and deals",
    icon: BadgeDollarSign,
    items: [
      { to: "/sales/clients", icon: UserCheck, label: "Clients", roles: ["admin", "manager", "client"] },
      { to: "/sales/leads", icon: CirclePlus, label: "Leads", roles: ["admin", "manager", "employee"], badge: "New" },
      { to: "/sales/deals", icon: PieChart, label: "Deals", roles: ["admin", "manager", "employee"] },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    description: "Invoices, payments, and expenses",
    icon: Landmark,
    items: [
      { to: "/finance/invoices", icon: CreditCard, label: "Invoices", roles: ["admin", "manager", "client"] },
      { to: "/finance/payments", icon: Receipt, label: "Payments", roles: ["admin", "manager", "client"], badge: "New" },
      { to: "/finance/expenses", icon: FileText, label: "Expenses", roles: ["admin", "manager"] },
      { to: "/finance/reports", icon: FileText, label: "Reports", roles: ["admin"] },
    ],
  },
  {
    key: "hr",
    label: "HR",
    description: "Hiring and employee records",
    icon: UsersRound,
    items: [
      { to: "/hr/hiring", icon: Briefcase, label: "Hiring", roles: ["admin", "manager"] },
      { to: "/hr/candidates", icon: CirclePlus, label: "Candidates", roles: ["admin", "manager"], badge: "New" },
      { to: "/hr/employees", icon: UsersRound, label: "Employees", roles: ["admin", "manager"] },
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
    key: "system",
    label: "System",
    description: "Settings, integrations, and billing",
    icon: Settings2,
    items: [
      { to: "/system/settings", icon: Settings, label: "Settings", roles: ["admin", "manager", "employee", "client"] },
      { to: "/system/integrations", icon: PlugZap, label: "Integrations", roles: ["admin", "manager"], badge: "New" },
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
  if (pathname === "/overview" || pathname.startsWith("/overview/")) {
    return "overview";
  }
  if (pathname.startsWith("/people/")) {
    return "people";
  }
  if (pathname.startsWith("/workspace/")) {
    return "workspace";
  }
  if (pathname.startsWith("/sales/")) {
    return "sales";
  }
  if (pathname.startsWith("/finance/")) {
    return "finance";
  }
  if (pathname.startsWith("/hr/")) {
    return "hr";
  }
  if (pathname.startsWith("/insights/")) {
    return "insights";
  }
  if (pathname.startsWith("/system/")) {
    return "system";
  }
  return "overview";
}

export function getSectionMeta(key: SidebarSectionKey) {
  return sidebarSections.find((section) => section.key === key) ?? sidebarSections[0];
}
