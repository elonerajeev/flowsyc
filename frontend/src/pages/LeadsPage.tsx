import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from 'xlsx';
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
import ErrorFallback from "@/components/shared/ErrorFallback";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import AdminOnly from "@/components/shared/AdminOnly";
import type { Lead } from "@/types/crm";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const LEAD_STATUSES = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  { value: "qualified", label: "Qualified", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  { value: "proposal", label: "Proposal", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  { value: "won", label: "Won", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300" },
  { value: "lost", label: "Lost", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
] as const;

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

  const canEdit = role === "admin" || role === "manager";

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

  // Fetch leads
  const { data: leadsData, isLoading, error } = useQuery({
    queryKey: ["leads"],
    queryFn: crmService.getLeads,
    staleTime: 30000, // 30 seconds
  });

  // Filter and search leads
  const filteredLeads = useMemo(() => {
    if (!leadsData) return [];

    const filtered = leadsData.filter((lead: Lead) => {
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches =
          lead.firstName.toLowerCase().includes(term) ||
          lead.lastName.toLowerCase().includes(term) ||
          lead.email.toLowerCase().includes(term) ||
          lead.company?.toLowerCase().includes(term) ||
          lead.jobTitle?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      // Status filter
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;

      // Source filter
      if (sourceFilter !== "all" && lead.source !== sourceFilter) return false;

      // Score range filter
      if (lead.score < scoreRange[0] || lead.score > scoreRange[1]) return false;

      // Assigned filter
      if (assignedFilter !== "all") {
        if (assignedFilter === "assigned" && !lead.assignedTo) return false;
        if (assignedFilter === "unassigned" && lead.assignedTo) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a: Lead, b: Lead) => {
      let aVal: string | number, bVal: string | number;

      switch (sortBy) {
        case "name":
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "score":
          aVal = a.score;
          bVal = b.score;
          break;
        case "createdAt":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          aVal = new Date(a.updatedAt).getTime();
          bVal = new Date(b.updatedAt).getTime();
          break;
        default:
          aVal = a[sortBy as keyof Lead];
          bVal = b[sortBy as keyof Lead];
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [leadsData, searchTerm, statusFilter, sourceFilter, scoreRange, assignedFilter, sortBy, sortOrder]);

  const visibleLeads = filteredLeads.slice(0, visibleCount);
  const hasMore = filteredLeads.length > visibleCount;

  // Statistics
  const stats = useMemo(() => {
    if (!leadsData) return { total: 0, new: 0, qualified: 0, converted: 0, avgScore: 0 };

    const leads = leadsData;
    const total = leads.length;
    const newLeads = leads.filter((l: Lead) => l.status === "new").length;
    const qualified = leads.filter((l: Lead) => l.status === "qualified").length;
    const converted = leads.filter((l: Lead) => l.convertedToClientId).length;
    const avgScore = total > 0 ? Math.round(leads.reduce((sum: number, l: Lead) => sum + l.score, 0) / total) : 0;

    return { total, new: newLeads, qualified, converted, avgScore };
  }, [leadsData]);

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

  // Import leads with multiple format support
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let rawRows: Record<string, unknown>[] = [];
      let headers: string[] = [];

      try {
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          // Excel file
          const arrayBuffer = await file.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: 'array' });
          
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Excel file contains no worksheets');
          }
          
          // Find the best sheet to read (skip "Summary" or similar metadata sheets)
          let sheetName = workbook.SheetNames[0];
          let maxRows = 0;
          let bestSheetIndex = 0;
          
          // Find sheet with most data
          for (let i = 0; i < workbook.SheetNames.length; i++) {
            const name = workbook.SheetNames[i];
            const worksheet = workbook.Sheets[name];
            if (worksheet) {
              const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              if (data.length > maxRows) {
                maxRows = data.length;
                bestSheetIndex = i;
                sheetName = name;
              }
            }
          }
          
          // Skip "Summary" sheet if there's a better option
          if (sheetName.toLowerCase().includes('summary') && workbook.SheetNames.length > 1) {
            for (let i = 0; i < workbook.SheetNames.length; i++) {
              if (!workbook.SheetNames[i].toLowerCase().includes('summary')) {
                sheetName = workbook.SheetNames[i];
                bestSheetIndex = i;
                break;
              }
            }
          }
          
          const worksheet = workbook.Sheets[sheetName];
          
          if (!worksheet) {
            throw new Error('Could not read worksheet from Excel file');
          }
          
          rawRows = XLSX.utils.sheet_to_json(worksheet);

        } else if (fileExtension === 'csv' || fileExtension === 'txt') {
          // CSV file
          const text = await file.text();
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            throw new Error('CSV file must contain at least a header row and one data row');
          }

          // Use first line as headers
          headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
          
          rawRows = lines.slice(1).map(row => {
            // Handle CSV with quotes
            const values = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
            const cleanedValues = values.map(cell => cell.replace(/^"|"$/g, '').trim());
            const rowData: Record<string, unknown> = {};
            headers.forEach((header, index) => {
              rowData[header] = cleanedValues[index] || '';
            });
            return rowData;
          });

        } else {
          throw new Error(`Unsupported file format: ${fileExtension}. Please upload a CSV or Excel (.xlsx, .xls) file.`);
        }

        // Check if we have any data
        if (rawRows.length === 0) {
          throw new Error('No data rows found in the file. Make sure your file has data beyond the header row.');
        }

        // Get all unique column names from the file
        const allColumns = new Set<string>();
        rawRows.forEach(row => {
          Object.keys(row).forEach(key => allColumns.add(key));
        });
        const fileColumns = Array.from(allColumns);
        
        // Check if file looks like a lead file (has at least some useful columns)
        const leadColumnPatterns = ['firstname', 'first_name', 'first name', 'lastname', 'last_name', 'last name', 'email', 'name', 'company', 'phone', 'mobile', 'contact'];
        const hasUsefulColumns = fileColumns.some(col => 
          leadColumnPatterns.some(pattern => col.toLowerCase().includes(pattern))
        );

        if (!hasUsefulColumns) {
          const errorMsg = `This file doesn't appear to be a lead list.\n\n` +
            `File columns found: ${fileColumns.slice(0, 10).join(', ')}${fileColumns.length > 10 ? '...' : ''}\n\n` +
            `Your file should contain columns like: Name, Email, Phone, Company, etc.\n` +
            `If this is a summary/statistics file, it cannot be imported as leads.`;
          throw new Error(errorMsg);
        }

        // Convert raw rows to lead objects
        const leads: (Record<string, unknown> & { _isValid?: boolean; _validationErrors?: string[] })[] = rawRows.map((row, rowIndex) => {
          const rowKeys = Object.keys(row);
          
          // Flexible column mapping
          const getValue = (keys: string[]): string => {
            for (const key of keys) {
              if (row[key] !== undefined && row[key] !== '' && row[key] !== null) {
                return String(row[key]).trim();
              }
            }
            // Try normalized matches
            for (const key of keys) {
              const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
              const directKey = rowKeys.find(k =>
                k.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedKey
              );
              if (directKey && row[directKey] !== undefined && row[directKey] !== '') {
                return String(row[directKey]).trim();
              }
            }
            // Try partial matches
            for (const key of keys) {
              const keyParts = key.toLowerCase().split(/\s+/);
              const matchingKey = rowKeys.find(k => {
                const kLower = k.toLowerCase();
                return keyParts.every(part => kLower.includes(part));
              });
              if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== '') {
                return String(row[matchingKey]).trim();
              }
            }
            return '';
          };

          // Try to extract name parts
          const fullName = getValue(['name', 'full name', 'fullname', 'contact', 'contact name', 'person']);
          let firstName = getValue(['first name', 'firstname', 'first_name', 'fname', 'first']);
          let lastName = getValue(['last name', 'lastname', 'last_name', 'lname', 'last']);
          
          // If we have full name but no first/last, split it
          if (fullName && !firstName && !lastName) {
            const nameParts = fullName.split(/\s+/);
            firstName = nameParts[0] || '';
            lastName = nameParts.slice(1).join(' ') || '';
          }

          const lead = {
            firstName,
            lastName,
            email: getValue(['email', 'email address', 'e-mail', 'emailaddress', 'mail', 'electronic mail']),
            phone: getValue(['phone', 'phone number', 'phone number', 'mobile', 'telephone', 'cell', 'contact number', 'phone no']),
            company: getValue(['company', 'organization', 'org', 'employer', 'company name', 'company name']),
            jobTitle: getValue(['job title', 'jobtitle', 'title', 'position', 'role', 'occupation', 'designation']),
            source: getValue(['source', 'lead source', 'origin', 'campaign', 'how did you hear']) || 'website',
            status: getValue(['status', 'lead status', 'stage', 'lead stage']) || 'new',
            score: parseInt(getValue(['score', 'lead score', 'rating', 'points'])) || 50,
            assignedTo: getValue(['assigned to', 'assignedto', 'assignee', 'owner', 'sales rep', 'rep']),
            notes: getValue(['notes', 'comments', 'description', 'remarks', 'comments']),
          };

          // Validate this lead
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const validationErrors: string[] = [];

          // Check if row has any meaningful data (not completely empty)
          const hasAnyData = Object.values(lead).some(v => v && v !== '' && v !== '50');
          if (!hasAnyData) {
            validationErrors.push('Row is empty or has no relevant data');
          }

          if (!lead.firstName?.trim() && !lead.lastName?.trim() && !lead.email?.trim()) {
            validationErrors.push('Missing name and email');
          } else {
            if (!lead.firstName?.trim() && !lead.lastName?.trim()) {
              validationErrors.push('Missing name');
            }
            if (!lead.email?.trim()) {
              validationErrors.push('Missing email');
            } else if (!emailRegex.test(lead.email)) {
              validationErrors.push(`Invalid email: "${lead.email}"`);
            }
          }

          // Normalize source
          const validSources = ['website', 'referral', 'social', 'email', 'cold_call', 'event', 'partner', 'linkedin', 'inbound'];
          if (!validSources.includes(lead.source.toLowerCase())) {
            lead.source = 'website';
          }

          // Normalize status
          const validStatuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
          if (!validStatuses.includes(lead.status.toLowerCase())) {
            lead.status = 'new';
          }

          // Normalize score
          lead.score = Math.max(0, Math.min(100, lead.score));

          return {
            ...lead,
            _isValid: validationErrors.length === 0,
            _validationErrors: validationErrors,
            _rowNumber: rowIndex + 2 // +2 because row 1 is headers
          };
        });

        const validLeads = leads.filter(l => l._isValid);
        const invalidLeads = leads.filter(l => !l._isValid);

        // If no valid leads at all, show detailed error
        if (validLeads.length === 0) {
          let errorMessage = `No valid leads found in the file.\n\n`;
          errorMessage += `Your file has ${leads.length} rows, but none have the required information.\n\n`;
          
          // Show what columns we found
          errorMessage += `Columns found in your file:\n`;
          fileColumns.slice(0, 15).forEach(col => {
            errorMessage += `  • ${col}\n`;
          });
          if (fileColumns.length > 15) {
            errorMessage += `  ... and ${fileColumns.length - 15} more columns\n`;
          }
          
          errorMessage += `\nTo import leads, your file needs:\n`;
          errorMessage += `  • Name (First Name & Last Name OR Full Name)\n`;
          errorMessage += `  • Email address\n`;
          
          // Show first few invalid rows as examples
          if (invalidLeads.length > 0) {
            errorMessage += `\nFirst few rows in your file:\n`;
            invalidLeads.slice(0, 3).forEach((lead) => {
              const preview = [
                lead.firstName || '-',
                lead.lastName || '-', 
                lead.email || '-',
                lead.company || '-'
              ].join(' | ');
              errorMessage += `  Row ${lead._rowNumber}: ${preview}\n`;
              if (lead._validationErrors?.length) {
                errorMessage += `    Issues: ${lead._validationErrors.join(', ')}\n`;
              }
            });
          }
          
          errorMessage += `\nTip: Make sure your file has actual contact data with names and email addresses.`;
          
          throw new Error(errorMessage);
        }

        // Import valid leads via API
        let importedCount = 0;
        for (const lead of validLeads) {
          const { _isValid, _validationErrors, _rowNumber, ...leadData } = lead as Record<string, unknown>;
          try {
            await crmService.createLead({
              ...leadData,
              source: String(leadData.source).toLowerCase() as Lead['source'],
              status: String(leadData.status).toLowerCase() as Lead['status'],
              phone: leadData.phone || undefined,
              company: leadData.company || undefined,
              jobTitle: leadData.jobTitle || undefined,
              assignedTo: leadData.assignedTo || undefined,
              notes: leadData.notes || undefined,
            });
            importedCount++;
          } catch (err) {
            console.warn(`Failed to import lead row ${lead._rowNumber}:`, err);
          }
        }

        return { 
          imported: importedCount, 
          total: leads.length, 
          invalid: invalidLeads.length,
          skipped: leads.length - validLeads.length
        };

    } catch (error) {
        throw new Error(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    onSuccess: (result) => {
      let message = `Successfully imported ${result.imported} leads!`;
      if (result.invalid > 0) {
        message += ` ${result.invalid} rows skipped (no valid email/name).`;
      }
      toast.success(message);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to import leads";
      toast.error(errorMessage, {
        description: errorMessage.length > 200 ? "Check the console or your file format" : undefined,
        duration: 10000,
      });
    },
  });

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  if (error) {
    return <ErrorFallback error={error as Error} />;
  }

  return (
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2">
              <TrendingUp className="h-4 w-4 text-success flex-shrink-0" />
              <span className="text-sm font-medium text-success">{stats.total} total leads</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2">
              <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
              <span className="text-sm font-medium text-warning">{stats.new} new</span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters and Actions */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search leads by name, email, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {LEAD_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {LEAD_SOURCES.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={assignedFilter} onValueChange={setAssignedFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split("-");
              setSortBy(field);
              setSortOrder(order as "asc" | "desc");
            }}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="updatedAt-desc">Recently Updated</SelectItem>
                <SelectItem value="score-desc">Highest Score</SelectItem>
                <SelectItem value="score-asc">Lowest Score</SelectItem>
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setSourceFilter("all");
                setScoreRange([0, 100]);
                setAssignedFilter("all");
                setSortBy("createdAt");
                setSortOrder("desc");
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Score Range Filter */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm font-medium text-foreground">Score Range:</span>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max="100"
              value={scoreRange[0]}
              onChange={(e) => setScoreRange([parseInt(e.target.value) || 0, scoreRange[1]])}
              className="w-20"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              min="0"
              max="100"
              value={scoreRange[1]}
              onChange={(e) => setScoreRange([scoreRange[0], parseInt(e.target.value) || 100])}
              className="w-20"
            />
          </div>
          <Badge variant="outline" className="ml-2">
            {scoreRange[0]} - {scoreRange[1]}
          </Badge>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          <Link to="/automation/gtm">
            <Button variant="outline">
              <Target className="h-4 w-4 mr-2" />
              GTM Center
            </Button>
          </Link>
          {canEdit && canUseQuickCreate && (
            <Button onClick={() => openQuickCreate?.("lead")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || filteredLeads.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? "Exporting..." : "Export CSV"}
          </Button>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "table" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
            >
              <TableIcon className="h-4 w-4 mr-2" />
              Table
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("cards")}
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Cards
            </Button>
          </div>

          <AdminOnly>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={importMutation.isPending}>
                  <Upload className="h-4 w-4 mr-2" />
                  {importMutation.isPending ? "Importing..." : "Import Data"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Supported Formats:</p>
                  <div className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                      <FileSpreadsheet className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Excel (.xlsx, .xls)</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImport}
                        className="hidden"
                        disabled={importMutation.isPending}
                      />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">CSV (.csv)</span>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImport}
                        className="hidden"
                        disabled={importMutation.isPending}
                      />
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 rounded">
                      <FileText className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">Text (.txt)</span>
                      <input
                        type="file"
                        accept=".txt"
                        onChange={handleImport}
                        className="hidden"
                        disabled={importMutation.isPending}
                      />
                    </label>
                  </div>
                  <div className="mt-3 pt-2 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Expected Columns:</p>
                    <p className="text-xs text-muted-foreground">
                      First Name, Last Name, Email, Phone, Company, Job Title, Source, Status, Score, Assigned To, Notes
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Valid Sources:</strong> website, referral, social, email, cold_call, event, partner<br/>
                      <strong>Valid Status:</strong> new, contacted, qualified, proposal, negotiation, won, lost
                    </p>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </AdminOnly>
        </div>
      </section>

      {/* Leads Display */}
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
              {filteredLeads.length === 0 && leadsData?.length === 0
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
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableRow key={lead.id} className="hover:bg-muted/50 transition-colors">
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
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{lead.company}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={LEAD_STATUSES.find(s => s.value === lead.status)?.color}>
                        {LEAD_STATUSES.find(s => s.value === lead.status)?.label}
                      </Badge>
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
                    onClick={() => setVisibleCount(prev => prev + LEADS_PAGE_SIZE)}
                    loading={false}
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
                        <Badge className={LEAD_STATUSES.find(s => s.value === lead.status)?.color}>
                          {LEAD_STATUSES.find(s => s.value === lead.status)?.label}
                        </Badge>
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
                  onClick={() => setVisibleCount(prev => prev + LEADS_PAGE_SIZE)}
                  loading={false}
                />
              </div>
            )}
          </motion.div>
        )}
      </section>
    </div>
  );
};

export default LeadsPage;
