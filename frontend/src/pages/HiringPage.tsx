import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BriefcaseBusiness, ClipboardList, UsersRound, ChevronDown, ChevronUp, Copy, ToggleLeft, ToggleRight, AlertTriangle, Clock, ArrowRight, Edit2, Trash2, RefreshCw } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { HiringSkeleton } from "@/components/skeletons";
import ErrorFallback from "@/components/shared/ErrorFallback";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { Button } from "@/components/ui/button";
import { useCandidates, useJobPostings, crmKeys } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useRefresh } from "@/hooks/use-refresh";
import { getRefreshMessage, getRefreshSuccessMessage } from "@/lib/refresh-messages";

type CandidateStage = "applied" | "screening" | "interview" | "offer" | "hired" | "rejected";
type JobPriority = "urgent" | "high" | "normal" | "low";

const STAGES: CandidateStage[] = ["applied", "screening", "interview", "offer", "hired", "rejected"];

const stageColors: Record<CandidateStage, string> = {
  applied: "bg-info/10 text-info border-info/20",
  screening: "bg-primary/10 text-primary border-primary/20",
  interview: "bg-warning/10 text-warning border-warning/20",
  offer: "bg-accent/10 text-accent border-accent/20",
  hired: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const stageLabel: Record<CandidateStage, string> = {
  applied: "Applied", screening: "Screening", interview: "Interview",
  offer: "Offer", hired: "Hired", rejected: "Rejected",
};

const priorityConfig: Record<JobPriority, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "bg-destructive/10 text-destructive border-destructive/20" },
  high:   { label: "High",   color: "bg-warning/10 text-warning border-warning/20" },
  normal: { label: "Normal", color: "bg-secondary/30 text-muted-foreground border-border/40" },
  low:    { label: "Low",    color: "bg-secondary/20 text-muted-foreground/60 border-border/30" },
};

export default function HiringPage() {
  const {
    data: jobPostings = [],
    isLoading: jobsLoading,
    error: jobsError,
    refetch: refetchJobs,
  } = useJobPostings();

  const {
    data: candidates = [],
    isLoading: candidatesLoading,
    error: candidatesError,
    refetch: refetchCandidates,
  } = useCandidates();

  const { role } = useTheme();
  const canManageHiring = role === "admin" || role === "manager";
  const canDeleteHiring = role === "admin" || role === "manager"; // Matches backend routes for candidates

  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());
  const [activeStage, setActiveStage] = useState<CandidateStage | null>(null);
  const [visibleJobCount, setVisibleJobCount] = useState(4);
  const JOB_PAGE_SIZE = 4;
  const queryClient = useQueryClient();
  const { refresh, isRefreshing } = useRefresh();

  const handleRefresh = async () => {
    await refresh(
      () => Promise.all([refetchJobs(), refetchCandidates()]),
      {
        message: getRefreshMessage("hiring"),
        successMessage: getRefreshSuccessMessage("hiring"),
      }
    );
  };

  const toggleStatusMutation = useMutation({
    mutationFn: (jobId: number) => crmService.toggleJobStatus(jobId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: crmKeys.jobPostings }); toast.success("Job status updated"); },
    onError: () => toast.error("Failed to update status"),
  });

  const cloneMutation = useMutation({
    mutationFn: (jobId: number) => crmService.cloneJob(jobId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: crmKeys.jobPostings }); toast.success("Job cloned as draft"); },
    onError: () => toast.error("Failed to clone job"),
  });

  const deleteCandidateMutation = useMutation({
    mutationFn: (id: number) => crmService.removeCandidate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.candidates });
      toast.success("Candidate removed");
    },
    onError: () => toast.error("Failed to remove candidate"),
  });

  const toggleJobExpanded = (jobId: number) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const stageSummary = useMemo(
    () => STAGES.map((stage) => ({ stage, count: candidates.filter((c) => c.stage === stage).length })),
    [candidates],
  );

  if (jobsLoading || candidatesLoading) return <HiringSkeleton />;

  if (jobsError) {
    return (
      <ErrorFallback
        title="Could not load job postings"
        error={jobsError}
        onRetry={() => refetchJobs()}
        retryLabel="Retry"
      />
    );
  }

  if (candidatesError) {
    return (
      <ErrorFallback
        title="Could not load candidates"
        error={candidatesError}
        onRetry={() => refetchCandidates()}
        retryLabel="Retry"
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <BriefcaseBusiness className="h-3.5 w-3.5 text-primary" />
            Hiring
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="font-display text-3xl font-semibold text-foreground">Hiring pipeline</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                Open roles, stage counts, and where candidates sit in the recruitment process.
              </p>
            </div>
            <motion.div whileTap={{ scale: 0.94 }}>
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="inline-flex items-center gap-2 rounded-2xl border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition h-11 px-4"
              >
                <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
                Refresh Pipeline
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_0.88fr]">
        {/* Stage summary */}
        <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Pipeline</p>
              <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Stage summary</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs font-medium text-muted-foreground">
                {candidates.length} candidate{candidates.length !== 1 ? "s" : ""}
              </span>
              {activeStage && (
                <button
                  onClick={() => setActiveStage(null)}
                  className="text-xs text-primary hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          </div>

          {candidates.length > 0 ? (
            <div className="space-y-5">
              {/* Clickable animated pipeline flow */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                {STAGES.filter(s => s !== "rejected").map((stage, idx, arr) => {
                  const count = stageSummary.find(s => s.stage === stage)?.count ?? 0;
                  const isLast = idx === arr.length - 1;
                  const isActive = activeStage === stage;
                  return (
                    <div key={stage} className="flex items-center gap-1 flex-shrink-0">
                      <motion.button
                        onClick={() => setActiveStage(isActive ? null : stage)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.97 }}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-2xl border px-3 py-2.5 min-w-[76px] transition-all duration-200 cursor-pointer",
                          isActive
                            ? cn(stageColors[stage], "ring-2 ring-offset-1 ring-current shadow-md")
                            : count > 0
                              ? cn(stageColors[stage], "opacity-80 hover:opacity-100")
                              : "bg-secondary/10 border-border/40 text-muted-foreground/40"
                        )}
                      >
                        <motion.span
                          key={count}
                          initial={{ scale: 0.7, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="font-display text-xl font-bold leading-none"
                        >
                          {count}
                        </motion.span>
                        <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{stageLabel[stage]}</span>
                      </motion.button>
                      {!isLast && (
                        <ArrowRight className={cn(
                          "h-3 w-3 flex-shrink-0 transition-all duration-300",
                          count > 0 ? "text-primary/50" : "text-border/30"
                        )} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Animated candidates for selected stage */}
              <AnimatePresence mode="wait">
                {activeStage && (
                  <motion.div
                    key={activeStage}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className={cn("rounded-2xl border p-4 space-y-2", stageColors[activeStage])}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-3">
                        {stageLabel[activeStage]} · {candidates.filter(c => c.stage === activeStage).length} candidates
                      </p>
                      {candidates.filter(c => c.stage === activeStage).length === 0 ? (
                        <p className="text-xs opacity-70">No candidates in this stage.</p>
                      ) : (
                        candidates.filter(c => c.stage === activeStage).map((c, i) => (
                          <motion.div
                            key={c.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between rounded-xl bg-background/40 px-3 py-2 group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-background/60 text-[10px] font-bold">
                                {c.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-xs font-semibold">{c.name}</p>
                                <p className="text-[10px] opacity-70">{c.jobTitle}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {canManageHiring && (
                                <button
                                  onClick={() => toast.info("Edit mode coming via Hiring extension")}
                                  className="p-1 rounded-full hover:bg-background/60 text-muted-foreground hover:text-primary transition opacity-0 group-hover:opacity-100"
                                  title="Edit candidate"
                                >
                                  <Edit2 className="h-2.5 w-2.5" />
                                </button>
                              )}
                              {canDeleteHiring && (
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Are you sure you want to remove ${c.name}?`)) {
                                      deleteCandidateMutation.mutate(c.id);
                                    }
                                  }}
                                  className="p-1 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition opacity-0 group-hover:opacity-100"
                                  title="Delete candidate"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              )}
                              {c.rating !== undefined && c.rating > 0 && (
                                <span className="text-[10px] opacity-80">{"★".repeat(c.rating)}</span>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Funnel bar */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-[0.12em]">Conversion funnel</p>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary/30">
                  {STAGES.filter(s => s !== "rejected").map((stage) => {
                    const count = stageSummary.find(s => s.stage === stage)?.count ?? 0;
                    const pct = candidates.length > 0 ? (count / candidates.length) * 100 : 0;
                    if (pct === 0) return null;
                    const barColors: Record<string, string> = {
                      applied: "bg-info/70", screening: "bg-primary/70",
                      interview: "bg-warning/70", offer: "bg-accent/70", hired: "bg-success/70",
                    };
                    return (
                      <motion.div
                        key={stage}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className={cn("h-full", barColors[stage])}
                        title={`${stageLabel[stage]}: ${count}`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Applied</span>
                  <span>{stageSummary.find(s => s.stage === "rejected")?.count ?? 0} rejected</span>
                  <span>Hired</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Conversion", value: candidates.length > 0 ? `${Math.round(((stageSummary.find(s => s.stage === "hired")?.count ?? 0) / candidates.length) * 100)}%` : "0%" },
                  { label: "In Progress", value: String(candidates.filter(c => !["hired","rejected"].includes(c.stage)).length) },
                  { label: "Rejected", value: String(stageSummary.find(s => s.stage === "rejected")?.count ?? 0) },
                ].map(({ label, value }) => (
                  <motion.div
                    key={label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-border/50 bg-secondary/10 p-3 text-center"
                  >
                    <p className="font-display text-lg font-bold text-foreground">{value}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
              <UsersRound className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm font-semibold text-foreground">No candidates yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add candidates to track their progress.</p>
            </div>
          )}
        </div>

        {/* Open roles */}
        <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              <p className="text-sm font-semibold text-foreground">All roles</p>
            </div>
            <span className="text-xs text-muted-foreground">{jobPostings.length} total</span>
          </div>

          {jobPostings.length > 0 ? (
            <div className="space-y-3">
              {jobPostings.slice(0, visibleJobCount).map((job) => {
                const isExpanded = expandedJobs.has(job.id);
                const jobCandidates = candidates.filter(c => c.jobId === job.id);
                const priority = (job.priority ?? "normal") as JobPriority;
                const isDeadlineSoon = job.deadline && new Date(job.deadline) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                return (
                  <div key={job.id} className={cn(
                    "rounded-2xl border p-4 transition-all",
                    job.status === "closed" ? "border-border/40 bg-secondary/10 opacity-70" :
                    job.status === "draft"  ? "border-dashed border-border/50 bg-secondary/10" :
                    "border-border/70 bg-secondary/20"
                  )}>
                    {/* Job header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground truncate">{job.title}</p>
                          {priority !== "normal" && (
                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", priorityConfig[priority].color)}>
                              {priority === "urgent" && <AlertTriangle className="inline h-2.5 w-2.5 mr-0.5" />}
                              {priorityConfig[priority].label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{job.department} · {job.location}</p>
                        {job.deadline && (
                          <p className={cn("text-[10px] mt-1 flex items-center gap-1", isDeadlineSoon ? "text-destructive" : "text-muted-foreground")}>
                            <Clock className="h-3 w-3" />
                            Deadline: {new Date(job.deadline).toLocaleDateString()}
                            {isDeadlineSoon && " · Closing soon!"}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Status badge */}
                        <span className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                          job.status === "open"   ? "bg-success/10 text-success border-success/20" :
                          job.status === "draft"  ? "bg-secondary/30 text-muted-foreground border-border/40" :
                          "bg-destructive/10 text-destructive border-destructive/20"
                        )}>
                          {job.status}
                        </span>

                        {/* Candidate count + expand */}
                        <span className="rounded-full border border-border/70 bg-card px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                          {job.candidateCount ?? 0}
                        </span>

                        {/* Toggle status */}
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0"
                          title={job.status === "open" ? "Close job" : "Reopen job"}
                          onClick={() => toggleStatusMutation.mutate(job.id)}
                          disabled={toggleStatusMutation.isPending}
                        >
                          {job.status === "open"
                            ? <ToggleRight className="h-4 w-4 text-success" />
                            : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                        </Button>

                        {/* Clone */}
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0"
                          title="Clone job"
                          onClick={() => cloneMutation.mutate(job.id)}
                          disabled={cloneMutation.isPending}
                        >
                          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>

                        {/* Expand candidates */}
                        {jobCandidates.length > 0 && (
                          <Button
                            variant="ghost" size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => toggleJobExpanded(job.id)}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded candidates */}
                    {isExpanded && jobCandidates.length > 0 && (
                      <div className="space-y-1.5 pt-3 mt-3 border-t border-border/50">
                        {jobCandidates.map((candidate) => (
                          <div key={candidate.id} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary/60 text-[10px] font-semibold">
                                {candidate.name.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-foreground/80">{candidate.name}</span>
                            </div>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", stageColors[candidate.stage as CandidateStage])}>
                              {stageLabel[candidate.stage as CandidateStage]}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <ShowMoreButton
                total={jobPostings.length}
                visible={visibleJobCount}
                pageSize={JOB_PAGE_SIZE}
                onShowMore={() => setVisibleJobCount(v => Math.min(v + JOB_PAGE_SIZE, jobPostings.length))}
                onShowLess={() => setVisibleJobCount(JOB_PAGE_SIZE)}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-6 text-center">
              <p className="text-sm font-semibold text-foreground">No job postings yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Create a job posting to start tracking candidates.</p>
            </div>
          )}
        </div>
      </section>

      {/* Stage legend */}
      <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Process note</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-foreground">Recruitment flow</h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <UsersRound className="h-3.5 w-3.5" />
            Candidates move here
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
          Track which roles are open, how many candidates are in each stage, and where the pipeline needs attention.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {STAGES.map((stage) => (
            <span
              key={stage}
              className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]", stageColors[stage])}
            >
              {stageLabel[stage]}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
