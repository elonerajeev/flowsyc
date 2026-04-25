import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crmService } from "@/services/crm";
import { crmKeys } from "./use-crm-data";

type UseCommentsOptions = {
  pageSize?: number;
};

export function useComments(taskId?: number, projectId?: number, options: UseCommentsOptions = {}) {
  const pageSize = options.pageSize ?? 20;

  return useInfiniteQuery({
    queryKey: [...crmKeys.comments(taskId, projectId), pageSize],
    queryFn: ({ pageParam }) =>
      crmService.listComments({ taskId, projectId, limit: pageSize, offset: Number(pageParam) }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.data.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: Boolean(taskId || projectId),
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { content: string; taskId?: number; projectId?: number }) =>
      crmService.createComment(data),
    onSuccess: () => {
      // Invalidate all comments queries regardless of task/project scope.
      queryClient.invalidateQueries({ queryKey: ["crm", "comments"] });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      crmService.updateComment(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "comments"] });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => crmService.deleteComment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "comments"] });
    },
  });
}
