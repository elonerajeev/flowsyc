import { useEffect, useMemo, useState, useCallback, memo, useRef } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  ChevronLeft, ChevronRight, Flag, Pin, Plus, Search, Edit2, Trash2, 
  RefreshCw, MessageSquare, CheckCircle2, Clock, ListTodo, GripVertical,
  Calendar, Tag, Loader2, Filter, X, SlidersHorizontal, LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import TaskDetailModal from "@/components/crm/TaskDetailModal";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { crmKeys, useProjects } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import type { TaskBoardStats, TaskColumn, TaskPageResponse, TaskPriority, TaskRecord } from "@/types/crm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";
import { useRefresh } from "@/hooks/use-refresh";
import { getRefreshMessage, getRefreshSuccessMessage } from "@/lib/refresh-messages";

const priorityConfig = {
  high:   { color: "text-destructive bg-destructive/10 border-destructive/30", dot: "bg-destructive", label: "High" },
  medium: { color: "text-warning bg-warning/10 border-warning/30",         dot: "bg-warning", label: "Medium" },
  low:    { color: "text-success bg-success/10 border-success/30",         dot: "bg-success", label: "Low" },
} as const;

const columnMeta: Record<TaskColumn, { label: string; tone: string; dot: string; headerBg: string; icon: typeof Clock }> = {
  todo:          { label: "To Do",       tone: "border-warning/30",  dot: "bg-warning",  headerBg: "bg-warning/10", icon: Clock },
  "in-progress": { label: "In Progress", tone: "border-info/30",     dot: "bg-info",     headerBg: "bg-info/10", icon: ListTodo },
  done:          { label: "Completed",   tone: "border-success/30",  dot: "bg-success",  headerBg: "bg-success/10", icon: CheckCircle2 },
};

const orderedColumns: TaskColumn[] = ["todo", "in-progress", "done"];
const TASK_PAGE_SIZE = 30;

function readPinned(key: string): string[] {
  return readStoredJSON<string[]>(key, []);
}

function normalizeTaskColumn(column: string | undefined | null): TaskColumn {
  if (column === "done") return "done";
  if (column === "in-progress" || column === "in_progress") return "in-progress";
  return "todo";
}

function normalizeTask(task: TaskRecord): TaskRecord {
  return {
    ...task,
    column: normalizeTaskColumn(task.column),
  };
}

function normalizeBoard(source: Record<string, TaskRecord[]>): Record<TaskColumn, TaskRecord[]> {
  const todo = Array.isArray(source.todo) ? source.todo.map(normalizeTask) : [];
  const inProgressSource = Array.isArray(source["in-progress"])
    ? source["in-progress"]
    : Array.isArray(source.in_progress)
      ? source.in_progress
      : [];
  const done = Array.isArray(source.done) ? source.done.map(normalizeTask) : [];

  return {
    todo,
    "in-progress": inProgressSource.map(normalizeTask),
    done,
  };
}

function flattenTaskPages(pages: TaskPageResponse[] | undefined): TaskRecord[] {
  if (!pages || pages.length === 0) return [];
  const seen = new Set<number>();
  const merged: TaskRecord[] = [];
  for (const page of pages) {
    for (const task of page.data ?? []) {
      if (seen.has(task.id)) continue;
      seen.add(task.id);
      merged.push(normalizeTask(task));
    }
  }
  return merged;
}

function moveTaskInBoard(
  sourceBoard: Record<TaskColumn, TaskRecord[]>,
  taskId: number,
  destination: TaskColumn,
): Record<TaskColumn, TaskRecord[]> {
  const normalizedDestination = normalizeTaskColumn(destination);
  const sourceColumn = orderedColumns.find((column) =>
    sourceBoard[column].some((task) => task.id === taskId),
  );
  if (!sourceColumn || sourceColumn === normalizedDestination) {
    return sourceBoard;
  }

  const task = sourceBoard[sourceColumn].find((entry) => entry.id === taskId);
  if (!task) {
    return sourceBoard;
  }

  return {
    ...sourceBoard,
    [sourceColumn]: sourceBoard[sourceColumn].filter((entry) => entry.id !== taskId),
    [normalizedDestination]: [{ ...task, column: normalizedDestination }, ...sourceBoard[normalizedDestination]],
  };
}

function upsertTaskInBoard(
  sourceBoard: Record<TaskColumn, TaskRecord[]>,
  task: TaskRecord,
): Record<TaskColumn, TaskRecord[]> {
  const normalizedTask = normalizeTask(task);
  const destination = normalizeTaskColumn(normalizedTask.column);
  const nextBoard = orderedColumns.reduce<Record<TaskColumn, TaskRecord[]>>(
    (acc, column) => {
      acc[column] = sourceBoard[column].filter((entry) => entry.id !== normalizedTask.id);
      return acc;
    },
    { todo: [], "in-progress": [], done: [] },
  );

  return {
    ...nextBoard,
    [destination]: [normalizedTask, ...nextBoard[destination]],
  };
}

interface TaskCardProps {
  task: TaskRecord;
  column: TaskColumn;
  projectName?: string;
  pinned: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isMoving?: boolean;
  onMove: (taskId: number, direction: "left" | "right") => void;
  onPin: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onClick: (task: TaskRecord) => void;
  onEdit: (task: TaskRecord) => void;
}

const TaskCard = memo(function TaskCard({
  task,
  column,
  projectName,
  pinned,
  canEdit,
  canDelete,
  isMoving = false,
  onMove,
  onPin,
  onDelete,
  onClick,
  onEdit,
}: TaskCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const priority = priorityConfig[task.priority as keyof typeof priorityConfig] ?? priorityConfig.medium;
  const dueDateValue = task.dueDate?.trim();
  const isOverdue = Boolean(dueDateValue) && new Date(dueDateValue) < new Date() && column !== "done";
  const assigneeLabel = task.assignee?.split("@")[0] || "Unassigned";
  const avatarLabel = task.avatar?.trim() || assigneeLabel.slice(0, 2).toUpperCase();

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -2 }}
      drag
      dragSnapToOrigin
      dragElastic={0.05}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={(_event, info) => {
        setIsDragging(false);
        if (Math.abs(info.offset.x) < 120) return;
        onMove(task.id, info.offset.x > 0 ? "right" : "left");
      }}
      onClick={() => onClick(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(task);
        }
      }}
      role="button"
      tabIndex={0}
      className={cn(
        "group relative cursor-grab rounded-2xl border border-border/70 bg-card/95 p-4 text-left active:cursor-grabbing",
        "shadow-sm transition-all hover:border-primary/40 hover:shadow-lg",
        pinned && "ring-2 ring-primary/20 border-primary/30 bg-primary/5",
        isDragging && "opacity-60 scale-105 rotate-1 shadow-2xl z-50",
        isMoving && "opacity-50 pointer-events-none"
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span>{task.valueStream}</span>
            <span>•</span>
            <span>#{task.id}</span>
          </div>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-5 text-foreground">{task.title}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary" className={cn("shrink-0 text-[10px] font-semibold uppercase", priority.color)}>
            {priority.label}
          </Badge>
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-secondary/30 text-muted-foreground/70">
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {projectName && (
        <div className="mb-2 flex items-center gap-1.5">
          <Flag className="h-3 w-3 text-primary" />
          <span className="truncate text-xs font-medium text-primary">{projectName}</span>
        </div>
      )}

      {task.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {task.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px] text-muted-foreground">
              <Tag className="h-2.5 w-2.5 opacity-80" />
              {tag.length > 12 ? tag.slice(0, 12) + "..." : tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{task.tags.length - 2}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/40 pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-[10px] font-bold text-primary">
            {avatarLabel}
          </div>
          <span className="max-w-[120px] truncate text-xs text-muted-foreground">
            {assigneeLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className={cn(
            "flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium",
            isOverdue ? "bg-destructive/10 text-destructive" : "bg-secondary/30 text-muted-foreground"
          )}>
            <Calendar className="h-2.5 w-2.5" />
            {dueDateValue || "No due date"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/30 pt-3 opacity-100 transition-opacity sm:opacity-80 sm:group-hover:opacity-100">
        <div className="flex items-center gap-1">
          {canEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(task); }}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:border-warning/50 hover:text-warning"
              title="Edit"
              type="button"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onPin(task.id); }}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background",
              pinned ? "text-primary border-primary/50" : "text-muted-foreground hover:text-primary hover:border-primary/50"
            )}
            title={pinned ? "Unpin" : "Pin"}
            type="button"
          >
            <Pin className={cn("h-3.5 w-3.5", pinned && "fill-primary")} />
          </button>
          {canDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:border-destructive/50 hover:text-destructive"
              title="Delete"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onMove(task.id, "left"); }}
            disabled={column === "todo" || isMoving}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-30"
            type="button"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMove(task.id, "right"); }}
            disabled={column === "done" || isMoving}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground hover:border-primary/50 hover:text-primary disabled:opacity-30"
            type="button"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {isMoving && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-background/80 backdrop-blur-sm">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
    </motion.article>
  );
});

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const { role } = useTheme();
  const { refresh, isRefreshing } = useRefresh();
  const boardRef = useRef<HTMLDivElement>(null);

  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [movingTaskId, setMovingTaskId] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  const projectId = selectedProject === "all" ? undefined : Number(selectedProject);
  const serverPriority = priorityFilter === "all" ? undefined : (priorityFilter as TaskPriority);

  const todoQuery = useInfiniteQuery({
    queryKey: [...crmKeys.tasks, "column", "todo", projectId ?? "all", serverPriority ?? "all", TASK_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      crmService.getTasksPage({
        column: "todo",
        page: Number(pageParam),
        limit: TASK_PAGE_SIZE,
        projectId,
        priority: serverPriority,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const inProgressQuery = useInfiniteQuery({
    queryKey: [...crmKeys.tasks, "column", "in-progress", projectId ?? "all", serverPriority ?? "all", TASK_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      crmService.getTasksPage({
        column: "in-progress",
        page: Number(pageParam),
        limit: TASK_PAGE_SIZE,
        projectId,
        priority: serverPriority,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const doneQuery = useInfiniteQuery({
    queryKey: [...crmKeys.tasks, "column", "done", projectId ?? "all", serverPriority ?? "all", TASK_PAGE_SIZE],
    queryFn: ({ pageParam }) =>
      crmService.getTasksPage({
        column: "done",
        page: Number(pageParam),
        limit: TASK_PAGE_SIZE,
        projectId,
        priority: serverPriority,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
  });

  const statsQuery = useQuery({
    queryKey: [...crmKeys.tasks, "stats", projectId ?? "all", serverPriority ?? "all"],
    queryFn: () => crmService.getTaskStats({ projectId, priority: serverPriority }),
  });

  const tasksError = todoQuery.error ?? inProgressQuery.error ?? doneQuery.error;
  const { data: projects = [] } = useProjects();

  const pinnedKey = `crm-task-pins-${role}`;
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  const [board, setBoard] = useState<Record<TaskColumn, TaskRecord[]> | null>(null);
  const isBoardFetching = todoQuery.isFetching || inProgressQuery.isFetching || doneQuery.isFetching;

  const fetchedBoard = useMemo<Record<TaskColumn, TaskRecord[]> | null>(() => {
    if (!todoQuery.data || !inProgressQuery.data || !doneQuery.data) {
      return null;
    }
    return {
      todo: flattenTaskPages(todoQuery.data.pages),
      "in-progress": flattenTaskPages(inProgressQuery.data.pages),
      done: flattenTaskPages(doneQuery.data.pages),
    };
  }, [todoQuery.data, inProgressQuery.data, doneQuery.data]);

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin" || role === "manager";

  useEffect(() => {
    setPinnedTaskIds(readPinned(pinnedKey));
  }, [pinnedKey]);

  useEffect(() => {
    setBoard(null);
  }, [projectId, serverPriority]);

  useEffect(() => {
    if (!fetchedBoard) return;
    setBoard((current) => {
      if (movingTaskId !== null && current) return current;
      if (isBoardFetching && current) return current;
      return fetchedBoard;
    });
  }, [fetchedBoard, movingTaskId, isBoardFetching]);

  const effectiveBoard = board ?? fetchedBoard;

  const projectNameById = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const filteredBoard = useMemo(() => {
    if (!effectiveBoard) return null;
    const query = searchQuery.toLowerCase().trim();
    const priority = priorityFilter !== "all" ? priorityFilter : null;

    return orderedColumns.reduce<Record<TaskColumn, TaskRecord[]>>((acc, column) => {
      const tasksForColumn = effectiveBoard[column] ?? [];
      acc[column] = tasksForColumn.filter((task) => {
        if (priority && task.priority !== priority) return false;
        if (query) {
          const matchesTitle = task.title.toLowerCase().includes(query);
          const matchesAssignee = task.assignee.toLowerCase().includes(query);
          const matchesTags = task.tags.some((tag) => tag.toLowerCase().includes(query));
          const matchesProject = task.projectId
            ? projectNameById.get(task.projectId)?.toLowerCase().includes(query)
            : false;
          if (!matchesTitle && !matchesAssignee && !matchesTags && !matchesProject) {
            return false;
          }
        }
        return true;
      });
      return acc;
    }, {} as Record<TaskColumn, TaskRecord[]>);
  }, [effectiveBoard, searchQuery, priorityFilter, projectNameById]);

  const serverStats = useMemo(() => {
    if (statsQuery.data) return statsQuery.data;
    return {
      todo: fetchedBoard?.todo.length ?? 0,
      "in-progress": fetchedBoard?.["in-progress"].length ?? 0,
      done: fetchedBoard?.done.length ?? 0,
      total:
        (fetchedBoard?.todo.length ?? 0) +
        (fetchedBoard?.["in-progress"].length ?? 0) +
        (fetchedBoard?.done.length ?? 0),
    } satisfies TaskBoardStats;
  }, [statsQuery.data, fetchedBoard]);

  const stats = useMemo(() => {
    if (!filteredBoard) return { todo: 0, inProgress: 0, done: 0, total: 0 };
    const hasSearch = searchQuery.trim().length > 0;
    if (!hasSearch) {
      return {
        todo: serverStats.todo,
        inProgress: serverStats["in-progress"],
        done: serverStats.done,
        total: serverStats.total,
      };
    }
    const todo = filteredBoard.todo.length;
    const inProgress = filteredBoard["in-progress"].length;
    const done = filteredBoard.done.length;
    return { todo, inProgress, done, total: todo + inProgress + done };
  }, [filteredBoard, searchQuery, serverStats]);

  const refetchBoard = useCallback(async () => {
    await Promise.all([
      todoQuery.refetch(),
      inProgressQuery.refetch(),
      doneQuery.refetch(),
      statsQuery.refetch(),
    ]);
  }, [todoQuery, inProgressQuery, doneQuery, statsQuery]);

  const handleRefresh = useCallback(async () => {
    await refresh(
      () => refetchBoard(),
      { message: getRefreshMessage("tasks"), successMessage: getRefreshSuccessMessage("tasks") }
    );
  }, [refresh, refetchBoard]);

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, column }: { taskId: number; column: TaskColumn }) =>
      crmService.updateTask(taskId, { column }),
    onMutate: async ({ taskId, column }) => {
      setMovingTaskId(taskId);
      await queryClient.cancelQueries({ queryKey: [...crmKeys.tasks, "column"] });
      const previousBoard = board ?? fetchedBoard;
      if (previousBoard) {
        setBoard(moveTaskInBoard(previousBoard, taskId, column));
      }
      return { previousBoard };
    },
    onSuccess: async (updatedTask, variables) => {
      const normalizedTask = normalizeTask({
        ...updatedTask,
        column: normalizeTaskColumn(updatedTask.column ?? variables.column),
      });
      setBoard((current) => {
        if (!current) return current;
        return upsertTaskInBoard(current, normalizedTask);
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...crmKeys.tasks, "column"] }),
        queryClient.invalidateQueries({ queryKey: [...crmKeys.tasks, "stats"] }),
        queryClient.invalidateQueries({ queryKey: crmKeys.projects }),
      ]);
      toast.success(`Moved to ${columnMeta[variables.column].label}`);
    },
    onError: (error, _variables, context) => {
      if (context?.previousBoard) {
        setBoard(context.previousBoard);
      }
      const message = error instanceof Error ? error.message : "Failed to move task";
      toast.error(message || "Failed to move task");
    },
    onSettled: () => setMovingTaskId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.removeTask(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...crmKeys.tasks, "column"] }),
        queryClient.invalidateQueries({ queryKey: [...crmKeys.tasks, "stats"] }),
        queryClient.invalidateQueries({ queryKey: crmKeys.projects }),
      ]);
      toast.success("Task deleted");
    },
    onError: () => {
      toast.error("Failed to delete");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (title: string) =>
      crmService.createTask({ title, assignee: "admin@crmpro.com", priority: "medium", dueDate: "", column: "todo" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...crmKeys.tasks, "column"] }),
        queryClient.invalidateQueries({ queryKey: [...crmKeys.tasks, "stats"] }),
      ]);
      setQuickAddTitle("");
      setShowQuickAdd(false);
      toast.success("Task created");
    },
    onError: () => toast.error("Failed to create task"),
  });

  const togglePin = useCallback((taskId: number) => {
    const key = String(taskId);
    const next = pinnedTaskIds.includes(key)
      ? pinnedTaskIds.filter((id) => id !== key)
      : [key, ...pinnedTaskIds];
    setPinnedTaskIds(next);
    writeStoredJSON(pinnedKey, next);
  }, [pinnedTaskIds, pinnedKey]);

  const handleDelete = useCallback((taskId: number) => {
    if (window.confirm("Delete this task?")) {
      deleteMutation.mutate(taskId);
    }
  }, [deleteMutation]);

  const handleMove = useCallback((taskId: number, direction: "left" | "right") => {
    if (!effectiveBoard || moveTaskMutation.isPending) return;
    const sourceColumn = orderedColumns.find((col) => (effectiveBoard[col] ?? []).some((t) => t.id === taskId));
    if (!sourceColumn) return;
    const currentIndex = orderedColumns.indexOf(sourceColumn);
    const nextColumn = direction === "left" ? orderedColumns[currentIndex - 1] : orderedColumns[currentIndex + 1];
    if (!nextColumn || nextColumn === sourceColumn) return;
    moveTaskMutation.mutate({ taskId, column: nextColumn });
  }, [effectiveBoard, moveTaskMutation]);

  const handleCardClick = useCallback((task: TaskRecord) => {
    setSelectedTask(task);
    setTaskDetailOpen(true);
  }, []);

  const handleEdit = useCallback((task: TaskRecord) => {
    openQuickCreate("task", task);
  }, [openQuickCreate]);

  const handleQuickAdd = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (quickAddTitle.trim()) {
      createTaskMutation.mutate(quickAddTitle.trim());
    }
  }, [quickAddTitle, createTaskMutation]);

  const clearFilters = () => {
    setSearchQuery("");
    setPriorityFilter("all");
    setSelectedProject("all");
  };

  const hasActiveFilters = searchQuery || priorityFilter !== "all" || selectedProject !== "all";

  if (tasksError) {
    return (
      <ErrorFallback
        title="Failed to load tasks"
        error={tasksError}
        onRetry={() => refetchBoard()}
        retryLabel="Retry"
      />
    );
  }

  const isInitialLoading =
    !effectiveBoard && (todoQuery.isLoading || inProgressQuery.isLoading || doneQuery.isLoading);

  if (isInitialLoading || !effectiveBoard || !filteredBoard) {
    return <PageLoader />;
  }

  const columnQueries: Record<TaskColumn, typeof todoQuery> = {
    todo: todoQuery,
    "in-progress": inProgressQuery,
    done: doneQuery,
  };

  return (
    <div className="space-y-6" ref={boardRef}>
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 mb-3">
                <ListTodo className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Workspace · Tasks</span>
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Task Board</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Plan work by status, track delivery flow, and keep priorities moving.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
                <ListTodo className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">{stats.total} total</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2">
                <span className="text-sm font-medium text-warning">{stats.todo} to do</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-4 py-2">
                <span className="text-sm font-medium text-info">{stats.inProgress} in progress</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2">
                <span className="text-sm font-medium text-success">{stats.done} done</span>
              </div>
              <div className="flex items-center gap-2 ml-1">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                  Refresh
                </Button>
                {canUseQuickCreate && (
                  <Button size="sm" onClick={() => openQuickCreate("task")} className="gap-2">
                    <Plus className="h-4 w-4" /> New Task
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "To Do", value: stats.todo, color: "text-warning", icon: Clock, gradient: "from-warning to-warning/60" },
              { label: "In Progress", value: stats.inProgress, color: "text-info", icon: ListTodo, gradient: "from-info to-info/60" },
              { label: "Completed", value: stats.done, color: "text-success", icon: CheckCircle2, gradient: "from-success to-success/60" },
              { label: "Total", value: stats.total, color: "text-primary", icon: Flag, gradient: "from-primary to-primary/60" },
            ].map((stat) => (
              <div key={stat.label} className="relative overflow-hidden rounded-xl border border-border/50 bg-secondary/20 p-3">
                <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", stat.gradient)} />
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-secondary", stat.color)}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={cn("text-lg font-bold", stat.color)}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card/90 p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks..."
              className="h-10 w-full rounded-lg border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="all">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        <div className="mt-3">
          {showQuickAdd ? (
            <form onSubmit={handleQuickAdd} className="flex gap-2">
              <input
                type="text"
                value={quickAddTitle}
                onChange={(e) => setQuickAddTitle(e.target.value)}
                placeholder="Task title..."
                className="flex-1 h-10 rounded-lg border bg-background px-3 text-sm outline-none focus:border-primary"
                autoFocus
              />
              <Button type="submit" size="sm" disabled={!quickAddTitle.trim() || createTaskMutation.isPending}>
                {createTaskMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowQuickAdd(false)}>
                Cancel
              </Button>
            </form>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowQuickAdd(true)} className="self-start">
              <Plus className="h-4 w-4 mr-1" />
              Quick Add
            </Button>
          )}
        </div>
      </section>

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-3">
        {orderedColumns.map((column) => {
          const meta = columnMeta[column];
          const ColumnIcon = meta.icon;
          const columnTasks = filteredBoard[column] ?? [];
          const columnQuery = columnQueries[column];
          const hasSearch = searchQuery.trim().length > 0;
          const columnTotal = hasSearch ? columnTasks.length : serverStats[column];
          const remaining = Math.max(0, columnTotal - columnTasks.length);

          return (
            <div key={column} className={cn("rounded-xl border bg-card overflow-hidden", meta.tone)}>
              {/* Column Header */}
              <div className={cn("flex items-center justify-between px-4 py-3 border-b", meta.headerBg)}>
                <div className="flex items-center gap-2">
                  <ColumnIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{meta.label}</span>
                  <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-xs font-medium">
                    {columnTotal}
                  </span>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-2 p-3 h-[600px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {columnTasks.length > 0 ? (
                    <>
                      {columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          column={column}
                          projectName={task.projectId ? projectNameById.get(task.projectId) : undefined}
                          pinned={pinnedTaskIds.includes(String(task.id))}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          isMoving={movingTaskId === task.id}
                          onMove={handleMove}
                          onPin={togglePin}
                          onDelete={handleDelete}
                          onClick={handleCardClick}
                          onEdit={handleEdit}
                        />
                      ))}
                      {!hasSearch && columnQuery.hasNextPage && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => columnQuery.fetchNextPage()}
                          disabled={columnQuery.isFetchingNextPage}
                          className="w-full gap-2"
                        >
                          {columnQuery.isFetchingNextPage ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Loading...
                            </>
                          ) : (
                            `Load ${Math.min(TASK_PAGE_SIZE, remaining)} more (${remaining} left)`
                          )}
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ColumnIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-sm font-medium text-muted-foreground">
                        {searchQuery ? "No matching tasks" : "No tasks"}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        {searchQuery ? "Try different search" : column === "todo" ? "Create a task" : "Drag tasks here"}
                      </p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <TaskDetailModal task={selectedTask} open={taskDetailOpen} onOpenChange={setTaskDetailOpen} />
    </div>
  );
}
