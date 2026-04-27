import { useMemo, useState } from "react";
import { BookText, FileText, NotepadText, Plus, Search, Sparkles, Trash2, RefreshCw, X } from "lucide-react";
import { motion } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { NotesSkeleton } from "@/components/skeletons";
import ErrorFallback from "@/components/shared/ErrorFallback";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { crmKeys, useNotes } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { useRefresh } from "@/hooks/use-refresh";
import { getRefreshMessage, getRefreshSuccessMessage } from "@/lib/refresh-messages";

const noteColorMap: Record<string, { card: string; dot: string }> = {
  default: { card: "border-border/70 bg-card/90",                    dot: "bg-muted-foreground/40" },
  primary: { card: "border-primary/30 bg-primary/5",                 dot: "bg-primary" },
  success: { card: "border-success/30 bg-success/5",                 dot: "bg-success" },
  warning: { card: "border-warning/30 bg-warning/5",                 dot: "bg-warning" },
  info:    { card: "border-info/30 bg-info/5",                       dot: "bg-info" },
  rose:    { card: "border-destructive/30 bg-destructive/5",         dot: "bg-destructive" },
  amber:   { card: "border-warning/30 bg-warning/5",                 dot: "bg-warning" },
  blue:    { card: "border-primary/30 bg-primary/5",                 dot: "bg-primary" },
  green:   { card: "border-success/30 bg-success/5",                 dot: "bg-success" },
  slate:   { card: "border-border/70 bg-secondary/20",               dot: "bg-muted-foreground/40" },
};

const colorOptions = [
  { value: "default", label: "Grey" },
  { value: "blue",    label: "Blue" },
  { value: "green",   label: "Green" },
  { value: "amber",   label: "Amber" },
  { value: "rose",    label: "Rose" },
  { value: "slate",   label: "Slate" },
];

export default function NotesPage() {
  const queryClient = useQueryClient();
  const { data: notes = [], isLoading, error, refetch } = useNotes();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [color, setColor] = useState("default");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(8);
  const PAGE_SIZE = 8;
  const { refresh, isRefreshing } = useRefresh();

  const handleRefresh = async () => {
    await refresh(() => refetch(), {
      message: getRefreshMessage("notes"),
      successMessage: getRefreshSuccessMessage("notes"),
    });
  };

  const createMutation = useMutation({
    mutationFn: ({ title, content, color }: { title: string; content: string; color: string }) =>
      crmService.createNote({ title, content, color }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.notes });
      setTitle(""); setContent(""); setColor("default"); setShowForm(false);
      toast.success("Note saved");
    },
    onError: () => toast.error("Failed to save note"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.notes });
      toast.success("Note deleted");
    },
    onError: () => toast.error("Failed to delete note"),
  });

  const addNote = () => {
    if (!title.trim()) return;
    createMutation.mutate({ title: title.trim(), content: content.trim(), color });
  };

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(n => n.title.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q));
  }, [notes, search]);

  if (error) {
    return (
      <ErrorFallback
        title="Notes failed to load"
        error={error}
        description="Could not load notes from the server. Retry to refresh."
        onRetry={() => refetch()}
        retryLabel="Retry notes"
      />
    );
  }
  if (isLoading) return <NotesSkeleton />;

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Workspace
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-display text-3xl font-semibold text-foreground">Notes</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Lightweight notes for client context, internal decisions, and project memory.
              </p>
            </div>
            <motion.div whileTap={{ scale: 0.94 }}>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border-border/70 bg-background/50 px-4 font-semibold text-foreground backdrop-blur-sm transition"
              >
                <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="h-10 w-full rounded-2xl border border-border/70 bg-card pl-10 pr-10 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {filteredNotes.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
              {filteredNotes.slice(0, visibleCount).map((note) => {
                const cfg = noteColorMap[note.color ?? "default"] ?? noteColorMap.default;
                return (
                <article
                  key={note.id}
                  className={cn("rounded-[1.5rem] border p-5 shadow-card transition hover:shadow-md", cfg.card)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full flex-shrink-0", cfg.dot)} />
                      <p className="font-semibold text-foreground line-clamp-1">{note.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {note.isPinned && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">📌</span>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(note.id)}
                        disabled={deleteMutation.isPending}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-border/50 text-muted-foreground/60 transition hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  {note.content && (
                    <p className="text-xs leading-5 text-muted-foreground line-clamp-3">{note.content}</p>
                  )}
                  <p className="mt-3 text-[10px] text-muted-foreground/60">
                    {new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </article>
                );
              })}
              </div>
              <ShowMoreButton
                total={filteredNotes.length}
                visible={visibleCount}
                pageSize={PAGE_SIZE}
                onShowMore={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, filteredNotes.length))}
                onShowLess={() => setVisibleCount(PAGE_SIZE)}
              />
            </>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-secondary/10 p-10 text-center">
              <NotepadText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">{search ? "No matching notes" : "No notes yet"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search ? "Try a different search term." : "Add a note to capture client context, decisions, or reminders."}
              </p>
            </div>
          )}
        </div>

        <aside className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookText className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">
                Notes ({search ? `${filteredNotes.length} of ${notes.length}` : notes.length})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((current) => !current)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-secondary/30 text-primary transition hover:border-border"
              aria-label="Add note"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Attach notes to clients, deals, or projects instead of burying them in chat.</p>
            <p>Keep the surface short and searchable so it stays useful in daily work.</p>
          </div>
          {showForm ? (
            <div className="mt-5 space-y-3 rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Quick add</p>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Note title"
                className="h-11 w-full rounded-2xl border border-border/70 bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setColor(option.value)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-semibold transition",
                      color === option.value
                        ? cn("ring-2 ring-offset-1 ring-primary", noteColorMap[option.value]?.card ?? "border-border bg-secondary/40")
                        : "border-border/70 bg-secondary/20 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Write the note..."
                rows={4}
                className="w-full rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={addNote}
                disabled={createMutation.isPending || !title.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <FileText className="h-4 w-4" />
                {createMutation.isPending ? "Saving..." : "Save note"}
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Quick add</p>
              <p className="mt-1 text-sm font-medium text-foreground">Create a note and attach it to any record.</p>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <FileText className="h-4 w-4" />
                New Note
              </button>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
