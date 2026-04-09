import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Plus, Settings, Trash2, UserPlus, Users, UsersRound, ShieldCheck, TrendingUp, Activity, Clock, BarChart3, Search, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { useTheme } from "@/contexts/ThemeContext";
import { useTeamMembers, useTeams, crmKeys } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import { TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { CreateTeamInput, TeamRecord } from "@/types/crm";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

export default function TeamsPage() {
  const { role } = useTheme();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: teams = [], isLoading: teamsLoading, error: teamsError, refetch: refetchTeams, isFetching: teamsFetching } = useTeams();
  const { data: members = [], isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useTeamMembers();

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin";

  const [editingTeam, setEditingTeam] = useState<TeamRecord | null>(null);
  const [assignSelections, setAssignSelections] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [perfFilter, setPerfFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const deferredSearch = useDeferredValue(search);

  const teamMetrics = useMemo(() => {
    return teams.map((team) => {
      const teamMembers = team.members;
      const presentCount = teamMembers.filter((m) => m.attendance === "present").length;
      const attendanceRate = teamMembers.length > 0 ? Math.round((presentCount / teamMembers.length) * 100) : 0;
      const avgWorkload = teamMembers.length > 0 ? Math.round(teamMembers.reduce((sum, m) => sum + (m.workload ?? 0), 0) / teamMembers.length) : 0;
      const performance = Math.round(attendanceRate * 0.4 + avgWorkload * 0.6);
      return { ...team, attendanceRate, avgWorkload, performance, memberCount: teamMembers.length };
    }).sort((a, b) => b.performance - a.performance);
  }, [teams]);

  const stats = useMemo(() => {
    const totalTeams = teams.length;
    const totalMembers = members.length;
    const unassigned = members.filter((m) => !m.team || m.team === "General").length;
    const activeTeams = teams.filter((t) => t.members.length > 0).length;
    return { totalTeams, totalMembers, unassigned, activeTeams };
  }, [teams, members]);

  const filteredTeams = useMemo(() => {
    let result = teamMetrics;
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.members.some((m) => m.name.toLowerCase().includes(q)),
      );
    }
    if (perfFilter !== "all") {
      result = result.filter((t) => {
        if (perfFilter === "high") return t.performance >= 80;
        if (perfFilter === "medium") return t.performance >= 60 && t.performance < 80;
        return t.performance < 60;
      });
    }
    return result;
  }, [teamMetrics, deferredSearch, perfFilter]);

  const handleRefresh = async () => {
    const start = Date.now();
    await Promise.all([refetchTeams(), refetchMembers()]);
    const duration = Date.now() - start;
    if (duration < 600) await new Promise((r) => setTimeout(r, 600 - duration));
  };

  const handleCreateTeam = async (data: CreateTeamInput) => {
    try {
      await crmService.createTeam(data);
      toast.success("Team created successfully");
      setCreateDialogOpen(false);
      await refetchTeams();
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
    } catch {
      toast.error("Failed to create team");
    }
  };

  const handleUpdateTeam = async (teamId: number, data: Partial<CreateTeamInput>) => {
    try {
      await crmService.updateTeam(teamId, data);
      toast.success("Team updated successfully");
      setEditingTeam(null);
      await refetchTeams();
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
    } catch {
      toast.error("Failed to update team");
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!window.confirm("Delete this team? Existing members will be moved to General.")) return;
    try {
      await crmService.deleteTeam(teamId);
      toast.success("Team deleted successfully");
      await refetchTeams();
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
    } catch {
      toast.error("Failed to delete team");
    }
  };

  const handleAssignMember = async (teamId: number) => {
    const selected = assignSelections[teamId];
    if (!selected) return;
    try {
      await crmService.assignTeamMember(teamId, Number(selected));
      setAssignSelections((prev) => ({ ...prev, [teamId]: "" }));
      toast.success("Member assigned to team");
      await refetchTeams();
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
    } catch {
      toast.error("Failed to assign member");
    }
  };

  const handleRemoveMember = async (teamId: number, memberId: number) => {
    try {
      await crmService.removeTeamMember(teamId, memberId);
      toast.success("Member removed from team");
      await refetchTeams();
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
    } catch {
      toast.error("Failed to remove member");
    }
  };

  if (teamsLoading || membersLoading) return <PageLoader />;
  if (teamsError || membersError) {
    return (
      <ErrorFallback
        title="Team data failed to load"
        error={teamsError ?? membersError}
        description="Team and member data could not be loaded. Retry to fetch the latest records."
        onRetry={handleRefresh}
        retryLabel="Retry teams"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-5">
          <div className={cn("inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
            <Users className="h-3.5 w-3.5 text-primary" />
            Team Management
          </div>

          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="font-display text-3xl font-semibold text-foreground">Teams</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Organise members into teams, track performance, and manage assignments in one place.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <motion.div whileTap={{ scale: 0.94 }}>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={teamsFetching || membersLoading}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border-border/70 bg-background/50 px-4 font-semibold text-foreground backdrop-blur-sm transition"
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", (teamsFetching || membersLoading) && "animate-spin")} />
                  {teamsFetching || membersLoading ? "Refreshing…" : "Refresh"}
                </Button>
              </motion.div>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => setCreateDialogOpen(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 px-5 text-sm font-semibold text-white shadow-lg transition"
                >
                  <Plus className="h-4 w-4" />
                  New Team
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total Teams",      value: String(stats.totalTeams),   icon: UsersRound },
            { label: "Active Teams",     value: String(stats.activeTeams),  icon: TrendingUp },
            { label: "Total Members",    value: String(stats.totalMembers), icon: Users },
            { label: "Unassigned",       value: String(stats.unassigned),   icon: ShieldCheck },
          ].map((s) => (
            <div key={s.label} className="rounded-[1.25rem] border border-border/70 bg-secondary/22 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <s.icon className="h-5 w-5" />
              </div>
              <p className={cn("uppercase tracking-[0.14em] text-muted-foreground", TEXT.eyebrow)}>{s.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Filter bar ── */}
      <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => startTransition(() => setSearch(e.target.value))}
              placeholder="Search teams or members…"
              className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <select
            value={perfFilter}
            onChange={(e) => setPerfFilter(e.target.value as typeof perfFilter)}
            className="h-11 rounded-2xl border border-border/70 bg-background/55 px-4 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All performance</option>
            <option value="high">High (80%+)</option>
            <option value="medium">Medium (60–79%)</option>
            <option value="low">Low (&lt;60%)</option>
          </select>
        </div>
      </section>

      {/* ── Team list ── */}
      {filteredTeams.length === 0 ? (
        <section className="rounded-[1.75rem] border border-dashed border-border bg-card p-10 text-center shadow-card">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-7 w-7" />
          </div>
          <p className="font-semibold text-foreground">No teams found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || perfFilter !== "all" ? "Try adjusting your filters." : "Create the first team to get started."}
          </p>
        </section>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        >
          {filteredTeams.map((team) => (
            <motion.article
              key={team.id}
              variants={item}
              className="rounded-[1.25rem] border border-border/70 bg-card p-5 shadow-card transition hover:border-border"
            >
              {/* Card header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{team.name}</p>
                    <p className={cn("text-muted-foreground", TEXT.meta)}>
                      {team.memberCount} {team.memberCount === 1 ? "member" : "members"}
                    </p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setEditingTeam(team)}
                      className="p-1.5 rounded-xl text-muted-foreground hover:bg-secondary hover:text-primary transition"
                      title="Edit team"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteTeam(team.id)}
                        className="p-1.5 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                        title="Delete team"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {team.description && (
                <p className="mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed">{team.description}</p>
              )}

              {/* Performance mini-metrics */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  { label: "Attendance", value: `${team.attendanceRate}%`, icon: Activity,  tone: "bg-success/10 border-success/20 text-success" },
                  { label: "Workload",   value: `${team.avgWorkload}%`,    icon: Clock,     tone: "bg-info/10 border-info/20 text-info" },
                  { label: "Score",      value: `${team.performance}%`,    icon: BarChart3, tone: "bg-primary/10 border-primary/20 text-primary" },
                ].map((m) => (
                  <div key={m.label} className={cn("rounded-xl border p-2.5", m.tone)}>
                    <m.icon className="h-3.5 w-3.5 mb-1.5" />
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{m.label}</p>
                    <p className="text-base font-bold">{m.value}</p>
                  </div>
                ))}
              </div>

              {/* Permissions */}
              {Object.keys(team.permissions ?? {}).length > 0 && (
                <div className="mt-4">
                  <p className={cn("mb-2 flex items-center gap-1.5 text-muted-foreground", TEXT.eyebrow)}>
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Permissions
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(team.permissions ?? {}).map(([perm, enabled]) => (
                      <span
                        key={perm}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                          enabled
                            ? "border-primary/20 bg-primary/10 text-primary"
                            : "border-border/60 bg-secondary/30 text-muted-foreground",
                        )}
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Members list */}
              <div className="mt-4">
                <p className={cn("mb-2 flex items-center gap-1.5 text-muted-foreground", TEXT.eyebrow)}>
                  <UsersRound className="h-3.5 w-3.5 text-primary" />
                  Members
                </p>
                {team.members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members assigned yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {team.members.slice(0, 4).map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/22 px-3 py-2"
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                          {member.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{member.name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{member.role}</p>
                        </div>
                        {canEdit && (
                          <button
                            onClick={() => handleRemoveMember(team.id, member.id)}
                            className="shrink-0 p-1 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition text-base leading-none"
                            title="Remove member"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {team.members.length > 4 && (
                      <p className="text-center text-xs text-muted-foreground pt-1">
                        +{team.members.length - 4} more
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Assign member */}
              {canEdit && (
                <div className="mt-4 flex gap-2">
                  <div className="relative flex-1">
                    <UserPlus className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <select
                      value={assignSelections[team.id] ?? ""}
                      onChange={(e) => setAssignSelections((prev) => ({ ...prev, [team.id]: e.target.value }))}
                      className="h-9 w-full rounded-xl border border-border/70 bg-background/55 pl-9 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">Add member…</option>
                      {members
                        .filter((m) => m.team !== team.name)
                        .map((m) => (
                          <option key={m.id} value={String(m.id)}>
                            {m.name} ({m.role})
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    onClick={() => handleAssignMember(team.id)}
                    disabled={!assignSelections[team.id]}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </div>
              )}
            </motion.article>
          ))}
        </motion.div>
      )}

      {/* ── Create dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Team</DialogTitle>
          </DialogHeader>
          <TeamForm onSubmit={handleCreateTeam} />
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      {editingTeam && (
        <Dialog open onOpenChange={() => setEditingTeam(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Team</DialogTitle>
            </DialogHeader>
            <TeamForm
              initialData={editingTeam}
              onSubmit={(data) => handleUpdateTeam(editingTeam.id, data)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function TeamForm({
  initialData,
  onSubmit,
}: {
  initialData?: TeamRecord;
  onSubmit: (data: CreateTeamInput) => void;
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(initialData?.permissions ?? {});
  const [newPermission, setNewPermission] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({ name: name.trim(), description: description.trim(), permissions });
  };

  const togglePermission = (key: string) =>
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));

  const addPermission = () => {
    const key = newPermission.trim();
    if (!key) return;
    setPermissions((prev) => ({ ...prev, [key]: true }));
    setNewPermission("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="team-name">Team Name</Label>
        <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="team-description">Description</Label>
        <Textarea id="team-description" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Permissions</Label>
        {Object.keys(permissions).length === 0 ? (
          <p className="text-sm text-muted-foreground">No permissions added yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(permissions).map((perm) => (
              <label key={perm} className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm cursor-pointer hover:bg-secondary/30 transition">
                <input
                  type="checkbox"
                  checked={permissions[perm] ?? false}
                  onChange={() => togglePermission(perm)}
                />
                <span className="capitalize">{perm}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={newPermission}
            onChange={(e) => setNewPermission(e.target.value)}
            placeholder="Add permission key"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPermission())}
          />
          <Button type="button" variant="outline" onClick={addPermission} disabled={!newPermission.trim()}>
            Add
          </Button>
        </div>
      </div>
      <Button type="submit" className="w-full">
        {initialData ? "Save Changes" : "Create Team"}
      </Button>
    </form>
  );
}
