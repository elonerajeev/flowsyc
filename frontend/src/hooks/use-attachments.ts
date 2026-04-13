import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { crmService } from "@/services/crm";
import { crmKeys } from "./use-crm-data";

export function useAttachments(taskId?: number, projectId?: number) {
  return useQuery({
    queryKey: crmKeys.attachments(taskId, projectId),
    queryFn: () => crmService.listAttachments({ taskId, projectId }),
    enabled: Boolean(taskId || projectId),
  });
}

export function useCreateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { filename: string; originalName: string; url: string; size: number; mimetype: string; taskId?: number; projectId?: number }) =>
      crmService.createAttachment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.attachments() });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => crmService.deleteAttachment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.attachments() });
    },
  });
}