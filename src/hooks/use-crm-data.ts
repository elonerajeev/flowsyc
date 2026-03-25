import { useQuery } from "@tanstack/react-query";

import { crmService } from "@/services/crm";

export const crmKeys = {
  dashboard: ["crm", "dashboard"] as const,
  clients: ["crm", "clients"] as const,
  projects: ["crm", "projects"] as const,
  tasks: ["crm", "tasks"] as const,
  conversations: ["crm", "conversations"] as const,
  messages: ["crm", "messages"] as const,
  invoices: ["crm", "invoices"] as const,
  reports: ["crm", "reports"] as const,
  teamMembers: ["crm", "team-members"] as const,
  attendance: ["crm", "attendance"] as const,
  commands: ["crm", "commands"] as const,
  themePreviews: ["crm", "theme-previews"] as const,
};

export function useDashboardData() {
  return useQuery({
    queryKey: crmKeys.dashboard,
    queryFn: crmService.getDashboard,
    staleTime: 1000 * 60 * 5,
  });
}

export function useClients() {
  return useQuery({
    queryKey: crmKeys.clients,
    queryFn: crmService.getClients,
    staleTime: 1000 * 60 * 5,
  });
}

export function useProjects() {
  return useQuery({
    queryKey: crmKeys.projects,
    queryFn: crmService.getProjects,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTasks() {
  return useQuery({
    queryKey: crmKeys.tasks,
    queryFn: crmService.getTasks,
    staleTime: 1000 * 60 * 5,
  });
}

export function useConversations() {
  return useQuery({
    queryKey: crmKeys.conversations,
    queryFn: crmService.getConversations,
    staleTime: 1000 * 60 * 3,
  });
}

export function useMessages() {
  return useQuery({
    queryKey: crmKeys.messages,
    queryFn: crmService.getMessages,
    staleTime: 1000 * 60 * 3,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: crmKeys.invoices,
    queryFn: crmService.getInvoices,
    staleTime: 1000 * 60 * 5,
  });
}

export function useReports() {
  return useQuery({
    queryKey: crmKeys.reports,
    queryFn: crmService.getReports,
    staleTime: 1000 * 60 * 5,
  });
}

export function useTeamMembers() {
  return useQuery({
    queryKey: crmKeys.teamMembers,
    queryFn: crmService.getTeamMembers,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAttendance() {
  return useQuery({
    queryKey: crmKeys.attendance,
    queryFn: crmService.getAttendance,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCommandActions() {
  return useQuery({
    queryKey: crmKeys.commands,
    queryFn: crmService.getCommandActions,
    staleTime: 1000 * 60 * 10,
  });
}

export function useThemePreviews() {
  return useQuery({
    queryKey: crmKeys.themePreviews,
    queryFn: crmService.getThemePreviews,
    staleTime: 1000 * 60 * 10,
  });
}
