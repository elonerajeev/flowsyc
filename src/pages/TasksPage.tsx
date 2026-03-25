import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, GripVertical, Pin, Plus, Search } from "lucide-react";

import StatusBadge from "@/components/shared/StatusBadge";
import PageLoader from "@/components/shared/PageLoader";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useTasks } from "@/hooks/use-crm-data";
import type { TaskColumn, TaskRecord } from "@/types/crm";
import { cn } from "@/lib/utils";
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";

const columnMeta: Record<TaskColumn, { label: string; tone: string; dot: string }> = {
  todo: { label: "To Do", tone: "border-warning/40", dot: "bg-warning" },
  "in-progress": { label: "In Progress", tone: "border-info/40", dot: "bg-info" },
  done: { label: "Done", tone: "border-success/40", dot: "bg-success" },
};

const orderedColumns: TaskColumn[] = ["todo", "in-progress", "done"];

function readPinned(key: string) {
  return readStoredJSON<string[]>(key, []);
}

function moveTask(
  board: Record<TaskColumn, TaskRecord[]>,
  taskId: number,
  direction: "left" | "right",
) {
  const sourceColumn = orderedColumns.find((column) => board[column].some((task) => task.id === taskId));
  if (!sourceColumn) return board;

  const currentIndex = orderedColumns.indexOf(sourceColumn);
  const nextIndex = direction === "left" ? currentIndex - 1 : currentIndex + 1;
  const destination = orderedColumns[nextIndex];
  if (!destination) return board;

  const task = board[sourceColumn].find((entry) => entry.id === taskId);
  if (!task) return board;

  return {
    ...board,
    [sourceColumn]: board[sourceColumn].filter((entry) => entry.id !== taskId),
    [destination]: [...board[destination], task],
  };
}

function TaskCard({
  task,
  column,
  pinned,
  onMove,
  onPin,
  onDragStart,
  onDropCard,
}: {
  task: TaskRecord;
  column: TaskColumn;
  pinned: boolean;
  onMove: (taskId: number, direction: "left" | "right") => void;
  onPin: (taskId: number) => void;
  onDragStart: (taskId: number) => void;
  onDropCard: (taskId: number, targetColumn: TaskColumn) => void;
}) {
  return (
    <article
      draggable
      onDragStart={() => onDragStart(task.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDropCard(task.id, column)}
      className={cn(
        "rounded-[1.25rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)_/_0.98),hsl(var(--card)_/_0.86))] p-4 shadow-card transition",
        pinned ? "ring-1 ring-primary/20" : "",
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {task.tags.map((tag) => (
            <span key={tag} className="rounded-full border border-border/70 bg-secondary/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
        <StatusBadge status={task.priority} />
      </div>
      <h3 className="text-sm font-semibold leading-6 text-foreground">{task.title}</h3>
      <div className="mt-4 grid gap-3 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Owner</span>
          <span className="font-semibold text-foreground">{task.assignee}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Due date</span>
          <span className="font-semibold text-foreground">{task.dueDate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Value stream</span>
          <span className="font-semibold text-foreground">{task.valueStream}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between rounded-[1rem] border border-border/70 bg-secondary/28 px-3 py-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <button
            type="button"
            onClick={() => onPin(task.id)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border transition",
              pinned ? "border-primary/30 bg-primary/10 text-primary" : "border-border/70 bg-card/80 text-muted-foreground hover:text-foreground",
            )}
            aria-label="Pin task"
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
            {task.avatar}
          </div>
          {task.assignee.split(" ")[0]}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMove(task.id, "left")}
            disabled={column === "todo"}
            className="rounded-full border border-border/70 p-1.5 text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(task.id, "right")}
            disabled={column === "done"}
            className="rounded-full border border-border/70 p-1.5 text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <span className="rounded-full border border-border/70 p-1.5 text-muted-foreground">
            <GripVertical className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
}

export default function TasksPage() {
  const { data, isLoading } = useTasks();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const { role } = useTheme();
  const [search, setSearch] = useState("");
  const [board, setBoard] = useState<Record<TaskColumn, TaskRecord[]> | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);
  const pinnedKey = `crm-task-pins-${role}`;
  const [pinnedTaskIds, setPinnedTaskIds] = useState<string[]>([]);

  useEffect(() => {
    setPinnedTaskIds(readPinned(pinnedKey));
  }, [pinnedKey]);

  const effectiveBoard = board ?? data ?? null;

  const filteredBoard = useMemo(() => {
    if (!effectiveBoard) return null;

    return orderedColumns.reduce<Record<TaskColumn, TaskRecord[]>>((acc, column) => {
      const query = search.toLowerCase();
      const visible = effectiveBoard[column].filter((task) => {
        return (
          task.title.toLowerCase().includes(query) ||
          task.assignee.toLowerCase().includes(query) ||
          task.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      });
      acc[column] = [
        ...visible.filter((task) => pinnedTaskIds.includes(String(task.id))),
        ...visible.filter((task) => !pinnedTaskIds.includes(String(task.id))),
      ];
      return acc;
    }, {} as Record<TaskColumn, TaskRecord[]>);
  }, [effectiveBoard, pinnedTaskIds, search]);

  const persistPinned = (nextPinned: string[]) => {
    setPinnedTaskIds(nextPinned);
    writeStoredJSON(pinnedKey, nextPinned);
  };

  const togglePin = (taskId: number) => {
    const key = String(taskId);
    const next = pinnedTaskIds.includes(key) ? pinnedTaskIds.filter((id) => id !== key) : [key, ...pinnedTaskIds];
    persistPinned(next);
  };

  const handleDropToColumn = (taskId: number, targetColumn: TaskColumn) => {
    setBoard((current) => {
      const currentBoard = current ?? effectiveBoard;
      if (!currentBoard) return current;

      const sourceColumn = orderedColumns.find((column) => currentBoard[column].some((task) => task.id === taskId));
      if (!sourceColumn) return current;

      const task = currentBoard[sourceColumn].find((entry) => entry.id === taskId);
      if (!task) return current;

      if (sourceColumn === targetColumn) {
        const sourceTasks = currentBoard[sourceColumn].filter((entry) => entry.id !== taskId);
        return {
          ...currentBoard,
          [sourceColumn]: sourceTasks,
          [targetColumn]: [...sourceTasks, task],
        };
      }

      return {
        ...currentBoard,
        [sourceColumn]: currentBoard[sourceColumn].filter((entry) => entry.id !== taskId),
        [targetColumn]: [...currentBoard[targetColumn], task],
      };
    });
  };

  if (isLoading || !effectiveBoard || !filteredBoard) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,hsl(var(--card)_/_0.98),hsl(var(--card)_/_0.82))] p-8 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/45 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              <Flag className="h-3.5 w-3.5 text-primary" />
              Execution Board
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Functional task operations, not just static cards.</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Tasks can move through execution states, be pinned to the top, and be reordered with drag and drop. That gives you a realistic interaction model for future backend mutations, optimistic updates, and audit logging.
              </p>
            </div>
          </div>
          {canUseQuickCreate ? (
            <button
              type="button"
              onClick={openQuickCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          ) : (
            <div className="inline-flex items-center rounded-2xl border border-border/70 bg-secondary/30 px-5 py-3 text-sm font-semibold text-muted-foreground">
              Read only
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
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {orderedColumns.map((column) => (
          <div
            key={column}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => draggedTaskId && handleDropToColumn(draggedTaskId, column)}
            className={cn(
              "rounded-[1.75rem] border bg-card/88 p-4 shadow-card backdrop-blur-xl",
              columnMeta[column].tone,
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn("h-3 w-3 rounded-full", columnMeta[column].dot)} />
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">{columnMeta[column].label}</p>
                  <p className="text-xs text-muted-foreground">{filteredBoard[column].length} visible items</p>
                </div>
              </div>
              <span className="rounded-full border border-border/70 bg-secondary/35 px-3 py-1 text-xs font-semibold text-muted-foreground">
                {effectiveBoard[column].length}
              </span>
            </div>
            <div className="space-y-3">
              {filteredBoard[column].map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  column={column}
                  pinned={pinnedTaskIds.includes(String(task.id))}
                  onMove={(taskId, direction) => {
                    setBoard((current) => moveTask(current ?? effectiveBoard, taskId, direction));
                  }}
                  onPin={togglePin}
                  onDragStart={(taskId) => setDraggedTaskId(taskId)}
                  onDropCard={handleDropToColumn}
                />
              ))}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
