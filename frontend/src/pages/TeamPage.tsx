import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, Clock3, FileText, GripVertical, Pin, Search, Shield, UserPlus, UserRoundCheck } from "lucide-react";
import { toast } from "sonner";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import StatusBadge from "@/components/shared/StatusBadge";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useTeamMembers, crmKeys } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { PrivacyValue } from "@/components/shared/PrivacyValue";
import { useListPreferences } from "@/hooks/use-list-preferences";
import { normalizeTeamMember } from "@/lib/team-roster";
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

const defaultMemberDetails: Pick<
  TeamMemberRecord,
  "team" | "designation" | "manager" | "workingHours" | "officeLocation" | "timeZone" | "baseSalary" | "allowances" | "deductions" | "paymentMode"
> = {
  team: "",
  designation: "",
  manager: "",
  workingHours: "",
  officeLocation: "",
  timeZone: "",
  baseSalary: 0,
  allowances: 0,
  deductions: 0,
  paymentMode: "bank-transfer",
};

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString()}`;
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(baseIso: string, days: number) {
  const date = new Date(`${baseIso}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysRemaining(targetIso?: string | null) {
  if (!targetIso) return null;
  const target = new Date(`${targetIso}T00:00:00`).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatIsoDate(iso?: string | null) {
  if (!iso) return "Not set";
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function normalizeMember(member: TeamMemberRecord): TeamMemberRecord {
  return normalizeTeamMember({
    ...member,
    team: member.team ?? defaultMemberDetails.team,
    designation: member.designation ?? defaultMemberDetails.designation,
    manager: member.manager ?? defaultMemberDetails.manager,
    workingHours: member.workingHours ?? defaultMemberDetails.workingHours,
    officeLocation: member.officeLocation ?? defaultMemberDetails.officeLocation,
    timeZone: member.timeZone ?? defaultMemberDetails.timeZone,
    baseSalary: member.baseSalary ?? defaultMemberDetails.baseSalary,
    allowances: member.allowances ?? defaultMemberDetails.allowances,
    deductions: member.deductions ?? defaultMemberDetails.deductions,
    paymentMode: member.paymentMode ?? defaultMemberDetails.paymentMode,
  });
}

export default function TeamPage() {
  const { data: members = [], isLoading, error: teamError, refetch: refetchTeamMembers } = useTeamMembers();
  const { role } = useTheme();
  const queryClient = useQueryClient();
  const canEditTeam = role === "admin" || role === "manager";
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const normalizedMembers = useMemo(() => members.map(normalizeMember), [members]);
  
  const [draggedMemberId, setDraggedMemberId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const PAGE_SIZE = 6;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [noteDraft, setNoteDraft] = useState("");
  
  const updateMemberMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: Partial<TeamMemberRecord> }) => 
      crmService.updateTeamMember(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
      toast.success("Team member updated");
    },
    onError: () => toast.error("Failed to update team member"),
  });

  const createMemberMutation = useMutation({
    mutationFn: (member: Omit<TeamMemberRecord, "id">) => 
      crmService.createTeamMember(member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
      toast.success("Team member added");
      setShowAddForm(false);
    },
    onError: () => toast.error("Failed to add team member"),
  });

  const [newMember, setNewMember] = useState({
    name: "",
    email: "",
    department: "",
    team: "",
    designation: "",
    manager: "",
    workingHours: "",
    officeLocation: "",
    timeZone: "",
    baseSalary: "0",
    allowances: "0",
    deductions: "0",
    paymentMode: "bank-transfer" as TeamMemberRecord["paymentMode"],
    role: "Employee" as TeamMemberRecord["role"],
    attendance: "present" as TeamMemberRecord["attendance"],
    location: "",
  });

  const getMemberId = useCallback((member: TeamMemberRecord) => String(member.id), []);

  const { orderedItems: preferredMembers, pinnedIds, togglePin, move } = useListPreferences(
    `crm-team-preferences-${role}`,
    normalizedMembers,
    getMemberId,
  );

  const filtered = useMemo(() => {
    return preferredMembers.filter((member) =>
      `${member.name} ${member.department} ${member.email}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [preferredMembers, search]);

  // Reset pagination when search changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search]);

  const selectedMember = useMemo(() => {
    return filtered.find((member) => member.id === selectedId) ?? filtered[0] ?? null;
  }, [filtered, selectedId]);

  useEffect(() => {
    setShowMoreDetails(false);
  }, [selectedMember?.id]);

  const summary = useMemo(() => {
    return {
      active: normalizedMembers.filter((member) => member.status === "active").length,
      admins: normalizedMembers.filter((member) => member.role === "Admin").length,
      remote: normalizedMembers.filter((member) => member.attendance === "remote").length,
      absent: normalizedMembers.filter((member) => member.attendance === "absent").length,
    };
  }, [normalizedMembers]);

  const updateSelected = async (patch: Partial<TeamMemberRecord>) => {
    if (!selectedMember) return;
    updateMemberMutation.mutate({ id: selectedMember.id, patch });
  };

  const canTerminateSelected = Boolean(
    selectedMember &&
      selectedMember.suspendedAt &&
      selectedMember.warningCount !== undefined &&
      selectedMember.warningCount >= 2 &&
      selectedMember.handoverCompletedAt &&
      (daysRemaining(selectedMember.terminationEligibleAt) ?? 0) <= 0,
  );

  const canMarkHandover = Boolean(
    selectedMember &&
      selectedMember.suspendedAt &&
      !selectedMember.handoverCompletedAt &&
      !selectedMember.terminatedAt,
  );

  const separationCountdown = daysRemaining(selectedMember?.terminationEligibleAt);

  const addMember = async () => {
    if (!canEditTeam) return;
    if (!newMember.name.trim() || !newMember.email.trim()) return;

    const payload: Omit<TeamMemberRecord, "id"> = normalizeMember({
      id: 0,
      name: newMember.name.trim(),
      email: newMember.email.trim(),
      role: newMember.role,
      status: "pending",
      avatar: newMember.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase(),
      department: newMember.department.trim() || "Operations",
      team: newMember.team.trim() || "Platform Ops",
      designation: newMember.designation.trim() || "Employee",
      manager: newMember.manager.trim() || "Team Lead",
      workingHours: newMember.workingHours.trim() || "09:00 - 18:00",
      officeLocation: newMember.officeLocation.trim() || "HQ - Floor 2",
      timeZone: newMember.timeZone.trim() || "Asia/Calcutta",
      baseSalary: Number(newMember.baseSalary) || 60000,
      allowances: Number(newMember.allowances) || 10000,
      deductions: Number(newMember.deductions) || 2500,
      paymentMode: newMember.paymentMode,
      attendance: newMember.attendance,
      checkIn: newMember.attendance === "absent" ? "-" : "9:00 AM",
      location: newMember.location.trim() || "HQ - Floor 2",
      workload: 40,
    });

    createMemberMutation.mutate(payload);
    
    setNewMember({
      name: "",
      email: "",
      department: "Operations",
      team: "Platform Ops",
      designation: "Employee",
      manager: "Team Lead",
      workingHours: "09:00 - 18:00",
      officeLocation: "HQ - Floor 2",
      timeZone: "Asia/Calcutta",
      baseSalary: "60000",
      allowances: "10000",
      deductions: "2500",
      paymentMode: "bank-transfer",
      role: "Employee",
      attendance: "present",
      location: "HQ-Floor 2",
    });
  };

  const saveNote = async () => {
    if (!selectedMember || !noteDraft.trim() || !canEditTeam) return;

    const currentNote = selectedMember.separationNote ?? "";
    const updatedNote = currentNote ? `${currentNote}\n\n[${new Date().toLocaleDateString()}] ${noteDraft.trim()}` : noteDraft.trim();

    updateSelected({ separationNote: updatedNote });
    setNoteDraft("");
  };

  const actionSets = {
    admin: [
      {
        label: "Warning",
        onClick: () =>
          updateSelected({
            warningCount: (selectedMember?.warningCount ?? 0) + 1,
            separationNote: selectedMember?.separationNote || "Warning issued. Review performance and conduct.",
          }),
        className: "border-warning/25 bg-warning/10 text-foreground hover:border-warning/40",
      },
      {
        label: "Suspend",
        onClick: () => {
          const today = getTodayIso();
          updateSelected({
            status: "pending",
            suspendedAt: today,
            terminationEligibleAt: addDaysIso(today, 7),
            handoverCompletedAt: null,
            separationNote: "Suspended for review before any termination decision.",
          });
        },
        className: "border-warning/25 bg-warning/10 text-foreground hover:border-warning/40",
      },
      {
        label: "Mark Handover",
        onClick: () =>
          updateSelected({
            handoverCompletedAt: getTodayIso(),
            separationNote: "Work handover completed and recorded for review.",
          }),
        className: "border-border/70 bg-secondary/20 text-foreground hover:border-border",
      },
      {
        label: "Promote",
        onClick: () => updateSelected({ role: "Admin", status: "active" }),
        className: "border-border/70 bg-secondary/20 text-foreground hover:border-border",
      },
      {
        label: "Reset Access",
        onClick: () =>
          updateSelected({
            status: "active",
            suspendedAt: null,
            terminationEligibleAt: null,
            handoverCompletedAt: null,
            terminatedAt: null,
            separationNote: "Access restored.",
          }),
        className: "border-border/70 bg-secondary/20 text-foreground hover:border-border",
      },
      {
        label: "Terminate",
        onClick: () =>
          canTerminateSelected &&
          updateSelected({
            status: "rejected",
            terminatedAt: getTodayIso(),
            separationNote: "Termination approved after suspension and warning review.",
          }),
        className: canTerminateSelected
          ? "border-destructive/20 bg-destructive/10 text-foreground hover:border-destructive/40"
          : "border-border/70 bg-secondary/20 text-muted-foreground cursor-not-allowed",
      },
    ],
    manager: [
      {
        label: "Warning",
        onClick: () =>
          updateSelected({
            warningCount: (selectedMember?.warningCount ?? 0) + 1,
            separationNote: selectedMember?.separationNote || "Warning issued by manager.",
          }),
        className: "border-warning/25 bg-warning/10 text-foreground hover:border-warning/40",
      },
      {
        label: "Suspend",
        onClick: () => {
          const today = getTodayIso();
          updateSelected({
            status: "pending",
            suspendedAt: today,
            terminationEligibleAt: addDaysIso(today, 7),
            handoverCompletedAt: null,
            separationNote: "Manager suspension started. HR review required for termination.",
          });
        },
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
  if (teamError) {
    return (
      <ErrorFallback
        title="Team data failed to load"
        error={teamError}
        description="The employee roster could not be loaded. Retry to fetch the latest team records."
        onRetry={() => refetchTeamMembers()}
        retryLabel="Retry team"
      />
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
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
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
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
          <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            Fill the same profile details that power the employee cards and Settings profile, so the new member appears consistently across the app.
          </p>
          <div className="grid gap-4">
            <div className="rounded-[1.35rem] border border-border/70 bg-secondary/20 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Identity</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
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
                <input
                  value={newMember.team}
                  onChange={(event) => setNewMember((current) => ({ ...current, team: event.target.value }))}
                  placeholder="Team"
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-secondary/20 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Work details</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input
                  value={newMember.designation}
                  onChange={(event) => setNewMember((current) => ({ ...current, designation: event.target.value }))}
                  placeholder="Designation"
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={newMember.manager}
                  onChange={(event) => setNewMember((current) => ({ ...current, manager: event.target.value }))}
                  placeholder="Manager"
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={newMember.workingHours}
                  onChange={(event) => setNewMember((current) => ({ ...current, workingHours: event.target.value }))}
                  placeholder="Working hours"
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={newMember.timeZone}
                  onChange={(event) => setNewMember((current) => ({ ...current, timeZone: event.target.value }))}
                  placeholder="Time zone"
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-secondary/20 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Compensation</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <input
                  value={newMember.baseSalary}
                  onChange={(event) => setNewMember((current) => ({ ...current, baseSalary: event.target.value }))}
                  placeholder="Base salary"
                  inputMode="numeric"
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={newMember.allowances}
                  onChange={(event) => setNewMember((current) => ({ ...current, allowances: event.target.value }))}
                  placeholder="Allowances"
                  inputMode="numeric"
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <input
                  value={newMember.deductions}
                  onChange={(event) => setNewMember((current) => ({ ...current, deductions: event.target.value }))}
                  placeholder="Deductions"
                  inputMode="numeric"
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={newMember.paymentMode}
                  onChange={(event) => setNewMember((current) => ({ ...current, paymentMode: event.target.value as TeamMemberRecord["paymentMode"] }))}
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="bank-transfer">Bank transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash / hand salary</option>
                </select>
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-secondary/20 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Assignment</p>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <input
                  value={newMember.officeLocation}
                  onChange={(event) => setNewMember((current) => ({ ...current, officeLocation: event.target.value }))}
                  placeholder="Office location"
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <select
                  value={newMember.role}
                  onChange={(event) => setNewMember((current) => ({ ...current, role: event.target.value as TeamMemberRecord["role"] }))}
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option>Employee</option>
                  <option>Manager</option>
                  <option>Admin</option>
                </select>
                <select
                  value={newMember.attendance}
                  onChange={(event) => setNewMember((current) => ({ ...current, attendance: event.target.value as TeamMemberRecord["attendance"] }))}
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="remote">Remote</option>
                  <option value="absent">Absent</option>
                </select>
                <input
                  value={newMember.location}
                  onChange={(event) => setNewMember((current) => ({ ...current, location: event.target.value }))}
                  placeholder="Current location"
                  className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
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
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-secondary/10 p-10 text-center">
              <UserPlus className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No team members yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {search ? "No members match your search." : "Add your first team member using the button above."}
              </p>
            </div>
          )}
          {filtered.slice(0, visibleCount).map((member) => {
            const isSelected = selectedMember?.id === member.id;
            return (
              <div
                key={member.id}
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
                  "w-full rounded-[1.5rem] border p-5 text-left shadow-card transition cursor-pointer",
                  isSelected ? "border-primary bg-primary/[0.05]" : "border-border/70 bg-card/90 hover:border-border",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); togglePin(String(member.id)); }}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-xl border transition",
                        pinnedIds.includes(String(member.id))
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/70 bg-secondary/25 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/55 font-display text-lg font-semibold text-foreground">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="font-display text-base font-semibold text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.designation} · {member.department}</p>
                      <p className="text-xs text-muted-foreground/60">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase", roleTone[member.role])}>
                      {member.role}
                    </span>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize", attendanceTone[member.attendance])}>
                      {member.attendance}
                    </span>
                  </div>
                </div>

                {/* Workload bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Workload</span>
                    <span>{member.workload}%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary/40">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        member.workload >= 80 ? "bg-destructive/70" :
                        member.workload >= 60 ? "bg-warning/70" : "bg-success/70"
                      )}
                      style={{ width: `${member.workload}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Show More / Show Less */}
          <ShowMoreButton
            total={filtered.length}
            visible={visibleCount}
            pageSize={PAGE_SIZE}
            onShowMore={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, filtered.length))}
            onShowLess={() => setVisibleCount(PAGE_SIZE)}
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Clock3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Employee Profile</p>
            </div>
            {selectedMember ? (
              <div className="space-y-4">
                {/* Header */}
                <div className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/5 to-secondary/20 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-background/70 font-display text-2xl font-bold text-foreground shadow-sm">
                      {selectedMember.avatar}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-xl font-semibold text-foreground">{selectedMember.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedMember.designation}</p>
                      <p className="text-xs text-muted-foreground/70">{selectedMember.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase", roleTone[selectedMember.role])}>
                          {selectedMember.role}
                        </span>
                        <span className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase",
                          selectedMember.terminatedAt ? "border-destructive/25 bg-destructive/10 text-destructive" :
                          selectedMember.suspendedAt ? "border-warning/25 bg-warning/10 text-warning" :
                          "border-success/25 bg-success/10 text-success"
                        )}>
                          {selectedMember.terminatedAt ? "Terminated" : selectedMember.suspendedAt ? "Suspended" : selectedMember.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Key stats */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Department", value: selectedMember.department },
                    { label: "Team", value: selectedMember.team },
                    { label: "Manager", value: selectedMember.manager },
                    { label: "Location", value: selectedMember.officeLocation },
                    { label: "Working Hours", value: selectedMember.workingHours },
                    { label: "Timezone", value: selectedMember.timeZone },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-xl border border-border/70 bg-secondary/20 p-3">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
                      <p className="mt-0.5 text-xs font-semibold text-foreground truncate">{value || "—"}</p>
                    </div>
                  ))}
                </div>

                {/* Attendance + Workload */}
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Today's Status</p>
                    <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize", attendanceTone[selectedMember.attendance])}>
                      {selectedMember.attendance}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" />
                    <span>Check-in: <strong className="text-foreground">{selectedMember.checkIn || "—"}</strong></span>
                    <span>·</span>
                    <span>{selectedMember.location || "—"}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Workload</span>
                      <span className={cn(
                        "font-semibold",
                        selectedMember.workload >= 80 ? "text-destructive" :
                        selectedMember.workload >= 60 ? "text-warning" : "text-success"
                      )}>{selectedMember.workload}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/40">
                      <div
                        className={cn("h-full rounded-full transition-all",
                          selectedMember.workload >= 80 ? "bg-destructive/70" :
                          selectedMember.workload >= 60 ? "bg-warning/70" : "bg-success/70"
                        )}
                        style={{ width: `${selectedMember.workload}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Salary */}
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                  <p className="text-xs font-semibold text-foreground mb-3">Compensation</p>
                  <div className="space-y-2 text-xs">
                    {[
                      { label: "Base Salary", value: formatCurrency(selectedMember.baseSalary) },
                      { label: "Allowances", value: `+${formatCurrency(selectedMember.allowances)}` },
                      { label: "Deductions", value: `-${formatCurrency(selectedMember.deductions)}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-semibold text-foreground"><PrivacyValue value={value} /></span>
                      </div>
                    ))}
                    <div className="border-t border-border/50 pt-2 flex justify-between">
                      <span className="font-semibold text-foreground">Net Pay</span>
                      <span className="font-bold text-success"><PrivacyValue value={formatCurrency(selectedMember.baseSalary + selectedMember.allowances - selectedMember.deductions)} /></span>
                    </div>
                  </div>
                </div>

                {/* Warnings / HR notes */}
                {((selectedMember.warningCount ?? 0) > 0 || selectedMember.separationNote) && (
                  <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
                    <p className="text-xs font-semibold text-warning mb-2">HR Flags</p>
                    {(selectedMember.warningCount ?? 0) > 0 && (
                      <p className="text-xs text-muted-foreground">{selectedMember.warningCount} warning{(selectedMember.warningCount ?? 0) > 1 ? "s" : ""} on record</p>
                    )}
                    {selectedMember.separationNote && (
                      <p className="text-xs text-muted-foreground mt-1">{selectedMember.separationNote}</p>
                    )}
                  </div>
                )}
                {/* Notes */}
                {canEditTeam && (
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold text-foreground">HR Note</p>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {selectedMember.separationNote ?? "No note yet."}
                    </p>
                    <div className="flex gap-2">
                      <input
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveNote()}
                        placeholder="Add a note... (Enter to save)"
                        className="flex-1 h-9 rounded-xl border border-border/70 bg-background/55 px-3 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                      />
                      <button onClick={saveNote} className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Save</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Select a team member to view their profile.</p>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Admin Actions</p>
            </div>
            {visibleActions.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {visibleActions.map((action) => {
                  const isTerminateAction = action.label === "Terminate";
                  const isHandoverAction = action.label === "Mark Handover";
                  const disabled =
                    !canEditTeam ||
                    !selectedMember ||
                    Boolean(selectedMember.terminatedAt) ||
                    (isTerminateAction && !canTerminateSelected) ||
                    (isHandoverAction && !canMarkHandover);

                  return (
                    <button
                      key={action.label}
                      type="button"
                      onClick={action.onClick}
                      disabled={disabled}
                      className={cn(
                        "rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                        action.className,
                        disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      {action.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 text-sm leading-6 text-muted-foreground">
                Your role has read-only access here.
              </div>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
