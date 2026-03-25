import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BadgeCheck, Clock3, FileText, GripVertical, Pin, Search, Shield, UserPlus, UserRoundCheck } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/use-crm-data";
import { useListPreferences } from "@/hooks/use-list-preferences";
import { readStoredJSON, writeStoredJSON } from "@/lib/preferences";
import type { TeamMemberRecord } from "@/types/crm";

const roleTone: Record<string, string> = {
  Admin: "bg-accent/10 text-accent border-accent/20",
  Manager: "bg-info/12 text-info border-info/20",
  Employee: "bg-muted text-muted-foreground border-border",
};

const attendanceTone: Record<TeamMemberRecord["attendance"], string> = {
  present: "bg-success/12 text-foreground border-success/20",
  late: "bg-warning/14 text-foreground border-warning/20",
  remote: "bg-info/18 text-foreground border-info/20",
  absent: "bg-destructive/12 text-foreground border-destructive/20",
};

export default function TeamPage() {
  const { data: members = [], isLoading } = useTeamMembers();
  const { role } = useTheme();
  const canEditTeam = role === "admin" || role === "manager";
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [localMembers, setLocalMembers] = useState<TeamMemberRecord[]>([]);
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [memberNotes, setMemberNotes] = useState<Record<number, string>>({});
  const [noteDraft, setNoteDraft] = useState("");
  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    department: "Operations",
    role: "Employee" as TeamMemberRecord["role"],
    attendance: "present" as TeamMemberRecord["attendance"],
    location: "HQ - Floor 2",
  });
  const { orderedItems: preferredMembers, pinnedIds, togglePin, move } = useListPreferences(
    `crm-team-preferences-${role}`,
    localMembers,
    (member) => String(member.id),
  );

  useEffect(() => {
    const savedMembers = readStoredJSON<TeamMemberRecord[]>(`crm-team-members-${role}`, []);
    setLocalMembers(savedMembers.length ? savedMembers : members);

    setMemberNotes(readStoredJSON<Record<number, string>>(`crm-team-notes-${role}`, {}));
  }, [members, role]);

  useEffect(() => {
    if (localMembers.length) {
      writeStoredJSON(`crm-team-members-${role}`, localMembers);
    }
  }, [localMembers, role]);

  useEffect(() => {
    writeStoredJSON(`crm-team-notes-${role}`, memberNotes);
  }, [memberNotes, role]);

  const filtered = useMemo(() => {
    return preferredMembers.filter((member) =>
      `${member.name} ${member.department} ${member.email}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [preferredMembers, search]);

  const selectedMember = useMemo(() => {
    return filtered.find((member) => member.id === selectedId) ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  const summary = useMemo(() => {
    return {
      active: localMembers.filter((member) => member.status === "active").length,
      admins: localMembers.filter((member) => member.role === "Admin").length,
      remote: localMembers.filter((member) => member.attendance === "remote").length,
      absent: localMembers.filter((member) => member.attendance === "absent").length,
    };
  }, [localMembers]);

  const updateSelected = (updater: (member: TeamMemberRecord) => TeamMemberRecord) => {
    if (!selectedMember) return;
    setLocalMembers((current) => current.map((member) => (member.id === selectedMember.id ? updater(member) : member)));
  };

  const addMember = () => {
    if (!canEditTeam) return;
    if (!newMember.name.trim() || !newMember.email.trim()) return;

    const nextMember: TeamMemberRecord = {
      id: Date.now(),
      name: newMember.name.trim(),
      email: newMember.email.trim(),
      role: newMember.role,
      status: "pending",
      avatar: newMember.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      department: newMember.department.trim() || "Operations",
      attendance: newMember.attendance,
      checkIn: newMember.attendance === "absent" ? "-" : "9:00 AM",
      location: newMember.location.trim() || "HQ - Floor 2",
      workload: 40,
    };

    setLocalMembers((current) => [nextMember, ...current]);
    setSelectedId(nextMember.id);
    setShowAddForm(false);
    setNewMember({
      name: "",
      email: "",
      department: "Operations",
      role: "Employee",
      attendance: "present",
      location: "HQ - Floor 2",
    });
  };

  const saveNote = () => {
    if (!selectedMember || !noteDraft.trim() || !canEditTeam) return;
    setMemberNotes((current) => ({
      ...current,
      [selectedMember.id]: noteDraft.trim(),
    }));
    setNoteDraft("");
  };

  const actionSets = {
    admin: [
      {
        label: "Promote",
        onClick: () => updateSelected((member) => ({ ...member, role: "Admin", status: "active" })),
        className: "border-border/70 bg-secondary/20 text-foreground hover:border-border",
      },
      {
        label: "Reset Access",
        onClick: () => updateSelected((member) => ({ ...member, status: "active" })),
        className: "border-border/70 bg-secondary/20 text-foreground hover:border-border",
      },
      {
        label: "Suspend",
        onClick: () => updateSelected((member) => ({ ...member, status: "pending" })),
        className: "border-warning/25 bg-warning/10 text-foreground hover:border-warning/40",
      },
      {
        label: "Terminate",
        onClick: () => updateSelected((member) => ({ ...member, status: "rejected" })),
        className: "border-destructive/20 bg-destructive/10 text-foreground hover:border-destructive/40",
      },
    ],
    manager: [
      {
        label: "Reset Access",
        onClick: () => updateSelected((member) => ({ ...member, status: "active" })),
        className: "border-border/70 bg-secondary/20 text-foreground hover:border-border",
      },
      {
        label: "Suspend",
        onClick: () => updateSelected((member) => ({ ...member, status: "pending" })),
        className: "border-warning/25 bg-warning/10 text-foreground hover:border-warning/40",
      },
    ],
    employee: [],
    client: [],
  } as const;

  const visibleActions = actionSets[role];

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Team Operations
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Team</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Clean admin controls for people, access, attendance, and status changes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => canEditTeam && setShowAddForm((current) => !current)}
            disabled={!canEditTeam}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105",
              canEditTeam ? "bg-primary" : "cursor-not-allowed bg-primary/40",
            )}
          >
            <UserPlus className="h-4 w-4" />
            Add Member
          </button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Active", value: summary.active, icon: BadgeCheck },
            { label: "Admins", value: summary.admins, icon: Shield },
            { label: "Remote Today", value: summary.remote, icon: UserRoundCheck },
            { label: "Absent", value: summary.absent, icon: AlertTriangle },
          ].map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-border/70 bg-secondary/20 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <item.icon className="h-5 w-5" />
              </div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {showAddForm && canEditTeam && (
        <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Add team member</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <input
              value={newMember.name}
              onChange={(event) => setNewMember((current) => ({ ...current, name: event.target.value }))}
              placeholder="Full name"
              className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={newMember.email}
              onChange={(event) => setNewMember((current) => ({ ...current, email: event.target.value }))}
              placeholder="Email"
              className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <input
              value={newMember.department}
              onChange={(event) => setNewMember((current) => ({ ...current, department: event.target.value }))}
              placeholder="Department"
              className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
            <select
              value={newMember.role}
              onChange={(event) => setNewMember((current) => ({ ...current, role: event.target.value as TeamMemberRecord["role"] }))}
              className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option>Employee</option>
              <option>Manager</option>
              <option>Admin</option>
            </select>
            <select
              value={newMember.attendance}
              onChange={(event) => setNewMember((current) => ({ ...current, attendance: event.target.value as TeamMemberRecord["attendance"] }))}
              className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="remote">Remote</option>
              <option value="absent">Absent</option>
            </select>
            <input
              value={newMember.location}
              onChange={(event) => setNewMember((current) => ({ ...current, location: event.target.value }))}
              placeholder="Location"
              className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setShowAddForm(false)} className="rounded-2xl border border-border/70 bg-secondary/30 px-4 py-2 text-sm font-semibold text-foreground">
              Cancel
            </button>
            <button type="button" onClick={addMember} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Add
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-card">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search team members..."
            className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-3">
          {filtered.map((member) => {
            const isSelected = selectedMember?.id === member.id;
            return (
              <button
                key={member.id}
                type="button"
                draggable
                onDragStart={() => setDraggedMemberId(String(member.id))}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedMemberId) move(draggedMemberId, String(member.id));
                  setDraggedMemberId(null);
                }}
                onDragEnd={() => setDraggedMemberId(null)}
                onClick={() => setSelectedId(member.id)}
                className={cn(
                  "w-full rounded-[1.5rem] border p-5 text-left shadow-card transition",
                  isSelected ? "border-primary bg-primary/[0.05]" : "border-border/70 bg-card/90 hover:border-border",
                )}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        togglePin(String(member.id));
                      }}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-2xl border transition",
                        pinnedIds.includes(String(member.id))
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/70 bg-secondary/25 text-muted-foreground hover:text-foreground",
                      )}
                      aria-label="Pin member"
                    >
                      <Pin className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        move(String(member.id), filtered[Math.max(0, filtered.indexOf(member) - 1)]?.id?.toString() ?? String(member.id));
                      }}
                      className="rounded-lg border border-border/70 bg-secondary/25 p-1 text-muted-foreground transition hover:text-foreground"
                      aria-label="Move member"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/55 font-display text-lg font-semibold text-foreground">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="font-display text-lg font-semibold text-foreground">{member.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {pinnedIds.includes(String(member.id)) && (
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                        Pinned
                      </span>
                    )}
                    <StatusBadge status={member.status} />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", roleTone[member.role])}>{member.role}</span>
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold capitalize", attendanceTone[member.attendance])}>
                    {member.attendance}
                  </span>
                  <span className="rounded-full border border-border/70 bg-secondary/20 px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {member.department}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Member Details</p>
            </div>
            {selectedMember ? (
              <div className="space-y-4">
                <div>
                  <p className="font-display text-xl font-semibold text-foreground">{selectedMember.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedMember.department}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Attendance</p>
                    <p className="mt-1 text-sm font-semibold text-foreground capitalize">{selectedMember.attendance}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Check-in</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{selectedMember.checkIn}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Location</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{selectedMember.location}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Workload</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{selectedMember.workload}%</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold text-foreground">Notes / Why</p>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {memberNotes[selectedMember.id] ?? "No note added yet. Add why this member needs follow-up, approval, or a role update."}
                  </p>
                  {canEditTeam && (
                    <div className="mt-4 space-y-2">
                      <textarea
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Add a note or reason..."
                        rows={3}
                        className="w-full rounded-2xl border border-border/70 bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <div className="flex justify-end">
                        <button type="button" onClick={saveNote} className="rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                          Save note
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a team member to view admin actions.</p>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Admin Actions</p>
            </div>
            {visibleActions.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleActions.map((action) => (
                  <button
                    key={action.label}
                    type="button"
                    onClick={action.onClick}
                    disabled={!canEditTeam}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                      action.className,
                      !canEditTeam && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
                Your role has read-only access here. Backend permissions can enable actions later without changing the layout.
              </div>
            )}
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Keep destructive actions here so they stay visible, deliberate, and separate from the member list. Admin-only destructive actions remain disabled for other roles.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
