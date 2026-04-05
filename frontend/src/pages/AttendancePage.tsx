import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, MapPin, Monitor, RefreshCw, UserRoundCheck, UserRoundX } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import StatusBadge from "@/components/shared/StatusBadge";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/use-crm-data";
import { findTeamMemberByEmail, useSharedTeamMembers } from "@/lib/team-roster";
import type { AttendanceRecord, AttendanceStatus, TeamMemberRecord } from "@/types/crm";

function buildAttendanceRecord(member: TeamMemberRecord): AttendanceRecord {
  return {
    id: member.id,
    name: member.name,
    role: member.role,
    department: member.department,
    status: member.attendance,
    checkIn: member.checkIn,
    location: member.location,
    note:
      member.attendance === "absent"
        ? "Needs follow-up"
        : member.attendance === "late"
          ? "Late check-in"
          : member.attendance === "remote"
            ? "Remote today"
            : "On time",
  };
}

const statusTone: Record<string, string> = {
  present: "bg-success/12 text-foreground border-success/20",
  late: "bg-warning/14 text-foreground border-warning/20",
  remote: "bg-info/20 text-foreground border-info/25",
  absent: "bg-destructive/12 text-foreground border-destructive/20",
};

export default function AttendancePage() {
  const { user } = useAuth();
  const { role } = useTheme();
  const canManageAttendance = role === "admin" || role === "manager";
  const { data: teamMembers = [], isLoading, error: teamError, refetch: refetchTeamMembers } = useTeamMembers({ enabled: canManageAttendance });
  const sharedTeamMembers = useSharedTeamMembers();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(4);
  const PAGE_SIZE = 4;

  const handleRefresh = async () => {
    const start = Date.now();
    await refetchTeamMembers();
    const duration = Date.now() - start;
    if (duration < 600) await new Promise(r => setTimeout(r, 600 - duration));
  };

  useEffect(() => {
    const source: TeamMemberRecord[] = canManageAttendance ? teamMembers : [];
    const nextRecords = source.map(buildAttendanceRecord);
    setRecords(nextRecords);
    setSelectedId((current) => current ?? nextRecords[0]?.id ?? null);
  }, [canManageAttendance, teamMembers]);

  const summary = useMemo(() => {
    return {
      present: records.filter((member) => member.status === "present").length,
      late: records.filter((member) => member.status === "late").length,
      remote: records.filter((member) => member.status === "remote").length,
      absent: records.filter((member) => member.status === "absent").length,
    };
  }, [records]);

  const liveEmployeeRecord = useMemo(() => findTeamMemberByEmail(sharedTeamMembers, user?.email), [sharedTeamMembers, user?.email]);
  const selfRecord = useMemo(() => {
    if (role === "employee" && user) {
      return {
        id: Number(liveEmployeeRecord?.id ?? 0) || 0,
        name: liveEmployeeRecord?.name ?? user.name,
        role: liveEmployeeRecord?.role ?? "Employee",
        department: liveEmployeeRecord?.department ?? user.department,
        status: liveEmployeeRecord?.attendance ?? "present",
        checkIn: liveEmployeeRecord?.checkIn ?? "-",
        location: liveEmployeeRecord?.location ?? user.location,
        note:
          liveEmployeeRecord?.attendance === "absent"
            ? "Needs follow-up"
            : liveEmployeeRecord?.attendance === "late"
              ? "Late check-in"
              : liveEmployeeRecord?.attendance === "remote"
                ? "Remote today"
                : "On time",
      };
    }
    return records.find((member) => member.name === user?.name) ?? records[0] ?? null;
  }, [liveEmployeeRecord, records, role, user]);

  const selectedRecord = useMemo(() => {
    return records.find((member) => member.id === selectedId) ?? records[0] ?? null;
  }, [records, selectedId]);

  const availableTeamOptions = useMemo(() => {
    return records.map((member) => ({
      id: member.id,
      label: `${member.name} · ${member.department}`,
    }));
  }, [records]);

  const updateRecord = async (id: number, status: AttendanceStatus, note?: string) => {
    const member = records.find((m) => m.id === id);
    if (!member) return;

    const data = {
      status,
      checkIn: status === "absent" ? "-" : member.checkIn === "-" ? "9:00 AM" : member.checkIn,
      location: status === "remote" ? "Remote" : member.location === "No check-in" ? "HQ - Floor 2" : member.location,
    };

    // Optimistic UI update
    setRecords((current) =>
      current.map((m) =>
        m.id === id ? { ...m, ...data, note: note ?? m.note } : m
      )
    );

    try {
      await crmService.updateAttendance(id, data);
      await refetchTeamMembers(); // Update the shared source of truth
    } catch (error) {
      console.error("Failed to update attendance:", error);
      // Revert or show error could be added here
    }
  };

  if (canManageAttendance && isLoading) {
    return <PageLoader />;
  }
  if (canManageAttendance && teamError) {
    return (
      <ErrorFallback
        title="Attendance data failed to load"
        error={teamError}
        description="We could not fetch attendance records. Retry to refresh the team attendance view."
        onRetry={() => refetchTeamMembers()}
        retryLabel="Retry attendance"
      />
    );
  }

  if (role === "employee") {
    if (!selfRecord) {
      return <PageLoader />;
    }

    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              <UserRoundCheck className="h-3.5 w-3.5 text-primary" />
              My Attendance
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Today&apos;s check-in</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Self-service attendance for employees. You can review your own status and update today&apos;s presence state.
            </p>
            {liveEmployeeRecord && (
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                  liveEmployeeRecord.terminatedAt
                    ? "border-destructive/25 bg-destructive/10 text-destructive"
                    : liveEmployeeRecord.suspendedAt
                      ? "border-warning/25 bg-warning/10 text-warning"
                      : "border-success/25 bg-success/10 text-success",
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {liveEmployeeRecord.terminatedAt ? "Employment terminated" : liveEmployeeRecord.suspendedAt ? "Employment suspended" : "Employment active"}
              </div>
            )}
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Status", value: selfRecord.status, icon: UserRoundCheck },
              { label: "Check-in", value: selfRecord.checkIn, icon: Clock3 },
              { label: "Location", value: selfRecord.location, icon: MapPin },
              { label: "Note", value: selfRecord.note, icon: AlertCircle },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-border bg-secondary p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className={cn("mt-1 font-display text-2xl font-semibold text-foreground", item.label === "Status" && "capitalize")}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Today</p>
                <h2 className="mt-1 font-display text-xl font-semibold text-foreground">{selfRecord.name}</h2>
              </div>
              <StatusBadge status={selfRecord.status} />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <button
                onClick={() => updateRecord(selfRecord.id, "present", "Checked in today")}
                className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-border"
              >
                <CheckCircle2 className="mx-auto mb-2 h-4 w-4 text-success" />
                Check in
              </button>
              <button
                onClick={() => updateRecord(selfRecord.id, "remote", "Working remotely today")}
                className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-border"
              >
                <Monitor className="mx-auto mb-2 h-4 w-4 text-info" />
                Mark remote
              </button>
              <button
                onClick={() => updateRecord(selfRecord.id, "late", "Correction requested")}
                className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm font-semibold text-foreground transition hover:border-warning/40"
              >
                <RefreshCw className="mx-auto mb-2 h-4 w-4 text-warning" />
                Request correction
              </button>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <div className="mb-4 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Today summary</p>
              </div>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>Employees can manage only their own attendance view in the frontend.</p>
                <p>Admin and manager controls stay hidden until the role changes or additional permissions arrive.</p>
                <p>Today&apos;s status updates stay separate from team-level attendance management.</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <UserRoundCheck className="h-3.5 w-3.5 text-primary" />
            Attendance
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Daily attendance</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Clean check-in visibility for admins and managers, pulled from the available team roster instead of fixed demo records.
            </p>
          </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Present", value: summary.present, icon: UserRoundCheck, color: "text-success bg-success/10" },
            { label: "Late", value: summary.late, icon: Clock3, color: "text-warning bg-warning/10" },
            { label: "Remote", value: summary.remote, icon: Monitor, color: "text-info bg-info/10" },
            { label: "Absent", value: summary.absent, icon: UserRoundX, color: "text-destructive bg-destructive/10" },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.25rem] border border-border/70 bg-secondary/20 p-4 flex items-center gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl flex-shrink-0", item.color)}>
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className="font-display text-2xl font-bold text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {records.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border/60 bg-secondary/10 p-10 text-center">
              <UserRoundCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
              <p className="font-semibold text-foreground">No attendance records</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add team members at People → Team to see attendance here.
              </p>
            </div>
          )}
          {records.slice(0, visibleCount).map((member) => (
            <article
              key={member.id}
              onClick={() => setSelectedId(member.id)}
              className={cn(
                "cursor-pointer rounded-[1.5rem] border bg-card/90 p-4 shadow-card transition",
                selectedRecord?.id === member.id ? "border-primary bg-primary/[0.04]" : "border-border/70 hover:border-border",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary/55 font-display text-sm font-bold text-foreground">
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.role} · {member.department}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold capitalize", statusTone[member.status])}>
                    {member.status}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{member.checkIn} · {member.location}</span>
                </div>
              </div>
            </article>
          ))}
          <ShowMoreButton
            total={records.length}
            visible={visibleCount}
            pageSize={PAGE_SIZE}
            onShowMore={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, records.length))}
            onShowLess={() => setVisibleCount(PAGE_SIZE)}
          />
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Attendance Rules</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Team controls</h2>
            </div>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>Admins can review every employee in one place.</p>
                <p>Managers can supervise attendance without changing the page structure later.</p>
                <p>The same record shape can become a real clock-in workflow without redesigning the UI.</p>
              </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Selected member</p>
            </div>
            <div className="mb-4">
              <p className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">Available team</p>
              <select
                value={selectedRecord?.id ?? ""}
                onChange={(event) => setSelectedId(Number(event.target.value))}
                className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 px-4 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {availableTeamOptions.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.label}
                  </option>
                ))}
              </select>
            </div>
            {selectedRecord ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                  <p className="font-display text-lg font-semibold text-foreground">{selectedRecord.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedRecord.role} · {selectedRecord.department}
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button onClick={() => updateRecord(selectedRecord.id, "present", "Marked present by admin")} className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm font-semibold text-foreground">
                    Present
                  </button>
                  <button onClick={() => updateRecord(selectedRecord.id, "remote", "Remote approved by admin")} className="rounded-2xl border border-info/20 bg-info/15 px-4 py-3 text-sm font-semibold text-foreground">
                    Remote
                  </button>
                  <button onClick={() => updateRecord(selectedRecord.id, "late", "Late flag added")} className="rounded-2xl border border-warning/20 bg-warning/10 px-4 py-3 text-sm font-semibold text-foreground">
                    Late
                  </button>
                  <button onClick={() => updateRecord(selectedRecord.id, "absent", "Marked absent")} className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-foreground">
                    Absent
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/20 p-4 text-sm text-muted-foreground">
                Select a team member to manage attendance.
              </div>
            )}
            </div>
        </aside>
      </section>
    </div>
  );
}
