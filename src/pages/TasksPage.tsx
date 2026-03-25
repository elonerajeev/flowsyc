import { useState } from "react";
import { Plus, GripVertical, Calendar, User, Flag } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

interface Task {
  id: number;
  title: string;
  assignee: string;
  avatar: string;
  priority: "high" | "medium" | "low";
  dueDate: string;
  tags: string[];
}

type Column = "todo" | "in-progress" | "done";

const initialTasks: Record<Column, Task[]> = {
  todo: [
    { id: 1, title: "Design new landing page", assignee: "Emily Davis", avatar: "ED", priority: "high", dueDate: "Mar 28", tags: ["Design"] },
    { id: 2, title: "API integration docs", assignee: "Mike Chen", avatar: "MC", priority: "medium", dueDate: "Mar 30", tags: ["Dev"] },
    { id: 3, title: "Client onboarding flow", assignee: "Sarah Johnson", avatar: "SJ", priority: "low", dueDate: "Apr 2", tags: ["Product"] },
  ],
  "in-progress": [
    { id: 4, title: "CRM dashboard redesign", assignee: "Lisa Park", avatar: "LP", priority: "high", dueDate: "Mar 26", tags: ["Design", "UI"] },
    { id: 5, title: "Email campaign setup", assignee: "Emily Davis", avatar: "ED", priority: "medium", dueDate: "Mar 29", tags: ["Marketing"] },
  ],
  done: [
    { id: 6, title: "Database migration", assignee: "Mike Chen", avatar: "MC", priority: "high", dueDate: "Mar 20", tags: ["Dev"] },
    { id: 7, title: "User feedback analysis", assignee: "James Wilson", avatar: "JW", priority: "low", dueDate: "Mar 22", tags: ["Research"] },
  ],
};

const columnMeta: Record<Column, { label: string; color: string; dotColor: string }> = {
  todo: { label: "To Do", color: "border-t-warning", dotColor: "bg-warning" },
  "in-progress": { label: "In Progress", color: "border-t-info", dotColor: "bg-info" },
  done: { label: "Done", color: "border-t-success", dotColor: "bg-success" },
};

function TaskCard({ task }: { task: Task }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card card-hover cursor-grab">
      <div className="flex items-start justify-between mb-2">
        <div className="flex flex-wrap gap-1">
          {task.tags.map((tag) => (
            <span key={tag} className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{tag}</span>
          ))}
        </div>
        <GripVertical className="h-4 w-4 text-muted-foreground/40" />
      </div>
      <h4 className="text-sm font-medium text-foreground mb-3">{task.title}</h4>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{task.avatar}</div>
          <span className="text-xs text-muted-foreground">{task.assignee.split(" ")[0]}</span>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={task.priority} />
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" /> {task.dueDate}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function TasksPage() {
  const [tasks] = useState(initialTasks);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Task Board</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track your team's tasks</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" /> New Task
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(Object.keys(columnMeta) as Column[]).map((col) => (
          <div key={col} className={cn("rounded-xl border border-border bg-secondary/30 border-t-4", columnMeta[col].color)}>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                <div className={cn("h-2.5 w-2.5 rounded-full", columnMeta[col].dotColor)} />
                <h3 className="font-display font-semibold text-sm text-foreground">{columnMeta[col].label}</h3>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">{tasks[col].length}</span>
              </div>
              <button className="p-1 rounded text-muted-foreground hover:text-foreground">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 p-4 pt-0">
              {tasks[col].map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
