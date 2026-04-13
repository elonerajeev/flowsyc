import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Clock, Plus, CalendarDays, MapPin, Repeat, Trash2, PencilLine } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { CalendarSkeleton } from "@/components/skeletons";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { useSharedTeamMembers } from "@/lib/team-roster";
import { cn } from "@/lib/utils";
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";
import { crmKeys, useCalendarEvents } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import type { CalendarEventRecord, TeamMemberRecord } from "@/types/crm";

type EventRepeat = "none" | "weekly" | "monthly";
type AssignmentKind = "none" | "team" | "member";
type CalendarEvent = CalendarEventRecord;

type EventDraft = Omit<CalendarEvent, "id" | "authorId" | "createdAt" | "updatedAt">;

const eventColors = [
  { value: "primary", label: "Primary", className: "border-primary/25 bg-primary/10 text-primary" },
  { value: "success", label: "Success", className: "border-success/25 bg-success/10 text-success" },
  { value: "warning", label: "Warning", className: "border-warning/25 bg-warning/10 text-warning" },
  { value: "info", label: "Info", className: "border-info/25 bg-info/10 text-info" },
  { value: "destructive", label: "Alert", className: "border-destructive/25 bg-destructive/10 text-destructive" },
] as const;

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function fromISODate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);
}

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function getMonthDays(date: Date) {
  const monthStart = getMonthStart(date);
  const startDay = monthStart.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let index = 0; index < startDay; index += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(date.getFullYear(), date.getMonth(), day));
  }

  return cells;
}

function matchesEventDate(event: CalendarEvent, date: Date) {
  const eventDate = fromISODate(event.date);
  const targetISO = toISODate(date);
  if (event.date === targetISO) return true;
  if (event.repeat === "none") return false;
  if (event.repeat === "weekly") {
    return eventDate.getDay() === date.getDay() && date >= eventDate;
  }
  return eventDate.getDate() === date.getDate() && date >= eventDate;
}

function colorClass(color: CalendarEvent["color"]) {
  return eventColors.find((item) => item.value === color)?.className ?? "border-border/70 bg-secondary/15 text-foreground";
}

function emptyDraft(date: Date): EventDraft {
  return {
    title: "",
    date: toISODate(date),
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    notes: "",
    color: "primary",
    repeat: "none",
    assignmentKind: "none",
    assigneeId: "",
    assigneeName: "",
    assigneeMeta: "",
  };
}

function normalizeEvent(event: CalendarEvent): CalendarEvent {
  return {
    ...event,
    assignmentKind: event.assignmentKind ?? "none",
    assigneeId: event.assigneeId ?? "",
    assigneeName: event.assigneeName ?? "",
    assigneeMeta: event.assigneeMeta ?? "",
  };
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const sharedTeamMembers = useSharedTeamMembers();
  const [month, setMonth] = useState(() => getMonthStart(today));
  const { data: events = [], isLoading, error: fetchError, refetch } = useCalendarEvents();
  const [selectedDate, setSelectedDate] = useState(() => new Date(today));
  const [draft, setDraft] = useState<EventDraft>(() => emptyDraft(today));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [visibleUpcomingCount, setVisibleUpcomingCount] = useState(8);
  const UPCOMING_PAGE_SIZE = 8;

  const createMutation = useMutation({
    mutationFn: (event: EventDraft) => crmService.createCalendarEvent(event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.calendar });
      toast({ title: "Event created", description: "The event has been saved to the database." });
    },
    onError: () => toast({ title: "Error", description: "Failed to create event.", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<CalendarEvent> }) =>
      crmService.updateCalendarEvent(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.calendar });
      toast({ title: "Event updated", description: "The changes have been saved." });
    },
    onError: () => toast({ title: "Error", description: "Failed to update event.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => crmService.deleteCalendarEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.calendar });
      toast({ title: "Event deleted", description: "The event has been removed." });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete event.", variant: "destructive" }),
  });

  const teamOptions = useMemo(() => {
    const names = new Set<string>();
    return sharedTeamMembers.reduce<Array<{ label: string; value: string }>>((acc, member) => {
      if (!names.has(member.team)) {
        names.add(member.team);
        acc.push({ label: member.team, value: member.team });
      }
      return acc;
    }, []);
  }, [sharedTeamMembers]);

  const memberOptions = useMemo(() => {
    return sharedTeamMembers.map((member: TeamMemberRecord) => ({
      label: `${member.name} · ${member.designation}`,
      value: member.email,
      meta: member.team,
    }));
  }, [sharedTeamMembers]);

  const calendarDays = useMemo(() => getMonthDays(month), [month]);

  const visibleEvents = useMemo(
    () =>
      events
        .filter((event) => matchesEventDate(event, selectedDate))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, selectedDate],
  );

  const upcomingEvents = useMemo(() => {
    return [...events]
      .filter((event) => {
        const eventDate = fromISODate(event.date);
        return eventDate >= today || event.repeat !== "none";
      })
      .sort((a, b) => {
        const dateDiff = fromISODate(a.date).getTime() - fromISODate(b.date).getTime();
        return dateDiff || a.startTime.localeCompare(b.startTime);
      });
  }, [events, today]);

  const monthSummary = useMemo(() => {
    return {
      total: events.length,
      today: events.filter((event) => matchesEventDate(event, today)).length,
      recurring: events.filter((event) => event.repeat !== "none").length,
    };
  }, [events, today]);

  const openCreateDialog = (date = selectedDate) => {
    setEditingId(null);
    setDraft(emptyDraft(date));
    setIsDialogOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingId(event.id);
    setDraft({
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      notes: event.notes,
      color: event.color,
      repeat: event.repeat,
      assignmentKind: event.assignmentKind,
      assigneeId: event.assigneeId,
      assigneeName: event.assigneeName,
      assigneeMeta: event.assigneeMeta,
    });
    setIsDialogOpen(true);
  };

  const resolveAssignment = (draftValue: EventDraft): Pick<CalendarEvent, "assignmentKind" | "assigneeId" | "assigneeName" | "assigneeMeta"> => {
    if (draftValue.assignmentKind === "member") {
      const matched = memberOptions.find((member) => member.value === draftValue.assigneeId);
      return {
        assignmentKind: "member",
        assigneeId: matched?.value ?? draftValue.assigneeId,
        assigneeName: matched?.label.split(" · ")[0] ?? draftValue.assigneeName,
        assigneeMeta: matched?.meta ?? draftValue.assigneeMeta,
      };
    }

    if (draftValue.assignmentKind === "team") {
      return {
        assignmentKind: "team",
        assigneeId: draftValue.assigneeId,
        assigneeName: draftValue.assigneeName || draftValue.assigneeId,
        assigneeMeta: draftValue.assigneeMeta || "Team",
      };
    }

    return {
      assignmentKind: "none",
      assigneeId: "",
      assigneeName: "",
      assigneeMeta: "",
    };
  };

  const saveEvent = () => {
    if (!draft.title.trim()) {
      toast({
        title: "Event title is required",
        description: "Add a title before saving the calendar event.",
        variant: "destructive",
      });
      return;
    }

    const payload: EventDraft = {
      ...draft,
      title: draft.title.trim(),
      location: draft.location.trim(),
      notes: draft.notes.trim(),
      ...resolveAssignment(draft),
    };

    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, patch: payload });
    } else {
      createMutation.mutate(payload);
    }

    setSelectedDate(fromISODate(payload.date));
    setMonth(getMonthStart(fromISODate(payload.date)));
    setIsDialogOpen(false);
  };

  const deleteEvent = (eventId: number) => {
    deleteMutation.mutate(eventId);
  };

  if (isLoading) return <CalendarSkeleton />;
  if (fetchError) {
    return (
      <ErrorFallback
        title="Calendar events failed to load"
        error={fetchError}
        onRetry={() => refetch()}
        retryLabel="Retry calendar"
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              Calendar
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Calendar</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Plan meetings, recurring events, and team time blocks with real create, edit, and delete actions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setMonth(getMonthStart(today));
                setSelectedDate(new Date(today));
              }}
            >
              Today
            </Button>
            <Button onClick={() => openCreateDialog()} className="gap-2 rounded-2xl">
              <Plus className="h-4 w-4" />
              New Event
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Events this month", value: String(monthSummary.total) },
            { label: "Selected day", value: formatDay(selectedDate) },
            { label: "Recurring events", value: String(monthSummary.recurring) },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.25rem] border border-border/70 bg-secondary/20 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-secondary/15 text-muted-foreground transition hover:border-border hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Viewing</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">{formatMonth(month)}</h2>
            </div>
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-secondary/15 text-muted-foreground transition hover:border-border hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) => {
              const dayEvents = day ? events.filter((event) => matchesEventDate(event, day)) : [];
              const isToday = day ? toISODate(day) === toISODate(today) : false;
              const isSelected = day ? toISODate(day) === toISODate(selectedDate) : false;

              return (
                <button
                  key={`${month.toISOString()}-${index}`}
                  type="button"
                  disabled={!day}
                  onClick={() => {
                    if (!day) return;
                    setSelectedDate(day);
                  }}
                  className={cn(
                    "min-h-28 rounded-[1.25rem] border p-2 text-left transition",
                    !day && "cursor-default border-border/50 bg-secondary/10 opacity-40",
                    day && "border-border/70 bg-secondary/10 hover:border-border hover:bg-secondary/20",
                    isToday && "border-primary/30 bg-primary/[0.06]",
                    isSelected && "border-primary bg-primary/[0.08]",
                  )}
                >
                  {day && (
                    <>
                      <span
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                          isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                        )}
                      >
                        {day.getDate()}
                      </span>
                      <div className="mt-2 space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "truncate rounded-lg border px-2 py-0.5 text-[10px] font-semibold",
                              colorClass(event.color),
                            )}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="flex gap-0.5 mt-1">
                            {dayEvents.slice(2).map((e) => (
                              <span key={e.id} className={cn("h-1.5 w-1.5 rounded-full", colorClass(e.color).split(" ").find(c => c.startsWith("bg-")) ?? "bg-primary")} />
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Selected day</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">{formatDay(selectedDate)}</h2>
              </div>
              <Button variant="outline" size="sm" onClick={() => openCreateDialog(selectedDate)}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>

            <div className="mt-4 space-y-3">
              {visibleEvents.length > 0 ? (
                visibleEvents.map((event) => (
                  <article key={event.id} className="rounded-[1.25rem] border border-border/70 bg-secondary/15 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className={cn("inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]", colorClass(event.color))}>
                          {event.repeat === "none" ? "One time" : `${event.repeat} repeat`}
                        </div>
                        <h3 className="font-semibold text-foreground">{event.title}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary" />
                            {event.startTime} - {event.endTime}
                          </p>
                          {event.location && (
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              {event.location}
                            </p>
                          )}
                          {event.assignmentKind !== "none" && (
                            <p className="flex items-center gap-2">
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">A</span>
                              {event.assignmentKind === "team" ? "Team" : "Member"}: {event.assigneeName}
                              {event.assigneeMeta ? ` · ${event.assigneeMeta}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {event.notes && <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.notes}</p>}

                    <div className="mt-4 flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(event)}>
                        <PencilLine className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => deleteEvent(event.id)} className="border-destructive/20 text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-secondary/15 p-4 text-sm text-muted-foreground">
                  No events for this day. Add one with the button above.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Upcoming events</p>
            </div>
            <div className="mt-4 space-y-3">
              {upcomingEvents.length > 0 ? (
                <>
                {upcomingEvents.slice(0, visibleUpcomingCount).map((event) => (
                  <article key={event.id} className="rounded-xl border border-border/70 bg-secondary/15 p-3">
                    <p className="text-sm font-semibold text-foreground">{event.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDay(fromISODate(event.date))} · {event.startTime}
                      {event.repeat !== "none" ? ` · ${event.repeat}` : ""}
                      {event.assignmentKind !== "none" ? ` · ${event.assigneeName}` : ""}
                    </p>
                  </article>
                ))}
                <ShowMoreButton
                  total={upcomingEvents.length}
                  visible={visibleUpcomingCount}
                  pageSize={UPCOMING_PAGE_SIZE}
                  onShowMore={() => setVisibleUpcomingCount(v => Math.min(v + UPCOMING_PAGE_SIZE, upcomingEvents.length))}
                  onShowLess={() => setVisibleUpcomingCount(UPCOMING_PAGE_SIZE)}
                />
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-4 text-center">
                  <p className="text-sm text-muted-foreground">No upcoming events.</p>
                  <p className="mt-1 text-xs text-muted-foreground">Create an event to see it here.</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit event" : "New event"}</DialogTitle>
            <DialogDescription>Set the date, time, repeat rule, and notes for the event.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="title">Event title</Label>
              <Input id="title" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Team standup" />
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {formatDay(fromISODate(draft.date))}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarPicker
                    mode="single"
                    selected={fromISODate(draft.date)}
                    onSelect={(date) => {
                      if (!date) return;
                      setDraft((current) => ({ ...current, date: toISODate(date) }));
                      setSelectedDate(date);
                      setMonth(getMonthStart(date));
                      setDatePopoverOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repeat">Repeat</Label>
              <Select value={draft.repeat} onValueChange={(value) => setDraft((current) => ({ ...current, repeat: value as EventRepeat }))}>
                <SelectTrigger id="repeat">
                  <SelectValue placeholder="No repeat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No repeat</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignmentKind">Assign to</Label>
              <Select
                value={draft.assignmentKind}
                onValueChange={(value) =>
                  setDraft((current) => {
                    const nextKind = value as AssignmentKind;
                    if (nextKind === "none") {
                      return { ...current, assignmentKind: "none", assigneeId: "", assigneeName: "", assigneeMeta: "" };
                    }

                    if (nextKind === "team") {
                      const firstTeam = teamOptions[0]?.value ?? "";
                      return {
                        ...current,
                        assignmentKind: "team",
                        assigneeId: current.assigneeId || firstTeam,
                        assigneeName: current.assigneeName || firstTeam,
                        assigneeMeta: current.assigneeMeta || "Team",
                      };
                    }

                    const firstMember = memberOptions[0];
                    return {
                      ...current,
                      assignmentKind: "member",
                      assigneeId: current.assigneeId || firstMember?.value || "",
                      assigneeName: current.assigneeName || firstMember?.label.split(" · ")[0] || "",
                      assigneeMeta: current.assigneeMeta || firstMember?.meta || "",
                    };
                  })
                }
              >
                <SelectTrigger id="assignmentKind">
                  <SelectValue placeholder="No assignment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No assignment</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="member">Member</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {draft.assignmentKind === "team" && (
              <div className="space-y-2">
                <Label htmlFor="teamAssignment">Team</Label>
                <Select
                  value={draft.assigneeId}
                  onValueChange={(value) => {
                    const team = teamOptions.find((item) => item.value === value);
                    setDraft((current) => ({
                      ...current,
                      assigneeId: value,
                      assigneeName: team?.value ?? value,
                      assigneeMeta: "Team",
                    }));
                  }}
                >
                  <SelectTrigger id="teamAssignment">
                    <SelectValue placeholder="Choose team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamOptions.map((team) => (
                      <SelectItem key={team.value} value={team.value}>
                        {team.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {draft.assignmentKind === "member" && (
              <div className="space-y-2">
                <Label htmlFor="memberAssignment">Team member</Label>
                <Select
                  value={draft.assigneeId}
                  onValueChange={(value) => {
                    const member = memberOptions.find((item) => item.value === value);
                    setDraft((current) => ({
                      ...current,
                      assigneeId: value,
                      assigneeName: member?.label.split(" · ")[0] ?? value,
                      assigneeMeta: member?.meta ?? "",
                    }));
                  }}
                >
                  <SelectTrigger id="memberAssignment">
                    <SelectValue placeholder="Choose person" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberOptions.map((member) => (
                      <SelectItem key={member.value} value={member.value}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="startTime">Start time</Label>
              <Input id="startTime" type="time" value={draft.startTime} onChange={(event) => setDraft((current) => ({ ...current, startTime: event.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End time</Label>
              <Input id="endTime" type="time" value={draft.endTime} onChange={(event) => setDraft((current) => ({ ...current, endTime: event.target.value }))} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Zoom, board room, HQ floor 3" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Agenda, attendees, or preparation notes"
                className="min-h-24"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {eventColors.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, color: item.value }))}
                    className={cn(
                      "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition",
                      draft.color === item.value ? item.className : "border-border/70 bg-secondary/10 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEvent}>{editingId ? "Save changes" : "Create event"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
