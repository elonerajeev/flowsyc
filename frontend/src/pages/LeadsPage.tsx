import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Plus,
  Filter,
  Search,
  Download,
  Upload,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  Target,
  Phone,
  Mail,
  Building,
  User,
  Calendar,
  TrendingUp,
  AlertTriangle,
  FileText,
  FileSpreadsheet,
  Table as TableIcon,
  Grid3X3,
  Copy,
  Check,
  Video,
  MessageSquare,
  ChevronRight,
  ArrowRight,
  X,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ErrorFallback from "@/components/shared/ErrorFallback";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import LeadEmailDialog from "@/components/crm/LeadEmailDialog";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import AdminOnly from "@/components/shared/AdminOnly";
import type { Lead } from "@/types/crm";

type ImportedFile = {
  id: number;
  filename: string;
  totalRows: number;
  successCount: number;
  errorCount: number;
  status: string;
  importedBy: string;
  createdAt: string;
};

type ImportedLead = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone?: string;
  source?: string;
  status?: string;
  score?: number;
  importId?: number;
  importFileName?: string;
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const LEAD_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  { value: "qualified", label: "Qualified", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  { value: "proposal", label: "Proposal", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  { value: "closed_won", label: "Won", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  { value: "closed_lost", label: "Lost", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
] as const;

const STAGE_ORDER = ["new", "contacted", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"] as const;

const LEAD_SOURCES = [
  { value: "website", label: "Website" },
  { value: "referral", label: "Referral" },
  { value: "social", label: "Social Media" },
  { value: "email", label: "Email Campaign" },
  { value: "cold_call", label: "Cold Call" },
  { value: "event", label: "Event" },
  { value: "partner", label: "Partner" },
] as const;

const LeadsPage = () => {
  const { role } = useTheme();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const queryClient = useQueryClient();

  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // View mode
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  const LEADS_PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(LEADS_PAGE_SIZE);

  // Dialog states
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Form states
  const [newStage, setNewStage] = useState("");
  const [stageNotes, setStageNotes] = useState("");
  const [activityType, setActivityType] = useState<"call" | "email" | "meeting" | "note">("call");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDescription, setActivityDescription] = useState("");
  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [meetingDuration, setMeetingDuration] = useState("30");
  const [meetingType, setMeetingType] = useState<"jitsi" | "google" | "phone" | "in_person">("jitsi");
  const [meetingAgenda, setMeetingAgenda] = useState("");
  const [showImportHistory, setShowImportHistory] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<number[]>([]);

  // Clear import filter on mount to show all leads (fix for empty leads issue)
  useEffect(() => {
    setSelectedImportIds([]);
  }, []);

  useEffect(() => {
    setVisibleCount(LEADS_PAGE_SIZE);
    setSelectedLeadIds([]);
  }, [searchTerm, statusFilter, sourceFilter, scoreRange, assignedFilter, sortBy, sortOrder, selectedImportIds.length]);
  
  // Bulk selection for regular leads
  const [selectedLeadIds, setSelectedLeadIds] = useState<number[]>([]);

  const canEdit = role === "admin" || role === "manager";

  // Open stage dialog
  const openStageDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setNewStage(lead.status);
    setStageNotes("");
    setStageDialogOpen(true);
  };

  // Open activity dialog
  const openActivityDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setActivityType("call");
    setActivityTitle("");
    setActivityDescription("");
    setActivityDialogOpen(true);
  };

  // Open meeting dialog
  const openMeetingDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setMeetingTitle(`Meeting with ${lead.firstName} ${lead.lastName}`);
    setMeetingDate("");
    setMeetingTime("");
    setMeetingDuration("30");
    setMeetingType("jitsi");
    setMeetingAgenda("");
    setMeetingDialogOpen(true);
  };

  // Handle stage change
  const handleStageChange = async () => {
    if (!selectedLead || !newStage) return;
    toast.promise(
      crmService.updateLeadStage(selectedLead.id, newStage, stageNotes).then(() => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
        setStageDialogOpen(false);
        return `Lead moved to ${newStage}`;
      }),
      { loading: "Updating stage...", success: "Stage updated!", error: "Failed to update stage" }
    );
  };

  // Handle activity logging
  const handleLogActivity = async () => {
    if (!selectedLead || !activityTitle) return;
    const typeMap: Record<string, "email" | "call" | "meeting" | "note" | "stage_change" | "task" | "other"> = { 
      call: "call", 
      email: "email", 
      meeting: "meeting", 
      note: "note" 
    };
    toast.promise(
      crmService.logActivity({
        entityType: "lead",
        entityId: selectedLead.id,
        type: typeMap[activityType],
        title: activityTitle,
        description: activityDescription,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        setActivityDialogOpen(false);
        return "Activity logged!";
      }),
      { loading: "Logging activity...", success: "Activity logged!", error: "Failed to log activity" }
    );
  };

  // Handle meeting creation
  const handleCreateMeeting = async () => {
    if (!selectedLead || !meetingTitle || !meetingDate || !meetingTime) {
      toast.error("Please fill in all required fields");
      return;
    }
    const scheduledAt = `${meetingDate}T${meetingTime}:00`;
    toast.promise(
      crmService.createMeeting({
        leadId: selectedLead.id,
        title: meetingTitle,
        scheduledAt,
        duration: parseInt(meetingDuration),
        meetingType,
        inviteeEmail: selectedLead.email,
        inviteeName: `${selectedLead.firstName} ${selectedLead.lastName}`,
        agenda: meetingAgenda,
      }).then((result) => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        setMeetingDialogOpen(false);
        const meetingUrl = result.data?.meetingUrl;
        if (meetingUrl) {
          navigator.clipboard.writeText(meetingUrl);
          toast.success("Meeting created! URL copied to clipboard.");
        } else {
          toast.success("Meeting scheduled!");
        }
        return "Meeting scheduled!";
      }),
      { loading: "Scheduling meeting...", success: "Meeting scheduled!", error: "Failed to schedule meeting" }
    );
  };

  // Get next stage
  const getNextStage = (currentStatus: string) => {
    const currentIndex = STAGE_ORDER.indexOf(currentStatus as typeof STAGE_ORDER[number]);
    if (currentIndex === -1 || currentIndex >= STAGE_ORDER.length - 1) return null;
    return STAGE_ORDER[currentIndex + 1];
  };

  // Copy email to clipboard
  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      setCopiedEmail(email);
      toast.success("Email copied to clipboard!");
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      toast.error("Failed to copy email");
    }
  };

  const normalizedSortBy = useMemo(() => {
    if (sortBy === "name") return "firstName";
    if (sortBy === "score") return "score";
    if (sortBy === "createdAt") return "createdAt";
    if (sortBy === "updatedAt") return "updatedAt";
    return "createdAt";
  }, [sortBy]);

  // Fetch leads using server-side paging + filtering
  const leadsQuery = useInfiniteQuery({
    queryKey: [
      "leads",
      "paged",
      {
        q: searchTerm.trim().toLowerCase(),
        status: statusFilter,
        source: sourceFilter,
        assigned: assignedFilter,
        min: scoreRange[0],
        max: scoreRange[1],
        sortBy: normalizedSortBy,
        sortOrder,
        size: LEADS_PAGE_SIZE,
      },
    ],
    queryFn: ({ pageParam }) =>
      crmService.getLeadsPage({
        page: Number(pageParam),
        limit: LEADS_PAGE_SIZE,
        search: searchTerm.trim() || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        source: sourceFilter !== "all" ? sourceFilter : undefined,
        assignedState: assignedFilter !== "all" ? (assignedFilter as "assigned" | "unassigned") : undefined,
        minScore: scoreRange[0] > 0 ? scoreRange[0] : undefined,
        maxScore: scoreRange[1] < 100 ? scoreRange[1] : undefined,
        sortBy: normalizedSortBy,
        sortOrder,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.limit < lastPage.total ? lastPage.page + 1 : undefined,
    staleTime: 30000,
    enabled: selectedImportIds.length === 0,
  });

  const leadsData = useMemo(
    () => (leadsQuery.data?.pages ?? []).flatMap((page) => page.data ?? []),
    [leadsQuery.data?.pages],
  );
  const totalLeadsInDB = useMemo(
    () => leadsQuery.data?.pages?.[0]?.total ?? 0,
    [leadsQuery.data?.pages],
  );

  // Fetch import history
  const { data: importHistory = [] } = useQuery({
    queryKey: ["lead-imports"],
    queryFn: async () => {
      const token = localStorage.getItem("crm-auth-token");
      const res = await fetch("/api/csv-import", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    },
    refetchInterval: 10000,
  });

  // Fetch leads for selected imports
  const { data: importLeads = [], isLoading: isLoadingImportLeads } = useQuery({
    queryKey: ["lead-import-leads", selectedImportIds.join(","), importHistory.length],
    queryFn: async () => {
      if (selectedImportIds.length === 0) return [];
      const allLeads: ImportedLead[] = [];
      const token = localStorage.getItem("crm-auth-token");
      for (const importId of selectedImportIds) {
        try {
          const res = await fetch(`/api/csv-import/${importId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            const leads = data.data?.leads || [];
            const importItem = importHistory.find((i: ImportedFile) => i.id === importId);
            leads.forEach((lead: ImportedLead) => {
              lead.importId = importId;
              lead.importFileName = importItem?.filename || "";
            });
            allLeads.push(...leads);
          } else {
            console.error(`Failed to fetch import ${importId}: ${res.status}`);
          }
        } catch (err) {
          console.error(`Error fetching import ${importId}:`, err);
        }
      }
      return allLeads;
    },
    enabled: selectedImportIds.length > 0,
  });

  const error = leadsQuery.error;
  const isLoading =
    selectedImportIds.length > 0
      ? isLoadingImportLeads
      : leadsQuery.isLoading && !leadsQuery.data;

  // Filter and search leads
  const filteredLeads = useMemo(() => {
    // Convert import leads to Lead format for unified filtering
    const importLeadsConverted: Lead[] = importLeads.map((imp: ImportedLead) => ({
      id: imp.id,
      firstName: imp.firstName || "",
      lastName: imp.lastName || "",
      email: imp.email || "",
      company: imp.company || "",
      jobTitle: imp.jobTitle || "",
      phone: imp.phone || "",
      status: (imp.status as Lead["status"]) || "new",
      source: (imp.source as Lead["source"]) || "other",
      score: imp.score || 0,
      assignedTo: imp.assignedTo || "",
      assignedAt: null,
      notes: "",
      tags: [`import:${imp.importId}`, "csv_import"],
      convertedAt: null,
      convertedToClientId: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // When import filter is active, show ONLY the fetched import leads (already correct set)
    if (selectedImportIds.length > 0) {
      const filtered = importLeadsConverted.filter((lead: Lead) => {
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          if (
            !lead.firstName.toLowerCase().includes(term) &&
            !lead.lastName.toLowerCase().includes(term) &&
            !lead.email.toLowerCase().includes(term) &&
            !(lead.company?.toLowerCase().includes(term))
          ) return false;
        }
        if (statusFilter !== "all" && lead.status !== statusFilter) return false;
        if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;
        if (lead.score < scoreRange[0] || lead.score > scoreRange[1]) return false;
        return true;
      });
      filtered.sort((a: Lead, b: Lead) => b.score - a.score);
      return filtered;
    }

    // For normal lead listing, filtering/sorting/paging is server-side.
    return leadsData;
  }, [leadsData, importLeads, selectedImportIds, searchTerm, statusFilter, sourceFilter, scoreRange]);

  const visibleLeads =
    selectedImportIds.length > 0 ? filteredLeads.slice(0, visibleCount) : filteredLeads;
  const hasMore =
    selectedImportIds.length > 0
      ? filteredLeads.length > visibleCount
      : Boolean(leadsQuery.hasNextPage);

  // Statistics
  const stats = useMemo(() => {
    if (!leadsData.length) return { total: 0, new: 0, qualified: 0, converted: 0, avgScore: 0, filtered: 0 };

    const leads = leadsData;
    const total = totalLeadsInDB || leads.length;
    const newLeads = leads.filter((l: Lead) => l.status === "new").length;
    const qualified = leads.filter((l: Lead) => l.status === "qualified").length;
    const converted = leads.filter((l: Lead) => l.convertedToClientId).length;
    const avgScore = leads.length > 0 ? Math.round(leads.reduce((sum: number, l: Lead) => sum + l.score, 0) / leads.length) : 0;

    return { total, new: newLeads, qualified, converted, avgScore, filtered: filteredLeads.length };
  }, [leadsData, totalLeadsInDB, filteredLeads]);

  // Delete lead mutation
  const deleteLeadMutation = useMutation({
    mutationFn: (id: number) => crmService.removeLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted successfully");
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  // Export leads
  const exportMutation = useMutation({
    mutationFn: async () => {
      // Get filtered leads data for export
      const exportData = filteredLeads.map((lead: Lead) => ({
        ID: lead.id,
        "First Name": lead.firstName,
        "Last Name": lead.lastName,
        Email: lead.email,
        Phone: lead.phone || "",
        Company: lead.company || "",
        "Job Title": lead.jobTitle || "",
        Source: lead.source,
        Status: lead.status,
        Score: lead.score,
        "Assigned To": lead.assignedTo || "",
        Tags: lead.tags.join(", "),
        "Created At": lead.createdAt,
        "Updated At": lead.updatedAt,
      }));

      // Convert to CSV
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(","),
        ...exportData.map((row: Record<string, unknown>) =>
          headers.map((header) => `"${String(row[header]).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      // Download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `leads_export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    onSuccess: () => toast.success("Leads exported successfully!"),
    onError: () => toast.error("Failed to export leads"),
  });

  // Import leads via backend API
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("crm-auth-token");
      const res = await fetch("/api/csv-import", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Import failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("CSV imported! Leads are being processed...");
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
      queryClient.invalidateQueries({ queryKey: ["lead-imports"] });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to import leads";
      toast.error(errorMessage);
    },
  });

  const deleteImportMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem("crm-auth-token");
      const res = await fetch(`/api/csv-import/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Import deleted");
      queryClient.invalidateQueries({ queryKey: ["lead-imports"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: () => toast.error("Failed to delete import"),
  });

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
      event.target.value = "";
    }
  };

  if (error) {
    return <ErrorFallback error={error as Error} />;
  }

  return (
    <>
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-3">
            <div className={cn(
              "inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground",
              TEXT.eyebrow
            )}>
              <Target className="h-3.5 w-3.5 text-primary" />
              Sales · Leads
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Lead Management</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Track, nurture, and convert leads with advanced scoring and automation.
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2">
              <TrendingUp className="h-4 w-4 text-success flex-shrink-0" />
              <span className="text-sm font-medium text-success">{stats.total.toLocaleString()} total</span>
            </div>
            {stats.filtered !== stats.total && (
              <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
                <Target className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-primary">{stats.filtered.toLocaleString()} filtered</span>
              </div>
            )}
            <div className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <span className="text-sm font-medium text-warning">{stats.new.toLocaleString()} new</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium text-muted-foreground">{stats.qualified} qualified</span>
            </div>
            {isLoading && (
              <div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" /> Loading...
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filters and Actions */}
      <section className="rounded-[1.75rem] border border-border bg-card px-4 py-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2">

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Source filter */}
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-28 h-8 text-sm">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {LEAD_SOURCES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(v) => {
            const [field, order] = v.split("-");
            setSortBy(field);
            setSortOrder(order as "asc" | "desc");
          }}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">Newest First</SelectItem>
              <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              <SelectItem value="score-desc">Highest Score</SelectItem>
              <SelectItem value="score-asc">Lowest Score</SelectItem>
              <SelectItem value="name-asc">Name A–Z</SelectItem>
            </SelectContent>
          </Select>

          {/* Reset filters */}
          {(searchTerm || statusFilter !== "all" || sourceFilter !== "all" || scoreRange[0] !== 0 || scoreRange[1] !== 100) && (
            <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground"
              onClick={() => { setSearchTerm(""); setStatusFilter("all"); setSourceFilter("all"); setScoreRange([0, 100]); setAssignedFilter("all"); setSortBy("createdAt"); setSortOrder("desc"); }}>
              <RefreshCw className="h-3 w-3 mr-1" /> Reset
            </Button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center rounded-md border overflow-hidden">
            <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-8 rounded-none px-2.5" onClick={() => setViewMode("table")}>
              <TableIcon className="h-3.5 w-3.5" />
            </Button>
            <Button variant={viewMode === "cards" ? "default" : "ghost"} size="sm" className="h-8 rounded-none px-2.5" onClick={() => setViewMode("cards")}>
              <Grid3X3 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Add Lead */}
          {canEdit && canUseQuickCreate && (
            <Button size="sm" className="h-8" onClick={() => openQuickCreate?.("lead")}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Lead
            </Button>
          )}

          {/* More actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-2">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending || filteredLeads.length === 0}>
                <Download className="h-4 w-4 mr-2" />
                {exportMutation.isPending ? "Exporting..." : "Export CSV"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <AdminOnly>
                <DropdownMenuItem asChild>
                  <label className="flex items-center gap-2 cursor-pointer w-full">
                    <Upload className="h-4 w-4" />
                    Import CSV / Excel
                    <input type="file" accept=".csv,.xlsx,.xls" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) importMutation.mutate(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </DropdownMenuItem>
              </AdminOnly>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/automation/gtm" className="flex items-center gap-2">
                  <Target className="h-4 w-4" /> GTM Center
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </section>

      {/* Leads Display */}
      {/* Import filter info - shown when imports are selected */}
      {selectedImportIds.length > 0 && importHistory.length > 0 && (
        <div className="flex items-center gap-3 px-2">
          <span className="text-sm text-muted-foreground">Filtered by imports:</span>
          <div className="flex flex-wrap gap-2">
            {selectedImportIds.map((id) => {
              const importFile = importHistory.find((i: ImportedFile) => i.id === id);
              return (
                <Badge key={id} variant="secondary" className="gap-1">
                  <FileSpreadsheet className="h-3 w-3" />
                  {importFile?.filename || `Import #${id}`}
                  <button
                    onClick={() => setSelectedImportIds(prev => prev.filter(i => i !== id))}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
            <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSelectedImportIds([])}>
              Clear all
            </Button>
          </div>
        </div>
      )}

      <section className="space-y-4">
        {isLoading ? (
          viewMode === "table" ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-24"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-12"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-8"></div></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-5 bg-muted rounded w-48"></div>
                      <div className="h-6 bg-muted rounded w-20"></div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-full max-w-md"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        ) : visibleLeads.length === 0 ? (
          <Card className="p-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No leads found</h3>
            <p className="text-muted-foreground mb-4">
              {filteredLeads.length === 0 && leadsData.length === 0
                ? "Get started by adding your first lead."
                : "Try adjusting your filters or search terms."}
            </p>
            {canEdit && canUseQuickCreate && (
              <Button onClick={() => openQuickCreate?.("lead")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            )}
          </Card>
        ) : viewMode === "table" ? (
          <Card>
            {selectedLeadIds.length > 0 && (
              <div className="flex items-center justify-between bg-primary/5 px-4 py-2 border-b">
                <span className="text-sm font-medium">{selectedLeadIds.length} selected</span>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const bulkLeads = visibleLeads.filter((l: Lead) => selectedLeadIds.includes(l.id));
                      setSelectedLead(bulkLeads[0]);
                      setEmailDialogOpen(true);
                    }}
                  >
                    <Mail className="h-4 w-4 mr-1" />
                    Send Email ({selectedLeadIds.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm(`Delete ${selectedLeadIds.length} leads?`)) {
                        selectedLeadIds.forEach(id => deleteLeadMutation.mutate(id));
                        setSelectedLeadIds([]);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedLeadIds([])}>
                    Clear
                  </Button>
                </div>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox 
                      checked={selectedLeadIds.length === visibleLeads.length && visibleLeads.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedLeadIds(visibleLeads.map((l: Lead) => l.id));
                        } else {
                          setSelectedLeadIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold">Company</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Score</TableHead>
                  <TableHead className="font-semibold">Source</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleLeads.map((lead: Lead) => (
                  <TableRow key={lead.id} className={cn("hover:bg-muted/50 transition-colors", selectedLeadIds.includes(lead.id) && "bg-primary/5")}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedLeadIds.includes(lead.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedLeadIds([...selectedLeadIds, lead.id]);
                          } else {
                            setSelectedLeadIds(selectedLeadIds.filter(id => id !== lead.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{lead.email}</span>
                        <button
                          onClick={() => copyEmail(lead.email)}
                          className="ml-1 p-1 rounded hover:bg-accent transition-colors"
                          title="Copy email"
                        >
                          {copiedEmail === lead.email ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.company ? (
                        <span className="text-sm">{lead.company}</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select 
                        value={lead.status} 
                        onValueChange={async (newStatus) => {
                          if (newStatus !== lead.status) {
                            try {
                              await crmService.updateLeadStage(lead.id, newStatus);
                              queryClient.invalidateQueries({ queryKey: ["leads"] });
                              queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
                              toast.success(`Stage updated to ${newStatus}`);
                            } catch (error) {
                              const err = error as { message?: string };
                              console.error("Failed to update stage:", error);
                              toast.error(err?.message || "Failed to update stage");
                            }
                          }
                        }}
                      >
                        <SelectTrigger className={cn("w-[130px] h-7 text-xs", LEAD_STATUSES.find(s => s.value === lead.status)?.color)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGE_ORDER.map((status) => (
                            <SelectItem key={status} value={status}>
                              <span className="capitalize">{status.replace("_", " ")}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-primary" />
                        <span className="font-medium">{lead.score}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {lead.source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setSelectedLead(lead); setEmailDialogOpen(true); }}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          {canEdit && (
                            <>
                              <DropdownMenuItem onClick={() => openQuickCreate?.("lead", lead)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Lead
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  if (window.confirm(`Delete lead "${lead.firstName} ${lead.lastName}"?`)) {
                                    deleteLeadMutation.mutate(lead.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Lead
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {hasMore && (
              <div className="p-4 border-t">
                <div className="text-center">
                  <ShowMoreButton
                    onClick={() => {
                      if (selectedImportIds.length > 0) {
                        setVisibleCount((prev) => prev + LEADS_PAGE_SIZE);
                        return;
                      }
                      leadsQuery.fetchNextPage();
                    }}
                    loading={selectedImportIds.length === 0 && leadsQuery.isFetchingNextPage}
                  />
                </div>
              </div>
            )}
          </Card>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            {visibleLeads.map((lead: Lead) => (
              <motion.div key={lead.id} variants={item}>
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-foreground truncate">
                          {lead.firstName} {lead.lastName}
                        </h3>
                        <Select 
                          value={lead.status} 
                          onValueChange={async (newStatus) => {
                            if (newStatus !== lead.status) {
                              try {
                                await crmService.updateLeadStage(lead.id, newStatus);
                                queryClient.invalidateQueries({ queryKey: ["leads"] });
                                queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
                                toast.success(`Stage updated to ${newStatus}`);
                              } catch (error) {
                                const err = error as { message?: string };
                                console.error("Failed to update stage:", error);
                                toast.error(err?.message || "Failed to update stage");
                              }
                            }
                          }}
                        >
                          <SelectTrigger className={cn("w-[120px] h-7 text-xs", LEAD_STATUSES.find(s => s.value === lead.status)?.color)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGE_ORDER.map((status) => (
                              <SelectItem key={status} value={status}>
                                <span className="capitalize">{status.replace("_", " ")}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Target className="h-4 w-4" />
                          <span>Score: {lead.score}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{lead.email}</span>
                          <button
                            onClick={() => copyEmail(lead.email)}
                            className="p-1 rounded hover:bg-accent transition-colors"
                            title="Copy email"
                          >
                            {copiedEmail === lead.email ? (
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 hover:text-foreground" />
                            )}
                          </button>
                        </div>
                        {lead.company && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building className="h-4 w-4" />
                            <span className="truncate">{lead.company}</span>
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(lead.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {lead.notes && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {lead.notes}
                        </p>
                      )}

                      <div className="flex items-center gap-2">
                        {lead.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {lead.assignedTo && (
                          <Badge variant="outline" className="text-xs">
                            Assigned to {lead.assignedTo}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        
                        {/* Stage & Activity Actions */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openStageDialog(lead)}>
                          <ChevronRight className="h-4 w-4 mr-2 text-primary" />
                          Change Stage
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openActivityDialog(lead)}>
                          <MessageSquare className="h-4 w-4 mr-2 text-info" />
                          Log Activity
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openMeetingDialog(lead)}>
                          <Video className="h-4 w-4 mr-2 text-success" />
                          Schedule Meeting
                        </DropdownMenuItem>

                        {/* GTM Actions */}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => {
                            toast.promise(
                              crmService.recalculateLeadScore(lead.id).then((result) => {
                                queryClient.invalidateQueries({ queryKey: ["leads"] });
                                queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
                                return `Score recalculated: ${result.score}`;
                              }),
                              { loading: "Recalculating score...", success: "Score updated!", error: "Failed" }
                            );
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                          Recalculate Score
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            toast.promise(
                              crmService.createLeadFollowUp(lead.id).then(() => {
                                queryClient.invalidateQueries({ queryKey: ["tasks"] });
                                queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
                                return "Follow-up sequence created!";
                              }),
                              { loading: "Creating follow-ups...", success: "Tasks created!", error: "Failed" }
                            );
                          }}
                        >
                          <Calendar className="h-4 w-4 mr-2 text-green-500" />
                          Create Follow-up
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => {
                            toast.promise(
                              crmService.assignLeadToRep(lead.id).then((result) => {
                                queryClient.invalidateQueries({ queryKey: ["leads"] });
                                queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
                                return result.assigned ? `Assigned to ${result.repEmail}` : "No reps available";
                              }),
                              { loading: "Finding best rep...", success: "Assigned!", error: "Failed" }
                            );
                          }}
                        >
                          <User className="h-4 w-4 mr-2 text-purple-500" />
                          Assign to Best Rep
                        </DropdownMenuItem>
                        {(lead.status === "qualified" || lead.status === "proposal" || lead.status === "negotiation" || lead.status === "won") && (
                          <DropdownMenuItem
                            onClick={() => {
                              toast.promise(
                                crmService.convertLeadToClient(lead.id, {
                                  clientName: lead.company || `${lead.firstName} ${lead.lastName}`,
                                  tier: lead.score >= 80 ? "Strategic" : "Growth",
                                }).then((result) => {
                                  queryClient.invalidateQueries({ queryKey: ["leads"] });
                                  queryClient.invalidateQueries({ queryKey: ["clients"] });
                                  queryClient.invalidateQueries({ queryKey: ["contacts"] });
                                  queryClient.invalidateQueries({ queryKey: ["deals"] });
                                  queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
                                  return `Converted to client ${result.client.name}`;
                                }),
                                { loading: "Converting lead...", success: "Lead converted!", error: "Failed" }
                              );
                            }}
                          >
                            <Building className="h-4 w-4 mr-2 text-emerald-500" />
                            Convert to Client
                          </DropdownMenuItem>
                        )}
                        
                        {canEdit && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => openQuickCreate?.("lead", lead)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                if (window.confirm(`Delete lead "${lead.firstName} ${lead.lastName}"?`)) {
                                  deleteLeadMutation.mutate(lead.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Lead
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              </motion.div>
            ))}

            {hasMore && (
              <div className="text-center pt-4">
                <ShowMoreButton
                  onClick={() => {
                    if (selectedImportIds.length > 0) {
                      setVisibleCount((prev) => prev + LEADS_PAGE_SIZE);
                      return;
                    }
                    leadsQuery.fetchNextPage();
                  }}
                  loading={selectedImportIds.length === 0 && leadsQuery.isFetchingNextPage}
                />
              </div>
            )}
          </motion.div>
        )}
      </section>

      {/* Stage Change Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Lead Stage</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedLead && (
              <div className="p-3 rounded-lg bg-secondary/20 border border-border/40">
                <p className="font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                <p className="text-sm text-muted-foreground">{selectedLead.company || selectedLead.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Current: <span className="font-medium capitalize">{selectedLead.status.replace("_", " ")}</span>
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>New Stage</Label>
              <Select value={newStage} onValueChange={setNewStage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_ORDER.map((status) => (
                    <SelectItem key={status} value={status}>
                      <span className="capitalize">{status.replace("_", " ")}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {getNextStage(selectedLead?.status || "") && newStage !== selectedLead?.status && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  Move from <strong className="capitalize">{selectedLead?.status.replace("_", " ")}</strong> to <strong className="capitalize">{newStage.replace("_", " ")}</strong>
                </span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={stageNotes}
                onChange={(e) => setStageNotes(e.target.value)}
                placeholder="Add notes about this stage change..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleStageChange} disabled={!newStage || newStage === selectedLead?.status}>
              Update Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Log Dialog */}
      <Dialog open={activityDialogOpen} onOpenChange={setActivityDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedLead && (
              <div className="p-3 rounded-lg bg-secondary/20 border border-border/40">
                <p className="font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                <p className="text-sm text-muted-foreground">{selectedLead.company || selectedLead.email}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Activity Type</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: "call", label: "Call", icon: Phone },
                  { value: "email", label: "Email", icon: Mail },
                  { value: "meeting", label: "Meeting", icon: Video },
                  { value: "note", label: "Note", icon: MessageSquare },
                ].map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setActivityType(type.value as typeof activityType)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all",
                      activityType === type.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/40 bg-secondary/20 hover:border-primary/50"
                    )}
                  >
                    <type.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
                placeholder={activityType === "call" ? "Sales call - discussed pricing" : activityType === "email" ? "Sent proposal follow-up" : activityType === "meeting" ? "Discovery meeting" : "Call with decision maker"}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
                placeholder="Add details about this activity..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivityDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLogActivity} disabled={!activityTitle}>
              Log Activity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Dialog */}
      <Dialog open={meetingDialogOpen} onOpenChange={setMeetingDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedLead && (
              <div className="p-3 rounded-lg bg-secondary/20 border border-border/40">
                <p className="font-medium">{selectedLead.firstName} {selectedLead.lastName}</p>
                <p className="text-sm text-muted-foreground">{selectedLead.email}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>Meeting Title</Label>
              <Input
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Product Demo - Acme Corp"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={meetingTime}
                  onChange={(e) => setMeetingTime(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Meeting Type</Label>
                <Select value={meetingType} onValueChange={(v) => setMeetingType(v as typeof meetingType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="jitsi">Video (Jitsi - Free)</SelectItem>
                    <SelectItem value="google">Video (Google Meet)</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="in_person">In Person</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Agenda</Label>
              <Textarea
                value={meetingAgenda}
                onChange={(e) => setMeetingAgenda(e.target.value)}
                placeholder="1. Introduction&#10;2. Product demo&#10;3. Q&A&#10;4. Next steps"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateMeeting} disabled={!meetingTitle || !meetingDate || !meetingTime}>
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>

    {/* Lead Email Dialog — single or bulk */}
    {emailDialogOpen && (
      <LeadEmailDialog
        open={emailDialogOpen}
        onClose={() => { setEmailDialogOpen(false); setSelectedLeadIds([]); }}
        leads={selectedLeadIds.length > 1
          ? visibleLeads.filter((l: Lead) => selectedLeadIds.includes(l.id))
          : undefined}
        lead={selectedLeadIds.length <= 1 ? selectedLead ?? undefined : undefined}
      />
    )}
  </>
  );
};

export default LeadsPage;
