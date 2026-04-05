import { useState, useEffect } from "react";
import { Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { RADIUS, TEXT } from "@/lib/design-tokens";
import { useAuth } from "@/contexts/AuthContext";
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";

type TodoItem = {
  id: string;
  text: string;
  completed: boolean;
};

export default function PersonalizedFocus() {
  const { user } = useAuth();
  const [focusText, setFocusText] = useState("Keep the next move obvious");
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Load from localStorage
  useEffect(() => {
    if (!user) return;
    const key = `crm-focus-${user.id}`;
    const data = readStoredJSON<{ focusText?: string; todos?: TodoItem[] }>(key, {});
    if (data.focusText) setFocusText(data.focusText);
    if (data.todos) setTodos(data.todos);
  }, [user]);

  // Save to localStorage
  const saveData = (newFocus: string, newTodos: TodoItem[]) => {
    if (!user) return;
    const key = `crm-focus-${user.id}`;
    writeStoredJSON(key, { focusText: newFocus, todos: newTodos });
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    const updated = [...todos, { id: crypto.randomUUID(), text: newTodo, completed: false }];
    setTodos(updated);
    saveData(focusText, updated);
    setNewTodo("");
  };

  const toggleTodo = (id: string) => {
    const updated = todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    setTodos(updated);
    saveData(focusText, updated);
  };

  const deleteTodo = (id: string) => {
    const updated = todos.filter(t => t.id !== id);
    setTodos(updated);
    saveData(focusText, updated);
  };

  const updateFocus = (text: string) => {
    setFocusText(text);
    saveData(text, todos);
  };

  const completedCount = todos.filter(t => t.completed).length;
  const progress = todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0;
  const displayedTodos = showAll ? todos : todos.slice(0, 4);
  const hasMore = todos.length > 4;

  return (
    <div className={cn("border border-border/70 bg-card/80 shadow-card p-6", RADIUS.xl)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className={cn("uppercase tracking-[0.16em] text-muted-foreground mb-2", TEXT.eyebrow)}>
            Today's focus
          </p>
          {isEditing ? (
            <input
              type="text"
              value={focusText}
              onChange={(e) => updateFocus(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setIsEditing(false)}
              autoFocus
              className={cn("w-full bg-transparent border-b border-primary text-foreground outline-none", TEXT.body)}
            />
          ) : (
            <h3
              onClick={() => setIsEditing(true)}
              className={cn("text-foreground cursor-pointer hover:text-primary transition", TEXT.body)}
            >
              {focusText}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("font-semibold text-primary", TEXT.h3)}>{progress}%</span>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {displayedTodos.map((todo) => (
          <div
            key={todo.id}
            className={cn(
              "flex items-center gap-3 p-3 border border-border/60 bg-secondary/20 transition hover:bg-secondary/40",
              RADIUS.lg
            )}
          >
            <button
              onClick={() => toggleTodo(todo.id)}
              className={cn(
                "h-5 w-5 rounded border-2 flex items-center justify-center transition",
                todo.completed
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-border hover:border-primary"
              )}
            >
              {todo.completed && <Check className="h-3 w-3" />}
            </button>
            <span
              className={cn(
                "flex-1 text-sm",
                todo.completed ? "line-through text-muted-foreground" : "text-foreground"
              )}
            >
              {todo.text}
            </span>
            <button
              onClick={() => deleteTodo(todo.id)}
              className="text-muted-foreground hover:text-destructive transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        
        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className={cn(
              "w-full py-2 text-sm font-medium text-primary hover:text-primary/80 transition",
              RADIUS.lg
            )}
          >
            Show {todos.length - 4} more
          </button>
        )}
        
        {showAll && hasMore && (
          <button
            onClick={() => setShowAll(false)}
            className={cn(
              "w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition",
              RADIUS.lg
            )}
          >
            Show less
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTodo()}
          placeholder="Add a task..."
          className={cn(
            "flex-1 h-10 px-4 border border-border/70 bg-background text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition",
            RADIUS.lg
          )}
        />
        <button
          onClick={addTodo}
          className={cn(
            "h-10 w-10 flex items-center justify-center bg-primary text-primary-foreground hover:brightness-110 transition",
            RADIUS.lg
          )}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className={cn("mt-6 pt-4 border-t border-border/60 space-y-1", TEXT.meta)}>
        <p className="text-muted-foreground">
          <span className="font-semibold text-foreground">{completedCount}</span> of{" "}
          <span className="font-semibold text-foreground">{todos.length}</span> tasks completed
        </p>
      </div>
    </div>
  );
}
