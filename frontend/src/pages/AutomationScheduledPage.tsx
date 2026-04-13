/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Clock,
  Plus,
  RefreshCw,
  Trash2,
  Calendar,
  Mail,
  Bell,
  CheckCircle2,
  XCircle,
  Play,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };
const INITIAL_SHOW_COUNT = 5;

const jobTypeIcons: Record<string, any> = {
  email: Mail,
  task: Bell,
  alert: Clock,
  webhook: Play,
  reminder: Clock,
};

const jobTypeColors: Record<string, string> = {
  email: "text-info",
  task: "text-warning",
  alert: "text-destructive",
  webhook: "text-primary",
  reminder: "text-success",
};

const jobTypes = [
  { value: "email", label: "Email", icon: Mail },
  { value: "task", label: "Task", icon: Bell },
  { value: "alert", label: "Alert", icon: Clock },
  { value: "webhook", label: "Webhook", icon: Play },
  { value: "reminder", label: "Reminder", icon: Clock },
];

export default function AutomationScheduledPage() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAllJobs, setShowAllJobs] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jobName, setJobName] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobType, setJobType] = useState("task");
  const [scheduledFor, setScheduledFor] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [cronExpression, setCronExpression] = useState("");

  const { data: jobs = [], isLoading, refetch } = useQuery({
    queryKey: ["automation-scheduled"],
    queryFn: async () => {
      const url = statusFilter === "all" ? "/api/automation/scheduled" : `/api/automation/scheduled?status=${statusFilter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["automation-stats"],
    queryFn: async () => {
      const res = await fetch("/api/automation/stats", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await fetch(`/api/automation/scheduled/${jobId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to cancel job");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
      toast.success("Job cancelled");
    },
    onError: () => toast.error("Failed to cancel job"),
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/automation/scheduled", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create job");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automation-scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["automation-stats"] });
      toast.success("Scheduled job created!");
      setCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => toast.error(error.message || "Failed to create job"),
  });

  const resetForm = () => {
    setJobName("");
    setJobDescription("");
    setJobType("task");
    setScheduledFor("");
    setIsRecurring(false);
    setCronExpression("");
  };

  const handleCreateJob = () => {
    if (!jobName.trim() || !scheduledFor) {
      toast.error("Please fill in job name and scheduled time");
      return;
    }
    createMutation.mutate({
      jobType,
      name: jobName.trim(),
      description: jobDescription.trim(),
      scheduledFor,
      cronExpression: isRecurring ? cronExpression : undefined,
      isRecurring,
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ["automation-stats"] })]);
    setIsRefreshing(false);
  };

  const pendingJobs = jobs.filter((j: any) => j.status === "pending");
  const completedJobs = jobs.filter((j: any) => j.status === "completed");
  const failedJobs = jobs.filter((j: any) => j.status === "failed");
  const recurringJobs = jobs.filter((j: any) => j.isRecurring);
  const completedToday = stats?.completedToday || 0;
  const failedToday = stats?.failedToday || 0;

  const filteredJobs = statusFilter === "all" 
    ? jobs 
    : jobs.filter((j: any) => j.status === statusFilter);
  
  const displayedJobs = showAllJobs ? filteredJobs : filteredJobs.slice(0, INITIAL_SHOW_COUNT);

  const statusTabs = [
    { id: "all", label: "All" },
    { id: "pending", label: "Pending" },
    { id: "completed", label: "Completed" },
    { id: "failed", label: "Failed" },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className="relative overflow-hidden rounded-3xl border border-border/60 bg-card shadow-card">
        <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-info via-primary to-success" />
        <div className={cn("relative", SPACING.card)}>
          <div className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Automation
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">
                <span className="bg-gradient-to-r from-info to-primary bg-clip-text text-transparent">
                  Scheduled
                </span> Jobs
              </h1>
              <p className={cn("max-w-xl text-muted-foreground", TEXT.bodyRelaxed)}>
                Manage your scheduled automation jobs and recurring tasks.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Job
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Scheduled Job</DialogTitle>
                  <DialogDescription>
                    Schedule an automation job to run at a specific time.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobName">Job Name *</Label>
                    <Input
                      id="jobName"
                      value={jobName}
                      onChange={(e) => setJobName(e.target.value)}
                      placeholder="e.g., Follow up email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobDescription">Description</Label>
                    <Input
                      id="jobDescription"
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobType">Job Type</Label>
                    <Select value={jobType} onValueChange={setJobType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {jobTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <type.icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduledFor">Schedule For *</Label>
                    <Input
                      id="scheduledFor"
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={(e) => setScheduledFor(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    <Label htmlFor="isRecurring">Recurring job</Label>
                  </div>
                  {isRecurring && (
                    <div className="space-y-2">
                      <Label htmlFor="cronExpression">Cron Expression</Label>
                      <Input
                        id="cronExpression"
                        value={cronExpression}
                        onChange={(e) => setCronExpression(e.target.value)}
                        placeholder="0 9 * * * (daily at 9am)"
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: minute hour day month weekday
                      </p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm(); }}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateJob} disabled={createMutation.isPending}>
                      {createMutation.isPending ? "Creating..." : "Create Job"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Pending Jobs", value: pendingJobs.length, icon: Clock, gradient: "from-warning to-warning/60" },
              { label: "Recurring", value: recurringJobs.length, icon: Calendar, gradient: "from-info to-info/60" },
              { label: "Completed Today", value: completedToday, icon: CheckCircle2, gradient: "from-success to-success/60" },
              { label: "Failed Today", value: failedToday, icon: XCircle, gradient: "from-destructive to-destructive/60" },
            ].map((stat) => (
              <div key={stat.label} className={cn("relative overflow-hidden rounded-xl border border-border/40 bg-secondary/20 p-3", RADIUS.md)}>
                <div className={cn("absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r", stat.gradient)} />
                <div className="flex items-center gap-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br border", stat.gradient, "text-white border-transparent")}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className={cn("text-muted-foreground", TEXT.meta)}>{stat.label}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Status Filter Tabs */}
      <motion.section variants={item}>
        <div className="flex items-center justify-between">
          <div className="flex gap-1 rounded-xl border border-border/60 bg-secondary/30 p-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                {tab.label}
                <span className={cn("ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]", 
                  statusFilter === tab.id ? "bg-primary-foreground/20" : "bg-secondary")}>
                  {tab.id === "all" ? jobs.length : 
                   tab.id === "pending" ? pendingJobs.length :
                   tab.id === "completed" ? completedJobs.length :
                   failedJobs.length}
                </span>
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section variants={item} className="space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="font-display text-xl font-semibold text-foreground">No scheduled jobs</h3>
              <p className="mt-2 text-muted-foreground">
                {statusFilter === "all" 
                  ? "No scheduled automation jobs found." 
                  : `No ${statusFilter} jobs found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {displayedJobs.map((job: any, index: number) => {
              const Icon = jobTypeIcons[job.jobType] || Clock;
              const color = jobTypeColors[job.jobType] || "text-muted-foreground";

              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-border/60">
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary", color)}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">{job.name}</h3>
                          {job.isRecurring && (
                            <Badge variant="outline" className="text-xs bg-info/10 text-info border-info/30">
                              Recurring
                            </Badge>
                          )}
                        </div>
                        {job.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{job.description}</p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(job.scheduledFor).toLocaleString()}
                          </span>
                          {job.cronExpression && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {job.cronExpression}
                            </span>
                          )}
                          {job.runCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              {job.runCount} runs
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                          {job.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm("Cancel this scheduled job?")) {
                              cancelMutation.mutate(job.id);
                            }
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            {jobs.length > INITIAL_SHOW_COUNT && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowAllJobs(!showAllJobs)}
                  className="gap-2"
                >
                  {showAllJobs ? (
                    <>
                      <ChevronDown className="h-4 w-4 rotate-180" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Show {jobs.length - INITIAL_SHOW_COUNT} More Jobs
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </motion.section>
    </motion.div>
  );
}
