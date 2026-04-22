import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type EventRepeat = "none" | "weekly" | "monthly";
type AssignmentKind = "none" | "team" | "member";

type EventDraft = {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  color: string;
  repeat: string;
  assignmentKind: string;
  assigneeId: string;
  assigneeName: string;
  assigneeMeta: string;
};

interface CalendarEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: number | null;
  draft: EventDraft;
  onDraftChange: (draft: EventDraft) => void;
  onSave: () => void;
  onDateChange?: (date: Date) => void;
  teamOptions: Array<{ label: string; value: string }>;
  memberOptions: Array<{ label: string; value: string; meta: string }>;
}

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

export default function CalendarEventDialog({
  open,
  onOpenChange,
  editingId,
  draft,
  onDraftChange,
  onSave,
  onDateChange,
  teamOptions,
  memberOptions,
}: CalendarEventDialogProps) {
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const handleValueChange = (field: keyof EventDraft, value: string) => {
    onDraftChange({ ...draft, [field]: value });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const isoDate = toISODate(date);
    onDraftChange({ ...draft, date: isoDate });
    onDateChange?.(date);
    setDatePopoverOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editingId ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>Set the date, time, repeat rule, and notes for the event.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="title">Event title</Label>
            <Input
              id="title"
              value={draft.title}
              onChange={(event) => handleValueChange("title", event.target.value)}
              placeholder="Team standup"
            />
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
                  onSelect={handleDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repeat">Repeat</Label>
            <Select value={draft.repeat} onValueChange={(value) => handleValueChange("repeat", value as EventRepeat)}>
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
              onValueChange={(value) => {
                const nextKind = value as AssignmentKind;
                if (nextKind === "none") {
                  onDraftChange({ ...draft, assignmentKind: "none", assigneeId: "", assigneeName: "", assigneeMeta: "" });
                  return;
                }

                if (nextKind === "team") {
                  const firstTeam = teamOptions[0]?.value ?? "";
                  onDraftChange({
                    ...draft,
                    assignmentKind: "team",
                    assigneeId: draft.assigneeId || firstTeam,
                    assigneeName: draft.assigneeName || firstTeam,
                    assigneeMeta: "Team",
                  });
                  return;
                }

                const firstMember = memberOptions[0];
                onDraftChange({
                  ...draft,
                  assignmentKind: "member",
                  assigneeId: draft.assigneeId || firstMember?.value || "",
                  assigneeName: draft.assigneeName || firstMember?.label.split(" · ")[0] || "",
                  assigneeMeta: draft.assigneeMeta || firstMember?.meta || "",
                });
              }}
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
                  onDraftChange({
                    ...draft,
                    assigneeId: value,
                    assigneeName: team?.value ?? value,
                    assigneeMeta: "Team",
                  });
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
                  onDraftChange({
                    ...draft,
                    assigneeId: value,
                    assigneeName: member?.label.split(" · ")[0] ?? value,
                    assigneeMeta: member?.meta ?? "",
                  });
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
            <Input
              id="startTime"
              type="time"
              value={draft.startTime}
              onChange={(event) => handleValueChange("startTime", event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endTime">End time</Label>
            <Input
              id="endTime"
              type="time"
              value={draft.endTime}
              onChange={(event) => handleValueChange("endTime", event.target.value)}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={draft.location}
              onChange={(event) => handleValueChange("location", event.target.value)}
              placeholder="Zoom, board room, HQ floor 3"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={draft.notes}
              onChange={(event) => handleValueChange("notes", event.target.value)}
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
                  onClick={() => handleValueChange("color", item.value)}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            {editingId ? "Save changes" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { EventDraft, EventRepeat, AssignmentKind };
