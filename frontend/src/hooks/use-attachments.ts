import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { crmService } from "@/services/crm";
import { crmKeys } from "./use-crm-data";

type UseAttachmentsOptions = {
  pageSize?: number;
};

export function useAttachments(taskId?: number, projectId?: number, options: UseAttachmentsOptions = {}) {
  const pageSize = options.pageSize ?? 20;

  return useInfiniteQuery({
    queryKey: [...crmKeys.attachments(taskId, projectId), pageSize],
    queryFn: ({ pageParam }) =>
      crmService.listAttachments({ taskId, projectId, limit: pageSize, offset: Number(pageParam) }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.data.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    },
    enabled: Boolean(taskId || projectId),
  });
}

export function useCreateAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { filename: string; originalName: string; url: string; size: number; mimetype: string; taskId?: number; projectId?: number }) =>
      crmService.createAttachment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "attachments"] });
    },
  });
}

export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => crmService.deleteAttachment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm", "attachments"] });
    },
  });
}
