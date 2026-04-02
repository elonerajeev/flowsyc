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
  auditLogs: ["crm", "audit-logs"] as const,
  notes: ["crm", "notes"] as const,
  jobPostings: ["crm", "job-postings"] as const,
  candidates: ["crm", "candidates"] as const,
};

export function useDashboardData() {
  return useQuery({
    queryKey: crmKeys.dashboard,
    queryFn: crmService.getDashboard,
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
    refetchIntervalInBackground: false,
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

export function useTasks(projectId?: number) {
  return useQuery({
    queryKey: [...crmKeys.tasks, projectId ?? "all"],
    queryFn: () => crmService.getTasks(projectId),
    staleTime: 1000 * 60 * 5,
  });
}

export function useAuditLogs(limit = 100) {
  return useQuery({
    queryKey: [...crmKeys.auditLogs, limit],
    queryFn: () => crmService.getAuditLogs(limit),
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
    refetchIntervalInBackground: false,
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

export function useNotes() {
  return useQuery({
    queryKey: crmKeys.notes,
    queryFn: crmService.getNotes,
    staleTime: 1000 * 60 * 5,
  });
}

export function useJobPostings() {
  return useQuery({
    queryKey: crmKeys.jobPostings,
    queryFn: crmService.getJobPostings,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCandidates() {
  return useQuery({
    queryKey: crmKeys.candidates,
    queryFn: crmService.getCandidates,
    staleTime: 1000 * 60 * 5,
  });
}

// Enhanced CRM Hooks
export function useLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: crmService.getLeads,
    staleTime: 1000 * 60 * 2,
  });
}

export function useDeals() {
  return useQuery({
    queryKey: ["deals"],
    queryFn: crmService.getDeals,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: crmService.getCompanies,
    staleTime: 1000 * 60 * 5,
  });
}

export function usePipeline() {
  return useQuery({
    queryKey: ["pipeline"],
    queryFn: crmService.getPipeline,
    staleTime: 1000 * 60 * 10,
  });
}

export function useSalesMetrics() {
  return useQuery({
    queryKey: ["sales-metrics"],
    queryFn: crmService.getSalesMetrics,
    staleTime: 1000 * 60 * 5,
  });
}
