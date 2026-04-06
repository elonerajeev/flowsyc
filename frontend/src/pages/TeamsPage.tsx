import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Settings, Trash2, UserPlus, Users, UsersRound, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { useToast } from "@/hooks/use-toast";
import { useTeamMembers, useTeams, crmKeys } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import type { CreateTeamInput, TeamRecord } from "@/types/crm";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

export default function TeamsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: teams = [], isLoading: teamsLoading, error: teamsError, refetch: refetchTeams, isFetching: teamsFetching } = useTeams();
  const { data: members = [], isLoading: membersLoading, error: membersError, refetch: refetchMembers } = useTeamMembers();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<TeamRecord | null>(null);
  const [assignSelections, setAssignSelections] = useState<Record<number, string>>({});

  const availableMembers = useMemo(() => members, [members]);
  const stats = useMemo(() => {
    const totalMembers = members.length;
    const totalTeams = teams.length;
    const unassigned = members.filter((member) => !member.team || member.team === "General").length;
    return { totalMembers, totalTeams, unassigned };
  }, [members, teams]);

  const handleRefresh = async () => {
    const start = Date.now();
    await Promise.all([refetchTeams(), refetchMembers()]);
    const duration = Date.now() - start;
    if (duration < 600) await new Promise(r => setTimeout(r, 600 - duration));
  };

  const handleCreateTeam = async (data: CreateTeamInput) => {
    try {
      await crmService.createTeam(data);
      toast({
        title: "Success",
        description: "Team created successfully",
      });
      setCreateDialogOpen(false);
      await refetchTeams();
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
    } catch {
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTeam = async (teamId: number, data: Partial<CreateTeamInput>) => {
    try {
      await crmService.updateTeam(teamId, data);
      toast({
        title: "Success",
        description: "Team updated successfully",
      });
      setEditingTeam(null);
      await refetchTeams();
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
    } catch {
      toast({
        title: "Error",
        description: "Failed to update team",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!window.confirm("Delete this team? Existing members will be moved to General.")) {
      return;
    }

    try {
      await crmService.deleteTeam(teamId);
      toast({
        title: "Success",
        description: "Team deleted successfully",
      });
      await refetchTeams();
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete team",
        variant: "destructive",
      });
    }
  };

  const handleAssignMember = async (teamId: number) => {
    const selected = assignSelections[teamId];
    if (!selected) return;

    try {
      await crmService.assignTeamMember(teamId, Number(selected));
      setAssignSelections((current) => ({ ...current, [teamId]: "" }));
      toast({
        title: "Success",
        description: "Member assigned to team",
      });
      await refetchTeams();
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
    } catch {
      toast({
        title: "Error",
        description: "Failed to assign member",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (teamId: number, memberId: number) => {
    try {
      await crmService.removeTeamMember(teamId, memberId);
      toast({
        title: "Success",
        description: "Member removed from team",
      });
      await refetchTeams();
      queryClient.invalidateQueries({ queryKey: crmKeys.teamMembers });
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  if (teamsLoading || membersLoading) return <PageLoader />;
  if (teamsError || membersError) {
    return (
      <ErrorFallback
        title="Team data failed to load"
        error={teamsError ?? membersError}
        description="Team and member data could not be loaded. Retry to fetch the latest records."
        onRetry={() => handleRefresh()}
        retryLabel="Retry teams"
      />
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 p-6">
      <motion.section variants={item} className="rounded-[2rem] border border-border/70 bg-gradient-to-br from-primary/5 via-background to-secondary/20 p-6 shadow-card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Team Directory
            </div>
            <h1 className="mt-3 font-display text-3xl font-semibold text-foreground">Teams</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Build teams, assign members, and keep ownership clear across the org.
            </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={teamsFetching}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border-border/70 bg-background/60 px-4 font-semibold text-foreground backdrop-blur-sm transition hover:bg-secondary/40"
            >
              {teamsFetching ? "Refreshing..." : "Refresh"}
            </Button>
          </motion.div>
          <Button variant="outline" onClick={() => navigate("/people/members")}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team</DialogTitle>
              </DialogHeader>
              <TeamForm onSubmit={handleCreateTeam} />
            </DialogContent>
          </Dialog>
        </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { label: "Teams", value: stats.totalTeams, icon: Users, tone: "text-primary bg-primary/10" },
            { label: "Members", value: stats.totalMembers, icon: UsersRound, tone: "text-info bg-info/10" },
            { label: "Unassigned", value: stats.unassigned, icon: ShieldCheck, tone: "text-warning bg-warning/10" },
          ].map((item) => (
            <div key={item.label} className="rounded-[1.25rem] border border-border/70 bg-background/70 p-4 shadow-sm">
              <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {teams.length === 0 ? (
        <motion.section variants={item}>
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">No teams created yet</p>
                <p className="text-sm text-muted-foreground">Create the first team before assigning members.</p>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      ) : (
        <motion.div variants={container} className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((team) => (
            <motion.div key={team.id} variants={item}>
            <Card className="border-border/70 bg-gradient-to-br from-background via-background to-secondary/20 shadow-card">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {team.name}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {team.members.length} members
                    </Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {team.description || "No description"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditingTeam(team)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteTeam(team.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Permissions</p>
                  {Object.keys(team.permissions ?? {}).length === 0 ? (
                    <p className="text-sm text-muted-foreground">No permissions assigned yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(team.permissions ?? {}).map(([permission, value]) => (
                        <Badge
                          key={permission}
                          variant={value ? "default" : "secondary"}
                        >
                          {permission}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Members ({team.members.length})</p>
                  {team.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No members assigned yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {team.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(team.id, member.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Assign member</p>
                  <div className="flex gap-2">
                    <Select
                      value={assignSelections[team.id] ?? ""}
                      onValueChange={(value) => setAssignSelections((current) => ({ ...current, [team.id]: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            availableMembers.some((member) => member.team !== team.name)
                              ? "Select a member"
                              : "No available members"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableMembers
                          .filter((member) => member.team !== team.name)
                          .map((member) => (
                            <SelectItem key={member.id} value={String(member.id)}>
                              {member.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={() => handleAssignMember(team.id)} disabled={!assignSelections[team.id]}>
                      Assign
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {editingTeam ? (
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
      ) : null}
    </motion.div>
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
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      permissions,
    });
  };

  const togglePermission = (permission: string) => {
    setPermissions((current) => ({
      ...current,
      [permission]: !current[permission],
    }));
  };

  const addPermission = () => {
    const key = newPermission.trim();
    if (!key) return;
    setPermissions((current) => ({
      ...current,
      [key]: true,
    }));
    setNewPermission("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="team-name">Team Name</Label>
        <Input
          id="team-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="team-description">Description</Label>
        <Textarea
          id="team-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Permissions</Label>
        {Object.keys(permissions).length === 0 ? (
          <p className="text-sm text-muted-foreground">No permissions added yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {Object.keys(permissions).map((permission) => (
              <label key={permission} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={permissions[permission] ?? false}
                  onChange={() => togglePermission(permission)}
                />
                <span className="capitalize">{permission}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={newPermission}
            onChange={(event) => setNewPermission(event.target.value)}
            placeholder="Add permission key"
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
