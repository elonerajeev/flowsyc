import { useEffect, useMemo, useState } from "react";
import { BookText, FileText, GripVertical, Pin, Sparkles } from "lucide-react";

import { useTheme } from "@/contexts/ThemeContext";
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";

const defaultNotes = [
  { title: "Acme renewal prep", tag: "Client", text: "Confirm pricing guardrails and Q3 expansion seats before the review." },
  { title: "CRM v2.0 scope", tag: "Project", text: "Keep dashboard hierarchy simple. Avoid adding more widgets to the hero." },
  { title: "Ops sync", tag: "Internal", text: "Attendance and approvals should remain visible from the People section." },
];

type NoteItem = {
  id: string;
  title: string;
  tag: string;
  text: string;
  source: "default" | "custom";
};

export default function NotesPage() {
  const { role } = useTheme();
  const customNotesKey = `crm-notes-${role}`;
  const noteOrderKey = `crm-notes-order-${role}`;
  const [customNotes, setCustomNotes] = useState<NoteItem[]>([]);
  const [noteOrder, setNoteOrder] = useState<string[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Internal");
  const [text, setText] = useState("");
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null);

  useEffect(() => {
    setCustomNotes(readStoredJSON<NoteItem[]>(customNotesKey, []));
    setNoteOrder(readStoredJSON<string[] | null>(noteOrderKey, null));
  }, [customNotesKey, noteOrderKey]);

  const defaultItems = useMemo<NoteItem[]>(
    () =>
      defaultNotes.map((note, index) => ({
        id: `default-${index}`,
        title: note.title,
        tag: note.tag,
        text: note.text,
        source: "default" as const,
      })),
    [],
  );

  const notes = useMemo(() => {
    const combined = [...customNotes, ...defaultItems];
    if (!noteOrder?.length) {
      return combined;
    }

    const ordered = noteOrder
      .map((id) => combined.find((note) => note.id === id))
      .filter((note): note is NoteItem => Boolean(note));
    const remaining = combined.filter((note) => !noteOrder.includes(note.id));
    return [...ordered, ...remaining];
  }, [customNotes, defaultItems, noteOrder]);

  const persistCustomNotes = (nextCustom: NoteItem[]) => {
    setCustomNotes(nextCustom);
    writeStoredJSON(customNotesKey, nextCustom);
  };

  const persistOrder = (nextOrder: string[]) => {
    setNoteOrder(nextOrder);
    writeStoredJSON(noteOrderKey, nextOrder);
  };

  const addNote = () => {
    const nextTitle = title.trim();
    const nextText = text.trim();
    if (!nextTitle || !nextText) return;

    const nextNote: NoteItem = {
      id: `custom-${Date.now().toString(36)}`,
      title: nextTitle,
      tag: tag.trim() || "Internal",
      text: nextText,
      source: "custom",
    };

    const nextCustom = [nextNote, ...customNotes];
    persistCustomNotes(nextCustom);

    const currentOrder = noteOrder ?? notes.map((note) => note.id);
    persistOrder([nextNote.id, ...currentOrder.filter((id) => id !== nextNote.id)]);

    setTitle("");
    setTag("Internal");
    setText("");
    setShowForm(false);
  };

  const moveNote = (fromId: string, toId: string) => {
    if (fromId === toId) return;

    const currentOrder = noteOrder ?? notes.map((note) => note.id);
    const fromIndex = currentOrder.indexOf(fromId);
    const toIndex = currentOrder.indexOf(toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextOrder = [...currentOrder];
    const [moved] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, moved);
    persistOrder(nextOrder);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Workspace
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Notes</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Lightweight notes for client context, internal decisions, and project memory.
          </p>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {notes.map((note) => (
            <article
              key={note.id}
              draggable
              onDragStart={() => setDraggedNoteId(note.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedNoteId) moveNote(draggedNoteId, note.id);
                setDraggedNoteId(null);
              }}
              onDragEnd={() => setDraggedNoteId(null)}
              className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card transition hover:border-border"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => moveNote(note.id, notes[Math.max(0, notes.indexOf(note) - 1)]?.id ?? note.id)}
                    className="mt-1 rounded-lg border border-border/70 bg-secondary/30 p-1 text-muted-foreground transition hover:text-foreground"
                    aria-label="Move note"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="font-display text-lg font-semibold text-foreground">{note.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">{note.tag}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{note.source}</p>
                  </div>
                </div>
                <Pin className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{note.text}</p>
            </article>
          ))}
        </div>

        <aside className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BookText className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Notes usage</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm((current) => !current)}
              className="flex h-9 w-9 items-center justify-center rounded-2xl border border-border/70 bg-secondary/30 text-primary transition hover:border-border"
              aria-label="Add note"
            >
              +
            </button>
          </div>
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <p>Attach notes to clients, deals, or projects instead of burying them in chat.</p>
            <p>Later this can become a full document layer with permissions and versioning.</p>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  placeholder="Tag"
                  className="h-11 w-full rounded-2xl border border-border/70 bg-card px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={addNote}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <FileText className="h-4 w-4" />
                  Save note
                </button>
              </div>
              <textarea
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Write the note..."
                rows={4}
                className="w-full rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-border/70 bg-secondary/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Quick add</p>
              <p className="mt-1 text-sm font-medium text-foreground">Create a note, pin it, and attach it to any record.</p>
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
