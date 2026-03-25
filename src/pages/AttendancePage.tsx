import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, MapPin, Monitor, RefreshCw, UserRoundCheck, UserRoundX } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import StatusBadge from "@/components/shared/StatusBadge";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useTeamMembers } from "@/hooks/use-crm-data";
import { readStoredJSON } from "@/lib/preferences";
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
  const { role } = useTheme();
  const { data: teamMembers = [], isLoading } = useTeamMembers();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    const buckets = ["admin", "manager", "employee"] as const;
    const localMembers = buckets.flatMap((bucket) => {
      return readStoredJSON<TeamMemberRecord[]>(`crm-team-members-${bucket}`, []);
    });

    const combined = [...localMembers, ...teamMembers.filter((member) => !localMembers.some((local) => local.id === member.id))];
    const nextRecords = combined.map(buildAttendanceRecord);
    setRecords(nextRecords);
    setSelectedId((current) => current ?? nextRecords[0]?.id ?? null);
  }, [teamMembers]);

  const summary = useMemo(() => {
    return {
      present: records.filter((member) => member.status === "present").length,
      late: records.filter((member) => member.status === "late").length,
      remote: records.filter((member) => member.status === "remote").length,
      absent: records.filter((member) => member.status === "absent").length,
    };
  }, [records]);

  const selfRecord = useMemo(() => {
    return records.find((member) => member.role === "Employee") ?? records[0] ?? null;
  }, [records]);

  const selectedRecord = useMemo(() => {
    return records.find((member) => member.id === selectedId) ?? records[0] ?? null;
  }, [records, selectedId]);

  const availableTeamOptions = useMemo(() => {
    return records.map((member) => ({
      id: member.id,
      label: `${member.name} · ${member.department}`,
    }));
  }, [records]);

  const updateRecord = (id: number, status: AttendanceStatus, note?: string) => {
    setRecords((current) =>
      current.map((member) =>
        member.id === id
          ? {
              ...member,
              status,
              note: note ?? member.note,
              checkIn: status === "absent" ? "-" : member.checkIn === "-" ? "9:00 AM" : member.checkIn,
              location: status === "remote" ? "Remote" : member.location === "No check-in" ? "HQ - Floor 2" : member.location,
            }
          : member,
      ),
    );
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (role === "employee") {
    if (!selfRecord) {
      return <PageLoader />;
    }

    return (
      <div className="space-y-6">
        <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <UserRoundCheck className="h-3.5 w-3.5 text-primary" />
              My Attendance
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Today&apos;s check-in</h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Self-service attendance for employees. You can review your own status and update today&apos;s presence state.
            </p>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Status", value: selfRecord.status, icon: UserRoundCheck },
              { label: "Check-in", value: selfRecord.checkIn, icon: Clock3 },
              { label: "Location", value: selfRecord.location, icon: MapPin },
              { label: "Note", value: selfRecord.note, icon: AlertCircle },
            ].map((item) => (
              <div key={item.label} className="rounded-[1.25rem] border border-border/70 bg-secondary/20 p-4">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
                <p className={cn("mt-1 font-display text-2xl font-semibold text-foreground", item.label === "Status" && "capitalize")}>{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_0.82fr]">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Today</p>
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
                <p>Admin and manager controls stay hidden until the role changes or backend permissions arrive.</p>
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
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
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
            { label: "Present", value: summary.present, icon: UserRoundCheck },
            { label: "Late", value: summary.late, icon: Clock3 },
            { label: "Remote", value: summary.remote, icon: Monitor },
            { label: "Absent", value: summary.absent, icon: UserRoundX },
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

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          {records.map((member) => (
            <article
              key={member.id}
              onClick={() => setSelectedId(member.id)}
              className={cn(
                "cursor-pointer rounded-[1.5rem] border bg-card/90 p-5 shadow-card transition",
                selectedRecord?.id === member.id ? "border-primary bg-primary/[0.04]" : "border-border/70 hover:border-border",
              )}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">{member.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {member.role} · {member.department}
                  </p>
                </div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[member.status]}`}>
                  {member.status}
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Check-in</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{member.checkIn}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Location</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{member.location}</p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Note</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{member.note}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Attendance Rules</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Team controls</h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>Admins can review every employee in one place.</p>
              <p>Managers can supervise attendance without changing the page structure later.</p>
              <p>The same record shape can become a real backend clock-in workflow without redesigning the UI.</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Selected member</p>
            </div>
            <div className="mb-4">
              <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Available team</p>
              <select
                value={selectedRecord?.id ?? ""}
                onChange={(event) => setSelectedId(Number(event.target.value))}
                className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
