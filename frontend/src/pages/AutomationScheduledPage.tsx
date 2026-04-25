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

  const { data: jobs = [], isLoading, error, refetch } = useQuery({
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

  if (error) return <ErrorFallback error={error as Error} onRetry={refetch} retryLabel="Retry scheduled" />;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
            {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 mb-3">
              <Clock className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Automation · Scheduled</span>
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Scheduled Jobs</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Configure recurring tasks and time-based automation workflows.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
              <Clock className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium">{jobs.length} total jobs</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2">
              <span className="text-sm font-medium text-success">{jobs.filter((j: any) => j.isActive).length} active</span>
            </div>
            {stats?.scheduledRuns != null && (
              <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
                <span className="text-sm font-medium text-primary">{stats.scheduledRuns} runs today</span>
              </div>
            )}
          </div>
        </div>
      </section>

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
