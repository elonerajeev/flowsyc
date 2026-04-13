import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { crmService } from "@/services/crm";
import { crmKeys } from "./use-crm-data";

export function useComments(taskId?: number, projectId?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: crmKeys.comments(taskId, projectId),
    queryFn: () => crmService.listComments({ taskId, projectId }),
    enabled: Boolean(taskId || projectId),
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (data: { content: string; taskId?: number; projectId?: number }) =>
      crmService.createComment(data),
    onSuccess: (newComment) => {
      // Invalidate comments queries
      queryClient.invalidateQueries({ queryKey: crmKeys.comments() });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      crmService.updateComment(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.comments() });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => crmService.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.comments() });
    },
  });
}