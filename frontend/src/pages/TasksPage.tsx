import { useEffect, useMemo, useState, useCallback, memo, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ChevronLeft, ChevronRight, Flag, Pin, Plus, Search, Edit2, Trash2, 
  RefreshCw, MessageSquare, CheckCircle2, Clock, ListTodo, GripVertical,
  Calendar, Tag, Loader2, Filter, X, SlidersHorizontal, LayoutGrid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import PageLoader from "@/components/shared/PageLoader";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import ErrorFallback from "@/components/shared/ErrorFallback";
import TaskDetailModal from "@/components/crm/TaskDetailModal";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { crmKeys, useProjects, useTasks } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import type { TaskColumn, TaskRecord } from "@/types/crm";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
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

function readPinned(key: string): string[] {
  return readStoredJSON<string[]>(key, []);
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
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && column !== "done";

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
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        "group relative rounded-xl border bg-card p-3.5 cursor-grab active:cursor-grabbing",
        "hover:shadow-lg hover:border-primary/30",
        pinned && "ring-2 ring-primary/20 bg-primary/5",
        isDragging && "opacity-50 scale-105 rotate-1 shadow-2xl z-50",
        isMoving && "opacity-50 pointer-events-none"
      )}
    >
      {/* Priority Indicator */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: `hsl(var(--${priority.dot.replace('bg-', '')}))` }} />

      {/* Header Row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground line-clamp-2">{task.title}</h3>
        </div>
        <Badge variant="secondary" className={cn("text-[10px] shrink-0 font-semibold uppercase", priority.color)}>
          {priority.label}
        </Badge>
      </div>

      {/* Project Badge */}
      {projectName && (
        <div className="flex items-center gap-1.5 mb-2">
          <Flag className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary truncate">{projectName}</span>
        </div>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 rounded bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              <Tag className="h-2.5 w-2.5" />
              {tag.length > 12 ? tag.slice(0, 12) + "..." : tag}
            </span>
          ))}
          {task.tags.length > 2 && (
            <span className="text-[10px] text-muted-foreground">+{task.tags.length - 2}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10 text-[9px] font-bold text-primary">
            {task.avatar}
          </div>
          <span className="text-xs text-muted-foreground max-w-[60px] truncate">
            {task.assignee.split("@")[0]}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <div className={cn(
            "flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium",
            isOverdue ? "bg-destructive/10 text-destructive" : "bg-secondary/30 text-muted-foreground"
          )}>
            <Calendar className="h-2.5 w-2.5" />
            {task.dueDate || "No date"}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="absolute -top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {canEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="flex h-6 w-6 items-center justify-center rounded bg-background border shadow-sm text-muted-foreground hover:text-warning hover:border-warning/50"
            title="Edit"
          >
            <Edit2 className="h-3 w-3" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onPin(task.id); }}
          className={cn(
            "flex h-6 w-6 items-center justify-center rounded bg-background border shadow-sm",
            pinned ? "text-primary border-primary/50" : "text-muted-foreground hover:text-primary hover:border-primary/50"
          )}
          title={pinned ? "Unpin" : "Pin"}
        >
          <Pin className={cn("h-3 w-3", pinned && "fill-primary")} />
        </button>
        {canDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
            className="flex h-6 w-6 items-center justify-center rounded bg-background border shadow-sm text-muted-foreground hover:text-destructive hover:border-destructive/50"
            title="Delete"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Move Controls */}
      <div className="absolute bottom-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onMove(task.id, "left"); }}
          disabled={column === "todo" || isMoving}
          className="flex h-6 w-6 items-center justify-center rounded bg-background border shadow-sm text-muted-foreground hover:text-primary hover:border-primary/50 disabled:opacity-30"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMove(task.id, "right"); }}
          disabled={column === "done" || isMoving}
          className="flex h-6 w-6 items-center justify-center rounded bg-background border shadow-sm text-muted-foreground hover:text-primary hover:border-primary/50 disabled:opacity-30"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* Moving Overlay */}
      {isMoving && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm">
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
  const boardRef = useRef<HTMLDivElement>(null);

  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");

  const projectId = selectedProject === "all" ? undefined : Number(selectedProject);
  const { data, isLoading, error: tasksError, refetch } = useTasks(projectId);
  const { data: projects = [] } = useProjects();

  const pinnedKey = `crm-task-pins-${role}`;
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  const [board, setBoard] = useState<Record<TaskColumn, TaskRecord[]> | null>(null);
  const [todoVisible, setTodoVisible] = useState(20);
  const [inProgressVisible, setInProgressVisible] = useState(20);
  const [doneVisible, setDoneVisible] = useState(20);

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin" || role === "manager";

  useEffect(() => {
    setPinnedTaskIds(readPinned(pinnedKey));
  }, [pinnedKey]);

  useEffect(() => {
    if (data) {
      setBoard(data);
    }
  }, [data]);

  const effectiveBoard = board ?? data ?? null;

  const projectNameById = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  );

  const allTags = useMemo(() => {
    if (!effectiveBoard) return [];
    const tagSet = new Set<string>();
    orderedColumns.forEach((col) => {
      effectiveBoard[col].forEach((task) => {
        task.tags.forEach((tag) => tagSet.add(tag));
      });
    });
    return Array.from(tagSet).sort();
  }, [effectiveBoard]);

  const filteredBoard = useMemo(() => {
    if (!effectiveBoard) return null;
    const query = searchQuery.toLowerCase().trim();
    const priority = priorityFilter !== "all" ? priorityFilter : null;

    return orderedColumns.reduce<Record<TaskColumn, TaskRecord[]>>((acc, column) => {
      acc[column] = effectiveBoard[column].filter((task) => {
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

  const stats = useMemo(() => {
    if (!filteredBoard) return { todo: 0, inProgress: 0, done: 0, total: 0 };
    const todo = filteredBoard.todo.length;
    const inProgress = filteredBoard["in-progress"].length;
    const done = filteredBoard.done.length;
    return { todo, inProgress, done, total: todo + inProgress + done };
  }, [filteredBoard]);

  const handleRefresh = useCallback(async () => {
    await refresh(
      () => refetch(),
      { message: getRefreshMessage("tasks"), successMessage: getRefreshSuccessMessage("tasks") }
    );
  }, [refetch]);

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, column }: { taskId: number; column: TaskColumn }) =>
      crmService.updateTask(taskId, { column }),
    onMutate: ({ taskId, column }) => {
      setMovingTaskId(taskId);
    },
    onSuccess: async (updatedTask) => {
      await queryClient.invalidateQueries({ queryKey: crmKeys.tasks });
      await queryClient.invalidateQueries({ queryKey: crmKeys.projects });
      toast.success(`Moved to ${columnMeta[updatedTask.column].label}`);
    },
    onError: () => {
      toast.error("Failed to move task");
    },
    onSettled: () => setMovingTaskId(null),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.removeTask(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: crmKeys.tasks });
      await queryClient.invalidateQueries({ queryKey: crmKeys.projects });
      toast.success("Task deleted");
    },
    onError: () => {
      toast.error("Failed to delete");
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: (title: string) =>
      crmService.createTask({ title, assignee: "admin@crmpro.com", priority: "medium", dueDate: "", column: "todo" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.tasks });
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
    const sourceColumn = orderedColumns.find((col) => effectiveBoard[col].some((t) => t.id === taskId));
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
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  if (isLoading || !effectiveBoard || !filteredBoard) {
    return <PageLoader />;
  }

  const visibleCountMap: Record<TaskColumn, number> = {
    todo: todoVisible,
    "in-progress": inProgressVisible,
    done: doneVisible,
  };

  return (
    <div className="space-y-4" ref={boardRef}>
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <ListTodo className="h-3.5 w-3.5" />
            Workspace
          </div>
          <h1 className="mt-1 text-2xl font-bold">
            Task <span className="text-primary">Board</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-1", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
          {canUseQuickCreate && (
            <Button size="sm" onClick={() => openQuickCreate("task")}>
              <Plus className="h-4 w-4 mr-1" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "To Do", value: stats.todo, color: "text-warning", icon: Clock },
          { label: "In Progress", value: stats.inProgress, color: "text-info", icon: ListTodo },
          { label: "Completed", value: stats.done, color: "text-success", icon: CheckCircle2 },
          { label: "Total", value: stats.total, color: "text-primary", icon: Flag },
        ].map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-secondary", stat.color)}>
              <stat.icon className="h-4 w-4" />
            </div>
            <div>
              <p className={cn("text-lg font-bold", stat.color)}>{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
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

      {/* Quick Add */}
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
          <Button variant="ghost" size="sm" onClick={() => setShowQuickAdd(false)}>
            Cancel
          </Button>
        </form>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setShowQuickAdd(true)} className="self-start">
          <Plus className="h-4 w-4 mr-1" />
          Quick Add
        </Button>
      )}

      {/* Kanban Board */}
      <div className="grid gap-4 lg:grid-cols-3">
        {orderedColumns.map((column) => {
          const meta = columnMeta[column];
          const ColumnIcon = meta.icon;
          const columnTasks = filteredBoard[column];

          return (
            <div key={column} className={cn("rounded-xl border bg-card overflow-hidden", meta.tone)}>
              {/* Column Header */}
              <div className={cn("flex items-center justify-between px-4 py-3 border-b", meta.headerBg)}>
                <div className="flex items-center gap-2">
                  <ColumnIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{meta.label}</span>
                  <span className="rounded-full bg-secondary/80 px-2 py-0.5 text-xs font-medium">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Tasks */}
              <div className="space-y-2 p-3 h-[600px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {columnTasks.length > 0 ? (
                    <>
                      {columnTasks.slice(0, visibleCountMap[column]).map((task) => (
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
                      {columnTasks.length > visibleCountMap[column] && (
                        <ShowMoreButton
                          total={columnTasks.length}
                          visible={visibleCountMap[column]}
                          pageSize={PAGE_SIZE}
                          onShowMore={() => {
                            if (column === "todo") setTodoVisible((v) => Math.min(v + PAGE_SIZE, columnTasks.length));
                            if (column === "in-progress") setInProgressVisible((v) => Math.min(v + PAGE_SIZE, columnTasks.length));
                            if (column === "done") setDoneVisible((v) => Math.min(v + PAGE_SIZE, columnTasks.length));
                          }}
                          onShowLess={() => {
                            if (column === "todo") setTodoVisible(PAGE_SIZE);
                            if (column === "in-progress") setInProgressVisible(PAGE_SIZE);
                            if (column === "done") setDoneVisible(PAGE_SIZE);
                          }}
                        />
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
