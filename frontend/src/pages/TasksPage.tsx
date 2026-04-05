import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Flag, Pin, Plus, Search, Edit2, Trash2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import PageLoader from "@/components/shared/PageLoader";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { crmKeys, useProjects, useTasks } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import type { TaskColumn, TaskRecord } from "@/types/crm";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";

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
}) {
  const { openQuickCreate } = useWorkspace();

  return (
    <article
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDropCard(task.id, column)}
      className={cn(
        "rounded-[1.25rem] border border-border/70 bg-card p-4 shadow-card transition hover:border-border",
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
      </div>
    </article>
  );
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const { role } = useTheme();
  const { data: projects = [] } = useProjects();
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const activeProjectId = selectedProject === "all" ? undefined : Number(selectedProject);
  const { data, isLoading, error: tasksError, refetch } = useTasks(activeProjectId);
  const [search, setSearch] = useState("");
  const [board, setBoard] = useState<Record<TaskColumn, TaskRecord[]> | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const pinnedKey = `crm-task-pins-${role}`;
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);
  const TASK_PAGE_SIZE = 4;
  const [todoVisible, setTodoVisible] = useState(4);
  const [inProgressVisible, setInProgressVisible] = useState(4);
  const [doneVisible, setDoneVisible] = useState(4);

  const handleRefresh = async () => {
    const start = Date.now();
    await refetch();
    const duration = Date.now() - start;
    if (duration < 600) await new Promise(r => setTimeout(r, 600 - duration));
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
  }, [data, activeProjectId]);

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
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/60 bg-card p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/45 px-3 py-1 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <Flag className="h-3.5 w-3.5 text-primary" />
              Execution Board
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Functional task operations, not just static cards.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Tasks can move through execution states, be pinned to the top, and be reordered with drag and drop. That gives you a realistic interaction model for future integrations, optimistic updates, and audit logging.
              </p>
            </div>
          </div>
          {canUseQuickCreate ? (
            <div className="flex gap-2">
              <motion.div whileTap={{ scale: 0.94 }}>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-2xl border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition h-11 px-4"
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", isLoading && "animate-spin")} />
                  {isLoading ? "Refreshing..." : "Refresh Board"}
                </Button>
              </motion.div>
              <button
                type="button"
                onClick={openQuickCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
              >
                <Plus className="h-4 w-4" />
                New Task
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <motion.div whileTap={{ scale: 0.94 }}>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 rounded-2xl border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition h-11 px-4"
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", isLoading && "animate-spin")} />
                  {isLoading ? "Refreshing..." : "Refresh Board"}
                </Button>
              </motion.div>
              <div className="inline-flex items-center rounded-2xl border border-border/70 bg-secondary/30 px-5 py-3 text-sm font-semibold text-muted-foreground">
                Read only
              </div>
            </div>
          )}
        </div>
        <div className="relative mt-6 max-w-lg">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search task title, owner, or tag"
            className="h-12 w-full rounded-2xl border border-border/70 bg-background/55 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div className="mt-4 max-w-xs">
          <select
            value={selectedProject}
            onChange={(event) => setSelectedProject(event.target.value)}
            className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All projects</option>
            {projects.map((project) => (
              <option key={project.id} value={String(project.id)}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </section>

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
    </div>
  );
}
