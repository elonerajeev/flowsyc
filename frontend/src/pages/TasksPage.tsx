import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flag, Pin, Plus, Search, Edit2, Trash2, RefreshCw, MessageSquare, Download, CheckCircle2, Clock, ListTodo } from "lucide-react";
import { motion } from "framer-motion";
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
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";
import { useRefresh } from "@/hooks/use-refresh";
import { getRefreshMessage, getRefreshSuccessMessage } from "@/lib/refresh-messages";

const priorityConfig = {
  high:   { color: "text-destructive bg-destructive/10 border-destructive/20", dot: "bg-destructive" },
  medium: { color: "text-warning bg-warning/10 border-warning/20",             dot: "bg-warning" },
  low:    { color: "text-success bg-success/10 border-success/20",             dot: "bg-success" },
} as const;

const columnMeta: Record<TaskColumn, { label: string; tone: string; dot: string; headerBg: string }> = {
  todo:          { label: "To Do",       tone: "border-warning/40",  dot: "bg-warning",  headerBg: "bg-warning/5" },
  "in-progress": { label: "In Progress", tone: "border-info/40",     dot: "bg-info",     headerBg: "bg-info/5" },
  done:          { label: "Done",        tone: "border-success/40",  dot: "bg-success",  headerBg: "bg-success/5" },
};

const orderedColumns: TaskColumn[] = ["todo", "in-progress", "done"];

function readPinned(key: string) {
  return readStoredJSON<string[]>(key, []);
}

function TaskCard({
  task,
  column,
  projectName,
  pinned,
  canEdit,
  canDelete,
  onMove,
  onPin,
  onDelete,
  onDragStart,
  onDropCard,
  onClick,
}: {
  task: TaskRecord;
  column: TaskColumn;
  projectName?: string;
  pinned: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onMove: (taskId: number, direction: "left" | "right") => void;
  onPin: (taskId: number) => void;
  onDelete: (taskId: number) => void;
  onDragStart: (taskId: number) => void;
  onDropCard: (taskId: number, targetColumn: TaskColumn) => void;
  onClick: (task: TaskRecord) => void;
}) {
  const { openQuickCreate } = useWorkspace();
  const [isDragging, setIsDragging] = useState(false);

  return (
    <article
      draggable
      onMouseDown={() => setIsDragging(false)}
      onMouseMove={() => setIsDragging(true)}
      onDragStart={() => {
        setIsDragging(true);
        onDragStart(task.id);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDropCard(task.id, column)}
      className={cn(
        "rounded-[1.25rem] border border-border/70 bg-card p-4 shadow-card transition hover:border-border touch-manipulation",
        pinned ? "ring-1 ring-primary/20" : "",
      )}
    >
      {/* Priority + tags */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {task.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border/60 bg-secondary/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          {canEdit && (
            <button
              onClick={() => {
                toast.info("Edit mode coming via Quick Create extension");
                openQuickCreate("task", task);
              }}
              className="p-1 rounded-full hover:bg-secondary text-muted-foreground hover:text-primary transition"
              title="Edit task"
            >
              <Edit2 className="h-3 w-3" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
              title="Delete task"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <span className={cn(
            "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase flex items-center gap-1 flex-shrink-0",
            priorityConfig[task.priority as keyof typeof priorityConfig]?.color ?? "border-border/70 bg-secondary/20 text-muted-foreground"
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full", priorityConfig[task.priority as keyof typeof priorityConfig]?.dot ?? "bg-muted-foreground")} />
            {task.priority}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-semibold leading-5 text-foreground">{task.title}</h3>
      {projectName && (
        <p className="mt-1 text-xs font-medium text-primary">{projectName}</p>
      )}

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPin(task.id)}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border transition",
              pinned ? "border-primary/30 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <Pin className="h-3 w-3" />
          </button>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/50 text-[10px] font-bold text-foreground">
            {task.avatar}
          </div>
          <span className="text-xs text-muted-foreground">{task.assignee.split(" ")[0]}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onClick(task)}
            className="rounded-full border border-border/60 p-2 sm:p-1 text-muted-foreground transition hover:text-foreground hover:bg-secondary/50 touch-manipulation"
            title="Add comments"
          >
            <MessageSquare className="h-3 w-3" />
          </button>
          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              onClick={() => onMove(task.id, "left")}
              disabled={column === "todo"}
              className="rounded-full border border-border/60 p-1 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="text-[10px] text-muted-foreground">{task.dueDate}</span>
            <button
              type="button"
              onClick={() => onMove(task.id, "right")}
              disabled={column === "done"}
              className="rounded-full border border-border/60 p-1 text-muted-foreground transition hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
          <span className="sm:hidden text-[10px] text-muted-foreground">{task.dueDate}</span>
        </div>
      </div>
    </article>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const { role } = useTheme();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const projectId = selectedProject === "all" ? undefined : Number(selectedProject);
  const { data, isLoading, error: tasksError, refetch } = useTasks(projectId);
  const { data: projects = [] } = useProjects();
  const [search, setSearch] = useState("");
  const [board, setBoard] = useState<Record<TaskColumn, TaskRecord[]> | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const pinnedKey = `crm-task-pins-${role}`;
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  const TASK_PAGE_SIZE = 4;
  const [todoVisible, setTodoVisible] = useState(4);
  const [inProgressVisible, setInProgressVisible] = useState(4);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);
  const [doneVisible, setDoneVisible] = useState(4);
  const { refresh, isRefreshing } = useRefresh();

  const handleRefresh = async () => {
    await refresh(
      () => refetch(),
      {
        message: getRefreshMessage("tasks"),
        successMessage: getRefreshSuccessMessage("tasks"),
      }
    );
  };

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin" || role === "manager";

  useEffect(() => {
    setPinnedTaskIds(readPinned(pinnedKey));
  }, [pinnedKey]);

  useEffect(() => {
    setBoard(null);
    setTodoVisible(TASK_PAGE_SIZE);
    setInProgressVisible(TASK_PAGE_SIZE);
    setDoneVisible(TASK_PAGE_SIZE);
  }, [data]);

  const effectiveBoard = board ?? data ?? null;
  const projectNameById = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  );

  const moveTaskMutation = useMutation({
    mutationFn: ({ taskId, column }: { taskId: number; column: TaskColumn }) =>
      crmService.updateTask(taskId, { column }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: crmKeys.tasks }),
        queryClient.invalidateQueries({ queryKey: crmKeys.projects }),
      ]);
    },
    onError: async () => {
      setBoard(null);
      await refetch();
      toast.error("Task update failed. The board was reloaded from the server.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.removeTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.tasks });
      queryClient.invalidateQueries({ queryKey: crmKeys.projects });
      toast.success("Task removed successfully");
    },
    onError: () => toast.error("Failed to remove task"),
  });

  const filteredBoard = useMemo(() => {
    if (!effectiveBoard) return null;

    return orderedColumns.reduce<Record<TaskColumn, TaskRecord[]>>((acc, column) => {
      const query = search.toLowerCase();
      const visible = effectiveBoard[column].filter((task) => {
        return (
          task.title.toLowerCase().includes(query) ||
          task.assignee.toLowerCase().includes(query) ||
          task.tags.some((tag) => tag.toLowerCase().includes(query)) ||
          (task.projectId ? projectNameById.get(task.projectId)?.toLowerCase().includes(query) : false)
        );
      });
      acc[column] = [
        ...visible.filter((task) => pinnedTaskIds.includes(String(task.id))),
        ...visible.filter((task) => !pinnedTaskIds.includes(String(task.id))),
      ];
      return acc;
    }, {} as Record<TaskColumn, TaskRecord[]>);
  }, [effectiveBoard, pinnedTaskIds, projectNameById, search]);

  const hasVisibleTasks = filteredBoard
    ? orderedColumns.some((column) => filteredBoard[column].length > 0)
    : false;

  const persistPinned = (nextPinned: string[]) => {
    setPinnedTaskIds(nextPinned);
    writeStoredJSON(pinnedKey, nextPinned);
  };

  const togglePin = (taskId: number) => {
    const key = String(taskId);
    const next = pinnedTaskIds.includes(key) ? pinnedTaskIds.filter((id) => id !== key) : [key, ...pinnedTaskIds];
    persistPinned(next);
  };

  const updateTaskColumn = (taskId: number, targetColumn: TaskColumn) => {
    const currentBoard = effectiveBoard;
    if (!currentBoard) return;

    const sourceColumn = orderedColumns.find((column) => currentBoard[column].some((task) => task.id === taskId));
    if (!sourceColumn || sourceColumn === targetColumn) return;

    setBoard((current) => {
      const resolvedBoard = current ?? currentBoard;
      const task = resolvedBoard[sourceColumn].find((entry) => entry.id === taskId);
      if (!task) return current;

      return {
        ...resolvedBoard,
        [sourceColumn]: resolvedBoard[sourceColumn].filter((entry) => entry.id !== taskId),
        [targetColumn]: [...resolvedBoard[targetColumn], { ...task, column: targetColumn }],
      };
    });

    moveTaskMutation.mutate({ taskId, column: targetColumn });
  };

  const handleDropToColumn = (taskId: number, targetColumn: TaskColumn) => {
    updateTaskColumn(taskId, targetColumn);
  };

  const stats = useMemo(() => {
    if (!data) return { todo: 0, inProgress: 0, done: 0, total: 0 };
    const todo = data.todo.length;
    const inProgress = data["in-progress"].length;
    const done = data.done.length;
    const total = todo + inProgress + done;
    return { todo, inProgress, done, total };
  }, [data]);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

  if (tasksError) {
    return (
      <ErrorFallback
        title="Tasks failed to load"
        error={tasksError}
        description="The task board could not be loaded. Retry to refresh the latest board state."
        onRetry={() => refetch()}
        retryLabel="Retry tasks"
      />
    );
  }
  if (isLoading || !effectiveBoard || !filteredBoard) {
    return <PageLoader />;
  }

  const emptyMessage =
    role === "employee"
      ? "Tasks assigned to your team or yourself will appear here once someone adds them. Talk to your manager to get visibility."
      : "No tasks available yet. Create one via Quick Create.";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Hero Section */}
      <motion.section variants={item} className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-info to-success" />
        <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-gradient-to-br from-primary/5 to-info/5 blur-3xl" />
        <div className="absolute -left-20 -bottom-20 h-60 w-60 rounded-full bg-gradient-to-tr from-success/5 to-primary/5 blur-3xl" />

        <div className={cn("relative", SPACING.card)}>
          <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <ListTodo className="h-3.5 w-3.5 text-primary" />
                Workspace
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                Task <span className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">Board</span>
              </h1>
              <p className={cn("max-w-xl text-muted-foreground", TEXT.bodyRelaxed)}>
                Track tasks through execution states with drag-and-drop, pinning, and real-time updates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-2"
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
              {canUseQuickCreate && (
                <Button size="sm" onClick={openQuickCreate} className="gap-2">
                  <Plus className="h-4 w-4" />
                  New Task
                </Button>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "To Do", value: stats.todo, icon: Clock, gradient: "from-warning to-warning/60" },
              { label: "In Progress", value: stats.inProgress, icon: ListTodo, gradient: "from-info to-info/60" },
              { label: "Completed", value: stats.done, icon: CheckCircle2, gradient: "from-success to-success/60" },
              { label: "Total", value: stats.total, icon: Flag, gradient: "from-primary to-primary/60" },
            ].map((stat) => (
              <div key={stat.label} className={cn("relative overflow-hidden rounded-xl border border-border/40 bg-secondary/20 p-3", RADIUS.md)}>
                <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", stat.gradient)} />
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br border", stat.gradient, "text-white border-transparent")}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className={cn("text-muted-foreground", TEXT.meta)}>{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search tasks..."
                className="h-10 w-full rounded-xl border border-border/40 bg-background/70 pl-10 pr-4 text-sm outline-none transition-colors focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>
            <select
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              className="h-10 rounded-xl border border-border/40 bg-background/70 px-4 text-sm outline-none transition-colors focus:border-primary/50"
            >
              <option value="all">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={String(project.id)}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.section>

      {!hasVisibleTasks && (
        <div className="rounded-2xl border border-border/60 bg-secondary/10 p-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-3">
        {orderedColumns.map((column) => (
          <div
            key={column}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => draggedTaskId && handleDropToColumn(draggedTaskId, column)}
            className={cn("rounded-[1.5rem] border bg-card shadow-card overflow-hidden", columnMeta[column].tone)}
          >
            {/* Column header */}
            <div className={cn("flex items-center justify-between px-4 py-3 border-b border-border/40", columnMeta[column].headerBg)}>
              <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", columnMeta[column].dot)} />
                <p className="text-sm font-semibold text-foreground">{columnMeta[column].label}</p>
              </div>
              <span className="rounded-full bg-background/60 border border-border/50 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                {effectiveBoard[column].length}
              </span>
            </div>
            <div className="space-y-2.5 p-3">
              {filteredBoard[column].length > 0 ? (
                (() => {
                  const visibleLimit = column === "todo" ? todoVisible : column === "in-progress" ? inProgressVisible : doneVisible;
                  return filteredBoard[column].slice(0, visibleLimit).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      column={column}
                      projectName={task.projectId ? projectNameById.get(task.projectId) : undefined}
                      pinned={pinnedTaskIds.includes(String(task.id))}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      onMove={(taskId, direction) => {
                        const sourceColumn = orderedColumns.find((entry) => (effectiveBoard?.[entry] ?? []).some((task) => task.id === taskId));
                        if (!sourceColumn) return;
                        const currentIndex = orderedColumns.indexOf(sourceColumn);
                        const nextColumn = direction === "left" ? orderedColumns[currentIndex - 1] : orderedColumns[currentIndex + 1];
                        if (!nextColumn) return;
                        updateTaskColumn(taskId, nextColumn);
                      }}
                      onPin={togglePin}
                      onDelete={(id) => {
                        if (window.confirm("Are you sure you want to delete this task?")) {
                          deleteMutation.mutate(id);
                        }
                      }}
                      onDragStart={(taskId) => setDraggedTaskId(taskId)}
                      onDropCard={handleDropToColumn}
                      onClick={(task) => {
                        setSelectedTask(task);
                        setTaskDetailOpen(true);
                      }}
                    />
                  ));
                })()
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {search ? "No matching tasks" : "No tasks here"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {search
                      ? "Try a different search term."
                      : column === "todo"
                        ? "Add a task to get started."
                        : `Nothing in ${columnMeta[column].label} yet.`}
                  </p>
                </div>
              )}
              {/* Show More */}
              <ShowMoreButton
                total={filteredBoard[column].length}
                visible={column === "todo" ? todoVisible : column === "in-progress" ? inProgressVisible : doneVisible}
                pageSize={TASK_PAGE_SIZE}
                onShowMore={() => {
                  if (column === "todo") setTodoVisible(v => Math.min(v + TASK_PAGE_SIZE, filteredBoard[column].length));
                  else if (column === "in-progress") setInProgressVisible(v => Math.min(v + TASK_PAGE_SIZE, filteredBoard[column].length));
                  else setDoneVisible(v => Math.min(v + TASK_PAGE_SIZE, filteredBoard[column].length));
                }}
                onShowLess={() => {
                  if (column === "todo") setTodoVisible(TASK_PAGE_SIZE);
                  else if (column === "in-progress") setInProgressVisible(TASK_PAGE_SIZE);
                  else setDoneVisible(TASK_PAGE_SIZE);
                }}
              />
            </div>
          </div>
        ))}
      </section>

      <TaskDetailModal
        task={selectedTask}
        open={taskDetailOpen}
        onOpenChange={setTaskDetailOpen}
      />
    </motion.div>
  );
}
