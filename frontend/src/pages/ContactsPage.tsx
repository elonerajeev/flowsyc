import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Table as TableIcon,
  Grid3X3,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const JOB_TITLES = [
  "CEO", "CTO", "CFO", "COO", "CMO", "CIO", "VP", "Director", "Manager",
  "Senior", "Lead", "Principal", "Staff", "Engineer", "Developer", "Designer",
  "Analyst", "Consultant", "Specialist", "Coordinator", "Assistant"
];

const DEPARTMENTS = [
  "Engineering", "Product", "Design", "Marketing", "Sales", "HR", "Finance",
  "Operations", "Customer Success", "Support", "Legal", "Executive"
];

const SENIORITY_LEVELS = [
  "Executive", "Senior", "Mid", "Junior", "Individual Contributor"
];

const ContactsPage = () => {
  const { role } = useTheme();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const queryClient = useQueryClient();

  // Filters and search
  const [searchTerm, setSearchTerm] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [seniorityFilter, setSeniorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // View mode
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  const CONTACTS_PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(CONTACTS_PAGE_SIZE);

  const canEdit = role === "admin" || role === "manager";

  // Fetch contacts and clients
  const { data: contactsData, isLoading, error, refetch } = useQuery({
    queryKey: ["contacts"],
    queryFn: crmService.getContacts,
    staleTime: 30000,
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: crmService.getClients,
    staleTime: 60000,
  });

  // Type definitions for contact data
  type ContactType = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    jobTitle?: string;
    department?: string;
    clientId?: number;
    companyName?: string;
    createdAt: string;
    updatedAt: string;
  };

  type ClientType = {
    id: number;
    name: string;
  };

  // Filter and search contacts
  const filteredContacts = useMemo(() => {
    if (!contactsData?.data) return [];

    const filtered = contactsData.data.filter((contact: ContactType) => {
      // Search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matches =
          contact.firstName.toLowerCase().includes(term) ||
          contact.lastName.toLowerCase().includes(term) ||
          contact.email.toLowerCase().includes(term) ||
          contact.jobTitle?.toLowerCase().includes(term) ||
          contact.companyName?.toLowerCase().includes(term) ||
          contact.department?.toLowerCase().includes(term);
        if (!matches) return false;
      }

      // Company filter
      if (companyFilter !== "all" && contact.clientId !== companyFilter) return false;

      // Department filter
      if (departmentFilter !== "all" && contact.department !== departmentFilter) return false;

      // Seniority filter
      if (seniorityFilter !== "all") {
        const seniorityLevel = getSeniorityLevel(contact.jobTitle);
        if (seniorityLevel !== seniorityFilter) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a: ContactType, b: ContactType) => {
      let aVal: string | number, bVal: string | number;

      switch (sortBy) {
        case "name":
          aVal = `${a.firstName} ${a.lastName}`.toLowerCase();
          bVal = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "company":
          aVal = a.companyName?.toLowerCase() || "";
          bVal = b.companyName?.toLowerCase() || "";
          break;
        case "jobTitle":
          aVal = a.jobTitle?.toLowerCase() || "";
          bVal = b.jobTitle?.toLowerCase() || "";
          break;
        case "department":
          aVal = a.department?.toLowerCase() || "";
          bVal = b.department?.toLowerCase() || "";
          break;
        case "createdAt":
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        default:
          aVal = a[sortBy as keyof typeof a] || "";
          bVal = b[sortBy as keyof typeof b] || "";
      }

      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [contactsData, searchTerm, companyFilter, departmentFilter, seniorityFilter, sortBy, sortOrder]);

  const visibleContacts = filteredContacts.slice(0, visibleCount);
  const hasMore = filteredContacts.length > visibleCount;

  // Statistics
  const stats = useMemo(() => {
    if (!contactsData?.data) return { total: 0, companies: 0, avgPerCompany: 0 };

    const contacts = contactsData.data;
    const total = contacts.length;
    const uniqueCompanies = new Set(contacts.map((c: ContactType) => c.clientId).filter(Boolean)).size;
    const avgPerCompany = uniqueCompanies > 0 ? Math.round(total / uniqueCompanies) : 0;

    return { total, companies: uniqueCompanies, avgPerCompany };
  }, [contactsData]);

  // Company options for filter
  const companyOptions = useMemo(() => {
    if (!clientsData?.data) return [];
    return clientsData.data.map((client: ClientType) => ({
      value: client.id.toString(),
      label: client.name
    }));
  }, [clientsData]);

  // Helper function to determine seniority level
  function getSeniorityLevel(jobTitle?: string): string {
    if (!jobTitle) return "Individual Contributor";

    const title = jobTitle.toLowerCase();
    if (title.includes("ceo") || title.includes("cfo") || title.includes("cto") ||
        title.includes("coo") || title.includes("cmo") || title.includes("cio")) {
      return "Executive";
    }
    if (title.includes("vp") || title.includes("vice president") ||
        title.includes("director") || title.includes("head")) {
      return "Senior";
    }
    if (title.includes("manager") || title.includes("lead") || title.includes("principal")) {
      return "Mid";
    }
    if (title.includes("senior") || title.includes("sr")) {
      return "Mid";
    }
    return "Individual Contributor";
  }

  // Export contacts
  const exportMutation = useMutation({
    mutationFn: async () => {
      const exportData = filteredContacts.map((contact: ContactType) => ({
        "First Name": contact.firstName,
        "Last Name": contact.lastName,
        "Email": contact.email,
        "Phone": contact.phone || "",
        "Job Title": contact.jobTitle || "",
        "Department": contact.department || "",
        "Company": contact.companyName || "",
        "Seniority Level": getSeniorityLevel(contact.jobTitle),
        "Created At": contact.createdAt,
        "Updated At": contact.updatedAt,
      }));

      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(","),
        ...exportData.map((row: Record<string, unknown>) =>
          headers.map((header) => `"${String(row[header]).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `contacts_export_${new Date().toISOString().split("T")[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    onSuccess: () => toast.success("Contacts exported successfully!"),
    onError: () => toast.error("Failed to export contacts"),
  });

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
              <User className="h-3.5 w-3.5 text-primary" />
              Sales · Contacts
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Contact Management</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                Manage individual contacts within your client organizations for targeted outreach and relationship building.
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2">
              <TrendingUp className="h-4 w-4 text-success flex-shrink-0" />
              <span className="text-sm font-medium text-success">{stats.total} total contacts</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
              <Building className="h-4 w-4 text-primary flex-shrink-0" />
              <span className="text-sm font-medium text-primary">{stats.companies} companies</span>
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
              placeholder="Search contacts by name, email, company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companyOptions.map((company) => (
                  <SelectItem key={company.value} value={company.value}>
                    {company.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={seniorityFilter} onValueChange={setSeniorityFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {SENIORITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
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
                <SelectItem value="name-asc">Name A-Z</SelectItem>
                <SelectItem value="name-desc">Name Z-A</SelectItem>
                <SelectItem value="company-asc">Company A-Z</SelectItem>
                <SelectItem value="company-desc">Company Z-A</SelectItem>
                <SelectItem value="jobTitle-asc">Title A-Z</SelectItem>
                <SelectItem value="createdAt-desc">Recently Added</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setCompanyFilter("all");
                setDepartmentFilter("all");
                setSeniorityFilter("all");
                setSortBy("name");
                setSortOrder("asc");
              }}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-3">
          {canEdit && canUseQuickCreate && (
            <Button onClick={() => openQuickCreate?.("contact")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending || filteredContacts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>

          {/* View Toggle */}
          <div className="flex items-center gap-2 ml-auto">
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
        </div>
      </section>

      {/* Contacts Display */}
      <section className="space-y-4">
        {isLoading ? (
          viewMode === "table" ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Email</TableHead>
                    <TableHead className="font-semibold">Job Title</TableHead>
                    <TableHead className="font-semibold">Company</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Level</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-24"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-28"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20"></div></TableCell>
                      <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16"></div></TableCell>
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
        ) : visibleContacts.length === 0 ? (
          <Card className="p-12 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No contacts found</h3>
            <p className="text-muted-foreground mb-4">
              {filteredContacts.length === 0 && contactsData?.data?.length === 0
                ? "Get started by adding your first contact."
                : "Try adjusting your filters or search terms."}
            </p>
            {canEdit && canUseQuickCreate && (
              <Button onClick={() => openQuickCreate?.("contact")}>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
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
                  <TableHead className="font-semibold">Job Title</TableHead>
                  <TableHead className="font-semibold">Company</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Level</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleContacts.map((contact: ContactType) => (
                  <TableRow key={contact.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{contact.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {contact.jobTitle || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {contact.companyName ? (
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{contact.companyName}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {contact.department || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getSeniorityLevel(contact.jobTitle)}
                      </Badge>
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
                              <DropdownMenuItem>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Contact
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Contact
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
                    onClick={() => setVisibleCount(prev => prev + CONTACTS_PAGE_SIZE)}
                    loading={false}
                  />
                </div>
              </div>
            )}
          </Card>
        ) : (
          <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
            {visibleContacts.map((contact: ContactType) => (
              <motion.div key={contact.id} variants={item}>
                <Card className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg text-foreground truncate">
                          {contact.firstName} {contact.lastName}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {getSeniorityLevel(contact.jobTitle)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                        {contact.jobTitle && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Target className="h-4 w-4" />
                            <span className="truncate">{contact.jobTitle}</span>
                          </div>
                        )}
                        {contact.companyName && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building className="h-4 w-4" />
                            <span className="truncate">{contact.companyName}</span>
                          </div>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                      </div>

                      {contact.department && (
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {contact.department}
                          </Badge>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Added {new Date(contact.createdAt).toLocaleDateString()}
                        </span>
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
                        {canEdit && (
                          <>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Contact
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Contact
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
                  onClick={() => setVisibleCount(prev => prev + CONTACTS_PAGE_SIZE)}
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

export default ContactsPage;