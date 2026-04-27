import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { Plus, Settings, Trash2, UserPlus, Users, UsersRound, ShieldCheck, TrendingUp, Activity, Clock, BarChart3, Search, RefreshCw, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TeamsSkeleton } from "@/components/skeletons";
import ErrorFallback from "@/components/shared/ErrorFallback";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import StatusBadge from "@/components/shared/StatusBadge";
import { useTheme } from "@/contexts/ThemeContext";
import { useTeamMembers, useTeams, crmKeys } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { CreateTeamInput, TeamRecord, TeamMemberInfo } from "@/types/crm";

const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };
const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };

function TeamCard({ team, onEdit, onDelete, onRemoveMember, onAssign, availableMembers, canEdit, canDelete }: {
  team: ReturnType<typeof useTeamMetrics>[number];
  onEdit: () => void;
  onDelete: () => void;
  onRemoveMember: (memberId: number) => void;
  onAssign: (teamId: number) => void;
  availableMembers: TeamMemberInfo[];
  canEdit: boolean;
  canDelete: boolean;
}) {
  const getScoreConfig = (score: number) => {
    if (score >= 80) return { color: "text-success", bg: "bg-success/10 border-success/30", dot: "bg-success", glow: "shadow-[0_0_12px_hsl(142,76%,36%,0.3)]" };
    if (score >= 60) return { color: "text-warning", bg: "bg-warning/10 border-warning/30", dot: "bg-warning", glow: "shadow-[0_0_12px_hsl(38,92%,50%,0.3)]" };
    return { color: "text-destructive", bg: "bg-destructive/10 border-destructive/30", dot: "bg-destructive", glow: "shadow-[0_0_12px_hsl(0,72%,51%,0.3)]" };
  };

  const scoreConfig = getScoreConfig(team.performance);
  const topMembers = team.members.slice(0, 5);

  return (
    <motion.article
      variants={item}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/40 bg-card shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]",
        "transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12)] hover:border-border/60"
      )}
    >
      {/* Gradient background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-info/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Top accent line with glow */}
      <div className="absolute left-0 top-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="absolute left-0 top-0 h-[2px] w-1/3 bg-gradient-to-r from-primary to-primary/0" />

      <div className="relative p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Team Avatar */}
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary border border-primary/10">
                <Users className="h-5 w-5" />
              </div>
              {/* Online indicator */}
              {team.memberCount > 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-success text-[8px] font-bold text-white border-2 border-card">
                  {team.memberCount}
                </span>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{team.name}</h3>
              <p className={cn("text-muted-foreground", TEXT.meta)}>
                {team.memberCount === 0 ? "No members" : `${team.memberCount} member${team.memberCount !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Performance Badge */}
          <div className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5", scoreConfig.bg)}>
            <span className={cn("h-2 w-2 rounded-full", scoreConfig.dot, scoreConfig.glow)} />
            <span className={cn("text-xs font-bold", scoreConfig.color)}>{team.performance}%</span>
          </div>
        </div>

        {/* Description */}
        {team.description && (
          <p className={cn("mt-3 text-sm text-muted-foreground line-clamp-2 leading-relaxed")}>{team.description}</p>
        )}

        {/* Stats Row */}
        <div className="mt-4 flex items-center gap-3">
          <div className={cn("flex flex-1 items-center gap-2 rounded-lg border border-border/40 bg-secondary/20 p-2.5", RADIUS.md)}>
            <Activity className="h-3.5 w-3.5 text-success" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-foreground leading-none">{team.attendanceRate}%</p>
              <p className={cn("text-[10px] text-muted-foreground leading-none mt-0.5", TEXT.meta)}>Attendance</p>
            </div>
          </div>
          <div className={cn("flex flex-1 items-center gap-2 rounded-lg border border-border/40 bg-secondary/20 p-2.5", RADIUS.md)}>
            <Clock className="h-3.5 w-3.5 text-info" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold text-foreground leading-none">{team.avgWorkload}%</p>
              <p className={cn("text-[10px] text-muted-foreground leading-none mt-0.5", TEXT.meta)}>Workload</p>
            </div>
          </div>
          <div className={cn("flex flex-1 items-center gap-2 rounded-lg border border-border/40 bg-secondary/20 p-2.5", RADIUS.md)}>
            <BarChart3 className={cn("h-3.5 w-3.5", scoreConfig.color)} />
            <div className="min-w-0 flex-1">
              <p className={cn("text-lg font-bold leading-none", scoreConfig.color)}>{team.performance}%</p>
              <p className={cn("text-[10px] text-muted-foreground leading-none mt-0.5", TEXT.meta)}>Score</p>
            </div>
          </div>
        </div>

        {/* Members Preview */}
        <div className="mt-4">
          <p className={cn("mb-2.5 flex items-center gap-1.5 text-muted-foreground", TEXT.eyebrow)}>
            <UsersRound className="h-3 w-3" />
            Team Members
          </p>
          
          {team.members.length === 0 ? (
            <div className={cn("rounded-xl border border-dashed border-border/40 bg-secondary/10 p-4 text-center", RADIUS.md)}>
              <UsersRound className="mx-auto h-6 w-6 text-muted-foreground/40 mb-1.5" />
              <p className={cn("text-xs text-muted-foreground", TEXT.meta)}>No members yet</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              {/* Member Avatars Stack */}
              <div className="flex -space-x-2">
                {topMembers.map((member, idx) => (
                  <div
                    key={member.id}
                    className={cn(
                      "relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-gradient-to-br text-[10px] font-bold text-white shadow-sm",
                      idx === 0 ? "from-primary to-primary/80 z-10" :
                      idx === 1 ? "from-info to-info/80 z-9" :
                      idx === 2 ? "from-success to-success/80 z-8" :
                      idx === 3 ? "from-warning to-warning/80 z-7" :
                      "from-muted to-muted/80 z-6"
                    )}
                    style={{ zIndex: 10 - idx }}
                    title={member.name}
                  >
                    {member.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                ))}
                {team.members.length > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-secondary text-[10px] font-bold text-muted-foreground z-0">
                    +{team.members.length - 5}
                  </div>
                )}
              </div>
              
              {/* Quick view names */}
              <p className={cn("text-xs text-muted-foreground text-right truncate max-w-[120px]", TEXT.meta)}>
                {topMembers.slice(0, 2).map(m => m.name.split(" ")[0]).join(", ")}
                {team.members.length > 2 && ` +${team.members.length - 2}`}
              </p>
            </div>
          )}
        </div>

        {/* Permissions */}
        {Object.keys(team.permissions ?? {}).length > 0 && (
          <div className="mt-4">
            <p className={cn("mb-2 flex items-center gap-1.5 text-muted-foreground", TEXT.eyebrow)}>
              <ShieldCheck className="h-3 w-3" />
              Permissions
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(team.permissions ?? {}).slice(0, 4).map(([perm, enabled]) => (
                <span
                  key={perm}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize",
                    enabled
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border/40 bg-secondary/20 text-muted-foreground",
                  )}
                >
                  {perm}
                </span>
              ))}
              {Object.keys(team.permissions ?? {}).length > 4 && (
                <span className="rounded-md border border-border/40 bg-secondary/20 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  +{Object.keys(team.permissions ?? {}).length - 4}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-2">
          {canEdit && (
            <>
              <select
                value=""
                onChange={(e) => e.target.value && onAssign(team.id)}
                className="h-9 flex-1 rounded-lg border border-border/40 bg-background/60 px-3 text-xs outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              >
                <option value="">Add member...</option>
                {availableMembers
                  .filter((m) => !team.members.some(tm => tm.id === m.id))
                  .map((m) => (
                    <option key={m.id} value={String(m.id)}>
                      {m.name}
                    </option>
                  ))}
              </select>
              <Button 
                size="sm" 
                variant="outline"
                onClick={onEdit}
                className="h-9 w-9 p-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
          {canDelete && (
            <Button 
              size="sm" 
              variant="ghost"
              onClick={onDelete}
              className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function useTeamMetrics(teams: TeamRecord[]) {
  return useMemo(() => {
    return teams.map((team) => {
      const teamMembers = team.members;
      const presentCount = teamMembers.filter((m) => m.attendance === "present").length;
      const attendanceRate = teamMembers.length > 0 ? Math.round((presentCount / teamMembers.length) * 100) : 0;
      const avgWorkload = teamMembers.length > 0 ? Math.round(teamMembers.reduce((sum, m) => sum + (m.workload ?? 0), 0) / teamMembers.length) : 0;
      const performance = Math.round(attendanceRate * 0.4 + avgWorkload * 0.6);
      return { ...team, attendanceRate, avgWorkload, performance, memberCount: teamMembers.length };
    }).sort((a, b) => b.performance - a.performance);
  }, [teams]);
}

export default function TeamsPage() {
  const { role } = useTheme();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { data: teams = [], isLoading: teamsLoading, error: teamsError, refetch: refetchTeams, isFetching: teamsFetching } = useTeams();
  const { data: members = [], isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useTeamMembers();

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin";

  const [editingTeam, setEditingTeam] = useState<TeamRecord | null>(null);
  const [search, setSearch] = useState("");
  const [perfFilter, setPerfFilter] = useState<"all" | "high" | "medium" | "low">("all");

  const deferredSearch = useDeferredValue(search);

  const teamMetrics = useTeamMetrics(teams);

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
    const selectEl = document.querySelector(`select[data-team-id="${teamId}"]`) as HTMLSelectElement;
    const selected = selectEl?.value;
    if (!selected) return;
    try {
      await crmService.assignTeamMember(teamId, Number(selected));
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

  if (teamsLoading || membersLoading) return <TeamsSkeleton />;
  if (teamsError || membersError) {
    return (
      <ErrorFallback
        title="Team data failed to load"
        error={teamsError ?? membersError}
        description="Team and member data could not be loaded."
        onRetry={handleRefresh}
        retryLabel="Retry teams"
      />
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 mb-3">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">People · Teams</span>
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Team Organization</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Organise members into teams, track performance, and manage assignments.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
              <UsersRound className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium">{stats.totalTeams} teams</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2">
              <span className="text-sm font-medium text-success">{stats.activeTeams} active</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-4 py-2">
              <Users className="h-4 w-4 text-info flex-shrink-0" />
              <span className="text-sm font-medium text-info">{stats.totalMembers} members</span>
            </div>
            {stats.unassigned > 0 && (
              <div className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2">
                <span className="text-sm font-medium text-warning">{stats.unassigned} unassigned</span>
              </div>
            )}
            <div className="flex items-center gap-2 ml-1">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={teamsFetching || membersLoading} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", (teamsFetching || membersLoading) && "animate-spin")} />
                Refresh
              </Button>
              {canEdit && (
                <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> New Team
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <motion.section variants={item} className={cn("border border-border/60 bg-card/80 backdrop-blur-sm shadow-card", RADIUS.xl, SPACING.card)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => startTransition(() => setSearch(e.target.value))}
              placeholder="Search teams or members..."
              className="h-12 w-full rounded-2xl border border-border/60 bg-background/70 pl-12 pr-4 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "high", "medium", "low"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setPerfFilter(filter)}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-semibold capitalize transition-all",
                  perfFilter === filter
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-border hover:bg-secondary/50",
                )}
              >
                {filter} Performance
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Team Grid */}
      {filteredTeams.length === 0 ? (
        <motion.section variants={item} className={cn("border border-dashed border-border/60 bg-card text-center shadow-card", RADIUS.xl, SPACING.card)}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-info/20 text-primary">
            <Users className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground">No teams found</h3>
          <p className={cn("mt-2 text-muted-foreground max-w-md mx-auto", TEXT.body)}>
            {search || perfFilter !== "all" ? "Try adjusting your filters to see more results." : "Create your first team to start organizing members."}
          </p>
        </motion.section>
      ) : (
        <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredTeams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onEdit={() => setEditingTeam(team)}
              onDelete={() => handleDeleteTeam(team.id)}
              onRemoveMember={(memberId) => handleRemoveMember(team.id, memberId)}
              onAssign={(teamId) => handleAssignMember(teamId)}
              availableMembers={members}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Create New Team</DialogTitle>
          </DialogHeader>
          <TeamForm onSubmit={handleCreateTeam} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingTeam && (
        <Dialog open onOpenChange={() => setEditingTeam(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display text-xl">Edit Team</DialogTitle>
            </DialogHeader>
            <TeamForm initialData={editingTeam} onSubmit={(data) => handleUpdateTeam(editingTeam.id, data)} />
          </DialogContent>
        </Dialog>
      )}
    </motion.div>
  );
}

function TeamForm({ initialData, onSubmit }: { initialData?: TeamRecord; onSubmit: (data: CreateTeamInput) => void }) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [permissions, setPermissions] = useState<Record<string, boolean>>(initialData?.permissions ?? {});
  const [newPermission, setNewPermission] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit({ name: name.trim(), description: description.trim(), permissions });
  };

  const togglePermission = (key: string) => setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  const addPermission = () => {
    const key = newPermission.trim();
    if (!key) return;
    setPermissions((prev) => ({ ...prev, [key]: true }));
    setNewPermission("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor="team-name" className="text-sm font-medium">Team Name</Label>
        <Input id="team-name" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="team-description" className="text-sm font-medium">Description</Label>
        <Textarea id="team-description" value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1.5" />
      </div>
      <div className="space-y-3">
        <Label className="text-sm font-medium">Permissions</Label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(permissions).map((perm) => (
            <label key={perm} className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm cursor-pointer hover:bg-secondary/30 transition-colors">
              <input type="checkbox" checked={permissions[perm] ?? false} onChange={() => togglePermission(perm)} className="rounded" />
              <span className="capitalize">{perm}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={newPermission} onChange={(e) => setNewPermission(e.target.value)} placeholder="Add permission..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPermission())} />
          <Button type="button" variant="outline" onClick={addPermission}>Add</Button>
        </div>
      </div>
      <Button type="submit" className="w-full">{initialData ? "Save Changes" : "Create Team"}</Button>
    </form>
  );
}
