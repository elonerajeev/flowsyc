import { useMemo, useRef, useState } from "react";
import { FileText, Search, Shield, UserRoundCheck, ArrowRight, X, CheckCircle, Calendar, Clock, Users, Filter, ScrollText, Download, Upload, MessageSquare, History, Globe, Users2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { SiIndeed, SiGlassdoor } from "@icons-pack/react-simple-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { useCandidates, useJobPostings, crmKeys } from "@/hooks/use-crm-data";
import { crmService } from "@/services/crm";
import { useRefresh } from "@/hooks/use-refresh";
import { getRefreshMessage, getRefreshSuccessMessage } from "@/lib/refresh-messages";
import { CandidatesSkeleton } from "@/components/skeletons";
import type { CandidateRecord } from "@/types/crm";

type DisplayStage = CandidateRecord["stage"];

const stageLabel: Record<DisplayStage, string> = {
  applied: "Applied",
  screening: "Screening",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected",
};

const stageColors: Record<DisplayStage, string> = {
  applied: "bg-info/10 text-info border-info/20",
  screening: "bg-primary/10 text-primary border-primary/20",
  interview: "bg-warning/10 text-warning border-warning/20",
  offer: "bg-accent/10 text-accent border-accent/20",
  hired: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function CandidatesPage() {
  const { role } = useTheme();
  const { user } = useAuth();
  const { data: candidates = [], isLoading, error, refetch } = useCandidates();
  const { data: jobPostings = [] } = useJobPostings();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState(4);
  const PAGE_SIZE = 4;
  const { refresh, isRefreshing } = useRefresh();

  const handleRefresh = async () => {
    await refresh(
      () => refetch(),
      {
        message: getRefreshMessage("candidates"),
        successMessage: getRefreshSuccessMessage("candidates"),
      }
    );
  };
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("");
  const [interviewers, setInterviewers] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [offeredSalary, setOfferedSalary] = useState("");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [offerLetterData, setOfferLetterData] = useState<{
    candidate: { name: string; email: string; jobTitle: string; department: string; location: string };
    hr: { name: string; designation: string | null; email: string; signatureUrl: string | null };
    offer: { joiningDate: string; offeredSalary: string; jobTitle: string; department: string; location: string; type: string; generatedAt: string };
  } | null>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const offerLetterRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const filtered = useMemo(
    () => candidates.filter((c) => {
      const searchMatch = `${c.name} ${c.jobTitle} ${c.stage} ${c.email}`.toLowerCase().includes(search.toLowerCase());
      const jobMatch = jobFilter === "all" || c.jobId === Number(jobFilter);
      const stageMatch = stageFilter === "all" || c.stage === stageFilter;
      return searchMatch && jobMatch && stageMatch;
    }),
    [candidates, search, jobFilter, stageFilter],
  );

  const selectedCandidate = useMemo(
    () => filtered.find((c) => c.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  // Timeline query - only fetch when panel is open
  const { data: timeline = [] } = useQuery({
    queryKey: ["candidate-timeline", selectedCandidate?.id],
    queryFn: () => crmService.getCandidateTimeline(selectedCandidate!.id),
    enabled: !!selectedCandidate && showTimeline,
    staleTime: 30_000,
  });

  const addNoteMutation = useMutation({
    mutationFn: ({ candidateId, note }: { candidateId: number; note: string }) =>
      crmService.addCandidateNote(candidateId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.candidates });
      queryClient.invalidateQueries({ queryKey: ["candidate-timeline", selectedCandidate?.id] });
      setQuickNote("");
      toast.success("Note added");
    },
    onError: () => toast.error("Failed to add note"),
  });

  const scheduleInterviewMutation = useMutation({
    mutationFn: async ({ candidateId, date, time, interviewers }: { candidateId: number; date: string; time: string; interviewers: string }) => {
      const dateTime = `${date}T${time}:00`;
      const interviewersList = interviewers.split(',').map(i => i.trim()).filter(Boolean);
      return crmService.updateCandidate(candidateId, { 
        interviewDate: dateTime,
        interviewers: interviewersList,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.candidates });
      toast.success("Interview scheduled successfully");
      setInterviewDialogOpen(false);
      setInterviewDate("");
      setInterviewTime("");
      setInterviewers("");
    },
    onError: () => {
      toast.error("Failed to schedule interview");
    },
  });

  const moveToNextStageMutation = useMutation({
    mutationFn: (candidateId: number) => crmService.moveCandidateToNextStage(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.candidates });
      toast.success("Candidate moved to next stage");
    },
    onError: () => {
      toast.error("Failed to move candidate");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (candidateId: number) => crmService.rejectCandidate(candidateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: crmKeys.candidates });
      toast.success("Candidate rejected");
    },
    onError: () => {
      toast.error("Failed to reject candidate");
    },
  });

  const offerLetterMutation = useMutation({
    mutationFn: ({ candidateId, data }: { candidateId: number; data: { joiningDate: string; offeredSalary: string; signatureUrl?: string } }) =>
      crmService.generateOfferLetter(candidateId, data),
    onSuccess: (data) => {
      setOfferLetterData(data);
      toast.success("Offer letter generated!");
    },
    onError: () => toast.error("Failed to generate offer letter"),
  });

  const handleExportCSV = () => {
    if (candidates.length === 0) return;
    const headers = ["ID", "Name", "Email", "Job Title", "Stage", "Source", "Rating", "Joined At"];
    const rows = filtered.map(c => [
      c.id,
      c.name,
      c.email,
      c.jobTitle,
      stageLabel[c.stage] || c.stage,
      c.source || "Direct",
      c.rating || 0,
      new Date(c.createdAt).toLocaleDateString()
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `candidates_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Candidates export started");
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setSignatureUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePrint = () => {
    if (!offerLetterRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    // Add professional styling to the print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Employment Offer - ${offerLetterData?.candidate?.name ?? ''}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          * { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact; }
          body { 
            font-family: 'Inter', -apple-system, sans-serif; 
            background: #fff; 
            color: #1e293b;
            line-height: 1.5;
            padding: 0;
            margin: 0;
          }
          
          .print-container {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 25mm 20mm;
            background: white;
            position: relative;
          }
          
          @media print {
            body { background: none; }
            @page { size: A4; margin: 0; }
            .print-container { margin: 0; box-shadow: none; padding: 25mm 20mm; }
          }
          
          /* Industrial Brand Header */
          .header-brand {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1e3a5f;
            padding-bottom: 20px;
            margin-bottom: 40px;
          }
          
          .logo-text {
            font-weight: 800;
            font-size: 24px;
            letter-spacing: -0.02em;
            color: #1e3a5f;
          }
          
          .doc-type {
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.1em;
            font-size: 12px;
            color: #64748b;
          }

          /* Content formatting */
          h1, h2, h3 { color: #1e3a5f; }
          .section-title { font-size: 14px; font-weight: 700; text-transform: uppercase; margin-bottom: 12px; }
          .signature-area { display: flex; justify-content: space-between; margin-top: 60px; }
          .sig-box { width: 45%; border-top: 1px solid #cbd5e1; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="print-container">
          <header class="header-brand">
            <div class="logo-text">FOCAL POINT <span style="font-weight: 400; color: #64748b;">COMPASS</span></div>
            <div class="doc-type">Official Employment Offer</div>
          </header>
          ${offerLetterRef.current.innerHTML}
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              // window.close(); // Optional: close tab after print
            }, 600);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const stageCounts = useMemo(() => {
    const counts: Partial<Record<DisplayStage, number>> = {};
    for (const c of candidates) counts[c.stage] = (counts[c.stage] ?? 0) + 1;
    return counts;
  }, [candidates]);

  if (isLoading) return <CandidatesSkeleton />;

  if (error) {
    return (
      <ErrorFallback
        title="Could not load candidates"
        error={error}
        onRetry={() => refetch()}
        retryLabel="Retry"
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <section className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <UserRoundCheck className="h-3.5 w-3.5 text-primary" />
            Candidates
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Candidate list</h1>
              <div className="flex items-center gap-3">
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  Applicant records with profile context and stage tracking for the hiring team.
                </p>
                {(jobFilter !== "all" || stageFilter !== "all") && (
                  <button
                    onClick={() => {
                      setJobFilter("all");
                      setStageFilter("all");
                    }}
                    className="text-xs text-primary hover:underline whitespace-nowrap"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(role === "admin" || role === "manager") && (
                <motion.div whileTap={{ scale: 0.94 }}>
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={candidates.length === 0}
                    className="inline-flex items-center gap-2 rounded-2xl border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition h-11 px-4"
                  >
                    <Download className="h-4 w-4 text-primary" />
                    Export CSV
                  </Button>
                </motion.div>
              )}
              <motion.div whileTap={{ scale: 0.94 }}>
                <Button
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 rounded-2xl border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition h-11 px-4"
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
                  Refresh List
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {candidates.length > 0 && (
        <section className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {(Object.keys(stageLabel) as DisplayStage[]).map((stage) => (
              <div key={stage} className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{stageLabel[stage]}</p>
                <p className="mt-1 font-display text-2xl font-semibold text-foreground">{stageCounts[stage] ?? 0}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search candidates..."
                  className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 pl-11 pr-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-2">
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger className="w-[180px] h-11 rounded-2xl">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Jobs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Jobs</SelectItem>
                    {jobPostings.map((job) => (
                      <SelectItem key={job.id} value={String(job.id)}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stageFilter} onValueChange={setStageFilter}>
                  <SelectTrigger className="w-[140px] h-11 rounded-2xl">
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="screening">Screening</SelectItem>
                    <SelectItem value="interview">Interview</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {filtered.length > 0 ? (
              <>
                {filtered.slice(0, visibleCount).map((candidate) => {
                const isSelected = selectedCandidate?.id === candidate.id;
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => setSelectedId(candidate.id)}
                    className={cn(
                      "w-full rounded-[1.5rem] border p-5 text-left shadow-card transition",
                      isSelected
                        ? "border-primary bg-primary/[0.05]"
                        : "border-border/70 bg-card/90 hover:border-border",
                    )}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/55 font-display text-lg font-semibold text-foreground">
                          {candidate.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-display text-lg font-semibold text-foreground">{candidate.name}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{candidate.jobTitle}</p>
                          <p className="text-xs text-muted-foreground/70">{candidate.email}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "self-start rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
                          stageColors[candidate.stage],
                        )}
                      >
                        {stageLabel[candidate.stage]}
                      </span>
                    </div>
                  </button>
                );
              })}
                <ShowMoreButton
                  total={filtered.length}
                  visible={visibleCount}
                  pageSize={PAGE_SIZE}
                  onShowMore={() => setVisibleCount(v => Math.min(v + PAGE_SIZE, filtered.length))}
                  onShowLess={() => setVisibleCount(PAGE_SIZE)}
                />
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-secondary/10 p-8 text-center">
                <p className="text-sm font-semibold text-foreground">
                  {candidates.length === 0 ? "No candidates yet" : "No matching candidates"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {candidates.length === 0
                    ? "Add candidates to start tracking the hiring pipeline."
                    : "Try a different search term."}
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Candidate profile</p>
            </div>
            {selectedCandidate ? (
              <div className="space-y-4">
                <div>
                  <p className="font-display text-xl font-semibold text-foreground">{selectedCandidate.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedCandidate.jobTitle}</p>
                  <p className="text-xs text-muted-foreground/70">{selectedCandidate.email}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Stage</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{stageLabel[selectedCandidate.stage]}</p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Applied</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {new Date(selectedCandidate.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedCandidate.source && (
                    <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Source</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        {selectedCandidate.source === "LinkedIn" && (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        )}
                        {selectedCandidate.source === "Indeed" && <SiIndeed className="h-4 w-4" style={{ color: "#003A9B" }} />}
                        {selectedCandidate.source === "Glassdoor" && <SiGlassdoor className="h-4 w-4" style={{ color: "#0CAA41" }} />}
                        {selectedCandidate.source === "Referral" && <Users2 className="h-4 w-4 text-primary" />}
                        {selectedCandidate.source === "Website" && <Globe className="h-4 w-4 text-muted-foreground" />}
                        <p className="text-sm font-semibold text-foreground">{selectedCandidate.source}</p>
                      </div>
                    </div>
                  )}
                  {selectedCandidate.rating !== undefined && selectedCandidate.rating > 0 && (
                    <div className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                      <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Rating</p>
                      <div className="mt-1 flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={cn("text-base", i < (selectedCandidate.rating ?? 0) ? "text-warning" : "text-border")}>★</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {selectedCandidate.notes && (
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4">
                    <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Notes</p>
                    <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{selectedCandidate.notes}</p>
                  </div>
                )}

                {selectedCandidate.interviewDate && (
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <p className="text-xs uppercase tracking-[0.14em] text-primary font-semibold">Interview Scheduled</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{new Date(selectedCandidate.interviewDate).toLocaleString()}</span>
                      </div>
                      {selectedCandidate.interviewers && selectedCandidate.interviewers.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">{selectedCandidate.interviewers.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(role === "admin" || role === "manager") && (
                  <div className="space-y-2">
                    {(selectedCandidate.stage === "screening" || selectedCandidate.stage === "interview") && (
                      <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>                        <DialogTrigger asChild>
                          <Button variant="outline" className="w-full gap-2">
                            <Calendar className="h-4 w-4" />
                            Schedule Interview
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Schedule Interview - {selectedCandidate.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                              <Label htmlFor="date">Interview Date</Label>
                              <Input
                                id="date"
                                type="date"
                                value={interviewDate}
                                onChange={(e) => setInterviewDate(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="time">Interview Time</Label>
                              <Input
                                id="time"
                                type="time"
                                value={interviewTime}
                                onChange={(e) => setInterviewTime(e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="interviewers">Interviewers (comma separated)</Label>
                              <Input
                                id="interviewers"
                                placeholder="John Doe, Jane Smith"
                                value={interviewers}
                                onChange={(e) => setInterviewers(e.target.value)}
                              />
                            </div>
                            <Button
                              onClick={() => scheduleInterviewMutation.mutate({
                                candidateId: selectedCandidate.id,
                                date: interviewDate,
                                time: interviewTime,
                                interviewers,
                              })}
                              disabled={!interviewDate || !interviewTime || scheduleInterviewMutation.isPending}
                              className="w-full"
                            >
                              Schedule Interview
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {selectedCandidate.stage !== "hired" && selectedCandidate.stage !== "rejected" && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => moveToNextStageMutation.mutate(selectedCandidate.id)}
                          disabled={moveToNextStageMutation.isPending}
                          className="flex-1 gap-2"
                        >
                          <ArrowRight className="h-4 w-4" />
                          Move to Next Stage
                        </Button>
                        <Button
                          onClick={() => rejectMutation.mutate(selectedCandidate.id)}
                          disabled={rejectMutation.isPending}
                          variant="destructive"
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {selectedCandidate.stage === "hired" && (
                  <div className="flex items-center gap-2 rounded-2xl border border-success/20 bg-success/10 p-3 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <p className="text-sm font-medium">Candidate hired successfully</p>
                  </div>
                )}

                {/* Offer Letter - only when candidate has reached offer stage */}
                {(role === "admin" || role === "manager") && selectedCandidate.stage === "offer" && (
                  <Dialog open={offerDialogOpen} onOpenChange={(open) => { setOfferDialogOpen(open); if (!open) setOfferLetterData(null); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/5">
                        <ScrollText className="h-4 w-4" />
                        Generate Offer Letter
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Offer Letter — {selectedCandidate.name}</DialogTitle>
                      </DialogHeader>

                      {!offerLetterData ? (
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Joining Date</Label>
                              <Input type="date" value={joiningDate} onChange={e => setJoiningDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="space-y-2">
                              <Label>Offered Salary (e.g. $85,000/year)</Label>
                              <Input placeholder="$85,000/year" value={offeredSalary} onChange={e => setOfferedSalary(e.target.value)} />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>HR/Admin Signature (upload image)</Label>
                            <div
                              onClick={() => signatureInputRef.current?.click()}
                              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border/60 bg-secondary/10 p-6 hover:border-primary/40 transition"
                            >
                              {signatureUrl ? (
                                <img src={signatureUrl} alt="Signature" className="max-h-16 object-contain" />
                              ) : (
                                <>
                                  <Upload className="h-6 w-6 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">Click to upload signature</p>
                                </>
                              )}
                            </div>
                            <input ref={signatureInputRef} type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                          </div>

                          <div className="rounded-2xl border border-border/50 bg-secondary/10 p-4 text-sm space-y-1">
                            <p className="font-medium text-foreground">Auto-filled from system:</p>
                            <p className="text-muted-foreground">Candidate: <strong>{selectedCandidate.name}</strong></p>
                            <p className="text-muted-foreground">Role: <strong>{selectedCandidate.jobTitle}</strong></p>
                            <p className="text-muted-foreground">Hiring Manager: <strong>{user?.name}</strong> ({user?.designation})</p>
                          </div>

                          <Button
                            className="w-full"
                            disabled={!joiningDate || !offeredSalary || offerLetterMutation.isPending}
                            onClick={() => offerLetterMutation.mutate({
                              candidateId: selectedCandidate.id,
                              data: { joiningDate, offeredSalary, signatureUrl: signatureUrl ?? undefined },
                            })}
                          >
                            <ScrollText className="h-4 w-4 mr-2" />
                            Generate Offer Letter
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-2">
                          {/* Offer Letter Preview - Professional 2-page design */}
                          <div ref={offerLetterRef} className="bg-white text-gray-900" style={{ fontFamily: "'Georgia', serif" }}>

                            {/* ── PAGE 1 ── */}
                            <div style={{ minHeight: "1050px", padding: "56px 64px", display: "flex", flexDirection: "column" }}>

                              {/* Header with logo + company info */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1e3a5f", paddingBottom: "24px", marginBottom: "32px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                                  {/* Logo mark */}
                                  <div style={{ width: "52px", height: "52px", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ color: "white", fontSize: "22px", fontWeight: "bold", fontFamily: "sans-serif" }}>F</span>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a5f", letterSpacing: "0.5px", fontFamily: "sans-serif" }}>Focal Point Compass</div>
                                    <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: "sans-serif" }}>Human Resources Division</div>
                                  </div>
                                </div>
                                <div style={{ textAlign: "right", fontSize: "11px", color: "#64748b", lineHeight: "1.8", fontFamily: "sans-serif" }}>
                                  <div>hr@focalpointcompass.com</div>
                                  <div>www.focalpointcompass.com</div>
                                  <div style={{ marginTop: "4px", color: "#94a3b8" }}>Ref: OL-{offerLetterData.candidate.name.replace(/\s/g, '').toUpperCase().slice(0,4)}-{new Date(offerLetterData.offer.generatedAt).getFullYear()}</div>
                                </div>
                              </div>

                              {/* Date + Candidate address block */}
                              <div style={{ marginBottom: "32px" }}>
                                <div style={{ fontSize: "13px", color: "#475569", marginBottom: "20px", fontFamily: "sans-serif" }}>
                                  {new Date(offerLetterData.offer.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                                <div style={{ fontSize: "14px", lineHeight: "1.9", color: "#1e293b" }}>
                                  <div style={{ fontWeight: "bold", fontSize: "15px" }}>{offerLetterData.candidate.name}</div>
                                  <div style={{ color: "#475569" }}>{offerLetterData.candidate.email}</div>
                                </div>
                              </div>

                              {/* Subject line */}
                              <div style={{ background: "#f0f6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "14px 20px", marginBottom: "28px" }}>
                                <div style={{ fontSize: "11px", color: "#2563eb", textTransform: "uppercase", letterSpacing: "1.5px", fontFamily: "sans-serif", marginBottom: "4px" }}>Subject</div>
                                <div style={{ fontSize: "15px", fontWeight: "bold", color: "#1e3a5f" }}>
                                  Offer of Employment — {offerLetterData.offer.jobTitle}
                                </div>
                              </div>

                              {/* Salutation + body */}
                              <div style={{ fontSize: "14px", lineHeight: "1.9", color: "#1e293b", flex: 1 }}>
                                <p style={{ marginBottom: "18px" }}>Dear <strong>{offerLetterData.candidate.name}</strong>,</p>

                                <p style={{ marginBottom: "18px", color: "#334155" }}>
                                  We are delighted to offer you the position of <strong style={{ color: "#1e3a5f" }}>{offerLetterData.offer.jobTitle}</strong> at <strong style={{ color: "#1e3a5f" }}>Focal Point Compass</strong>. After careful consideration of your qualifications and experience, we are confident that you will be a valuable addition to our <strong style={{ color: "#1e3a5f" }}>{offerLetterData.offer.department}</strong> team.
                                </p>

                                <p style={{ marginBottom: "28px", color: "#334155" }}>
                                  This is a <strong style={{ color: "#1e3a5f" }}>{offerLetterData.offer.type}</strong> position based in <strong style={{ color: "#1e3a5f" }}>{offerLetterData.offer.location}</strong>. The details of your employment are outlined below:
                                </p>

                                {/* Terms table */}
                                <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", marginBottom: "24px" }}>
                                  <div style={{ background: "#1e3a5f", padding: "12px 20px" }}>
                                    <span style={{ color: "white", fontSize: "12px", fontWeight: "bold", letterSpacing: "1px", textTransform: "uppercase", fontFamily: "sans-serif" }}>Employment Terms</span>
                                  </div>
                                  {[
                                    ["Position", offerLetterData.offer.jobTitle],
                                    ["Department", offerLetterData.offer.department],
                                    ["Employment Type", offerLetterData.offer.type],
                                    ["Work Location", offerLetterData.offer.location],
                                    ["Date of Joining", new Date(offerLetterData.offer.joiningDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })],
                                    ["Compensation", offerLetterData.offer.offeredSalary],
                                  ].map(([label, value], i) => (
                                    <div key={label} style={{ display: "flex", borderTop: i === 0 ? "none" : "1px solid #f1f5f9", background: i % 2 === 0 ? "#f8fafc" : "white" }}>
                                      <div style={{ width: "200px", padding: "11px 20px", fontSize: "12px", color: "#64748b", fontFamily: "sans-serif", textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0 }}>{label}</div>
                                      <div style={{ padding: "11px 20px", fontSize: "13px", fontWeight: "600", color: "#1e293b", borderLeft: "1px solid #f1f5f9" }}>{value}</div>
                                    </div>
                                  ))}
                                </div>

                                <p style={{ color: "#334155" }}>
                                  Your compensation package includes all applicable benefits as per company policy. Detailed information regarding benefits, leave entitlements, and company policies will be shared during your onboarding.
                                </p>
                              </div>
                            </div>

                            {/* ── PAGE 2 ── */}
                            <div style={{ minHeight: "1050px", padding: "56px 64px", display: "flex", flexDirection: "column", borderTop: "4px solid #1e3a5f" }}>

                              {/* Page 2 header */}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "36px", paddingBottom: "16px", borderBottom: "1px solid #e2e8f0" }}>
                                <div style={{ fontSize: "13px", color: "#1e3a5f", fontWeight: "bold", fontFamily: "sans-serif" }}>Focal Point Compass — Offer Letter (Continued)</div>
                                <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "sans-serif" }}>Page 2 of 2</div>
                              </div>

                              {/* Conditions */}
                              <div style={{ flex: 1, fontSize: "14px", lineHeight: "1.9", color: "#334155" }}>
                                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#1e3a5f", textTransform: "uppercase", letterSpacing: "1px", fontFamily: "sans-serif", marginBottom: "12px" }}>Conditions of Employment</div>

                                {[
                                  "This offer is contingent upon successful completion of background verification and reference checks.",
                                  "You will be required to submit all necessary documentation including identity proof, educational certificates, and previous employment records on or before your joining date.",
                                  "The first 90 days of employment will constitute a probationary period, during which your performance will be evaluated.",
                                  "You are expected to maintain strict confidentiality regarding all proprietary information, trade secrets, and business strategies of Focal Point Compass.",
                                  "This offer supersedes all prior discussions, negotiations, or representations made verbally or in writing.",
                                ].map((text, i) => (
                                  <div key={i} style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
                                    <div style={{ width: "22px", height: "22px", background: "#1e3a5f", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: "2px" }}>
                                      <span style={{ color: "white", fontSize: "11px", fontFamily: "sans-serif" }}>{i + 1}</span>
                                    </div>
                                    <p style={{ margin: 0 }}>{text}</p>
                                  </div>
                                ))}

                                <p style={{ marginTop: "24px", marginBottom: "36px" }}>
                                  Please confirm your acceptance of this offer by signing below and returning a copy to our HR department at <strong style={{ color: "#1e3a5f" }}>hr@focalpointcompass.com</strong> no later than <strong style={{ color: "#1e3a5f" }}>5 business days</strong> from the date of this letter.
                                </p>

                                <p style={{ marginBottom: "40px" }}>
                                  We look forward to welcoming you to the Focal Point Compass family. Should you have any questions, please do not hesitate to reach out.
                                </p>

                                <p style={{ marginBottom: "40px" }}>Warm regards,</p>

                                {/* Signatures */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", marginTop: "8px" }}>
                                  {/* HR Signature */}
                                  <div>
                                    <div style={{ borderBottom: "1px solid #cbd5e1", paddingBottom: "8px", marginBottom: "10px", minHeight: "70px", display: "flex", alignItems: "flex-end" }}>
                                      {offerLetterData.hr.signatureUrl ? (
                                        <img src={offerLetterData.hr.signatureUrl} alt="Signature" style={{ maxHeight: "60px", objectFit: "contain" }} />
                                      ) : (
                                        <div style={{ height: "60px" }} />
                                      )}
                                    </div>
                                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>{offerLetterData.hr.name}</div>
                                    <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "sans-serif" }}>{offerLetterData.hr.designation}</div>
                                    <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "sans-serif" }}>Focal Point Compass</div>
                                    <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "sans-serif" }}>{offerLetterData.hr.email}</div>
                                  </div>

                                  {/* Candidate Acceptance */}
                                  <div>
                                    <div style={{ borderBottom: "1px solid #cbd5e1", paddingBottom: "8px", marginBottom: "10px", minHeight: "70px" }} />
                                    <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b" }}>{offerLetterData.candidate.name}</div>
                                    <div style={{ fontSize: "12px", color: "#64748b", fontFamily: "sans-serif" }}>Candidate Signature</div>
                                    <div style={{ fontSize: "11px", color: "#94a3b8", fontFamily: "sans-serif", marginTop: "8px" }}>Date: _______________</div>
                                  </div>
                                </div>
                              </div>

                              {/* Footer */}
                              <div style={{ borderTop: "2px solid #1e3a5f", paddingTop: "16px", marginTop: "32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ fontSize: "10px", color: "#94a3b8", fontFamily: "sans-serif" }}>
                                  This document is confidential and intended solely for {offerLetterData.candidate.name}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <div style={{ width: "18px", height: "18px", background: "#1e3a5f", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <span style={{ color: "white", fontSize: "9px", fontWeight: "bold", fontFamily: "sans-serif" }}>F</span>
                                  </div>
                                  <span style={{ fontSize: "10px", color: "#64748b", fontFamily: "sans-serif" }}>Focal Point Compass</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button onClick={handlePrint} className="flex-1 gap-2">
                              <Download className="h-4 w-4" />
                              Print / Download PDF
                            </Button>
                            <Button variant="outline" onClick={() => setOfferLetterData(null)}>
                              Edit
                            </Button>
                          </div>
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                )}

                {selectedCandidate.stage === "rejected" && (
                  <div className="flex items-center gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                    <X className="h-4 w-4" />
                    <p className="text-sm font-medium">Candidate rejected</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {candidates.length === 0
                  ? "No candidates to review yet."
                  : "Select a candidate to review details."}
              </p>
            )}
          </div>

          {/* Quick Note */}
          {(role === "admin" || role === "manager") && selectedCandidate && (
            <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">Quick Note</p>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={quickNote}
                  onChange={e => setQuickNote(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && quickNote.trim()) {
                      addNoteMutation.mutate({ candidateId: selectedCandidate.id, note: quickNote.trim() });
                    }
                  }}
                  placeholder="Add a note... (Enter to save)"
                  className="flex-1 h-9 rounded-xl border border-border/70 bg-background/55 px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                />
                <Button
                  size="sm"
                  disabled={!quickNote.trim() || addNoteMutation.isPending}
                  onClick={() => addNoteMutation.mutate({ candidateId: selectedCandidate.id, note: quickNote.trim() })}
                  className="h-9 px-3"
                >
                  Save
                </Button>
              </div>
            </div>
          )}

          {/* Activity Timeline */}
          {selectedCandidate && (
            <div className="rounded-[1.5rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <button
                onClick={() => setShowTimeline(v => !v)}
                className="flex w-full items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Activity Timeline</p>
                </div>
                <span className="text-xs text-muted-foreground">{showTimeline ? "Hide" : "Show"}</span>
              </button>

              {showTimeline && (
                <div className="mt-4 space-y-3">
                  {/* Applied event always shown */}
                  <div className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="h-2 w-2 rounded-full bg-info mt-1.5" />
                      <div className="w-px flex-1 bg-border/40 mt-1" />
                    </div>
                    <div className="pb-3">
                      <p className="text-xs font-medium text-foreground">Applied</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(selectedCandidate.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {timeline.length === 0 && (
                    <p className="text-xs text-muted-foreground pl-5">No activity recorded yet.</p>
                  )}

                  {[...timeline].reverse().map((event, i) => {
                    const isLast = i === timeline.length - 1;
                    const actionColors: Record<string, string> = {
                      stage_change: "bg-primary",
                      hired: "bg-success",
                      rejected: "bg-destructive",
                      note: "bg-warning",
                      interview_scheduled: "bg-accent",
                    };
                    return (
                      <div key={event.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={cn("h-2 w-2 rounded-full mt-1.5", actionColors[event.action] ?? "bg-muted-foreground")} />
                          {!isLast && <div className="w-px flex-1 bg-border/40 mt-1" />}
                        </div>
                        <div className={cn("pb-3", isLast && "pb-0")}>
                          <p className="text-xs font-medium text-foreground capitalize">{event.action.replace(/_/g, " ")}</p>
                          {event.detail && <p className="text-[11px] text-muted-foreground">{event.detail}</p>}
                          <p className="text-[10px] text-muted-foreground/60">{event.performedBy} · {new Date(event.createdAt).toLocaleString()}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}
