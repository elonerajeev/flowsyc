import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Filter, 
  Search, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Calendar,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ErrorFallback from "@/components/shared/ErrorFallback";
import PageLoader from "@/components/shared/PageLoader";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import AdminOnly from "@/components/shared/AdminOnly";
import type { Deal, Lead, SalesMetrics, Pipeline } from "@/types/crm";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const SalesPage = () => {
  const { role } = useTheme();
  const { openQuickCreate, canUseQuickCreate } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"pipeline" | "leads">("pipeline");
  const SALES_PAGE_SIZE = 4;
  const [visibleDealsCount, setVisibleDealsCount] = useState(4);
  const [visibleLeadsCount, setVisibleLeadsCount] = useState(4);

  const canEdit = role === "admin" || role === "manager";
  const canDelete = role === "admin";

  const { data: deals = [], isLoading: dealsLoading, error: dealsError, refetch: refetchDeals } = useQuery({
    queryKey: ["deals"],
    queryFn: crmService.getDeals,
  });

  const { data: leads = [], isLoading: leadsLoading, error: leadsError, refetch: refetchLeads } = useQuery({
    queryKey: ["leads"],
    queryFn: crmService.getLeads,
  });

  const { data: metrics, error: metricsError, refetch: refetchMetrics } = useQuery({
    queryKey: ["sales-metrics"],
    queryFn: crmService.getSalesMetrics,
  });

  const deleteDealMutation = useMutation({
    mutationFn: (id: number) => crmService.removeDeal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["sales-metrics"] });
      toast.success("Deal removed successfully");
    },
    onError: () => toast.error("Failed to remove deal"),
  });

  const deleteLeadMutation = useMutation({
    mutationFn: (id: number) => crmService.removeLead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead removed successfully");
    },
    onError: () => toast.error("Failed to remove lead"),
  });

  const handleRefresh = async () => {
    const start = Date.now();
    await Promise.all([refetchDeals(), refetchLeads(), refetchMetrics()]);
    const duration = Date.now() - start;
    if (duration < 600) await new Promise(r => setTimeout(r, 600 - duration));
  };

  const isRefreshing = dealsLoading || leadsLoading;

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         deal.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStage = stageFilter === "all" || deal.stage === stageFilter;
    return matchesSearch && matchesStage;
  });

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = `${lead.firstName} ${lead.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.company?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      "prospecting": "bg-slate-100 text-slate-700",
      "qualification": "bg-blue-100 text-blue-700",
      "proposal": "bg-yellow-100 text-yellow-700",
      "negotiation": "bg-orange-100 text-orange-700",
      "closed-won": "bg-green-100 text-green-700",
      "closed-lost": "bg-red-100 text-red-700"
    };
    return colors[stage] || "bg-gray-100 text-gray-700";
  };

  const getLeadStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "new": "bg-blue-100 text-blue-700",
      "contacted": "bg-yellow-100 text-yellow-700",
      "qualified": "bg-green-100 text-green-700",
      "proposal": "bg-purple-100 text-purple-700",
      "negotiation": "bg-orange-100 text-orange-700",
      "won": "bg-green-100 text-green-700",
      "lost": "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const pageError = dealsError || leadsError || metricsError;

  if (pageError) {
    return (
      <ErrorFallback
        title="Sales data failed to load"
        error={pageError}
        description="The pipeline view could not load deals, leads, or analytics. Retry to refresh the sales workspace."
        onRetry={() => Promise.all([refetchDeals(), refetchLeads(), refetchMetrics()])}
        retryLabel="Retry sales"
      />
    );
  }

  if (dealsLoading || leadsLoading) return <PageLoader />;

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.section variants={item} className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              Sales Pipeline
            </div>
            <div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Sales</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Manage your sales pipeline, track deals, and convert leads into customers.
              </p>
            </div>
          </div>
          {canUseQuickCreate ? (
            <div className="flex gap-2">
              <motion.div whileTap={{ scale: 0.94 }}>
                <Button 
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 rounded-2xl border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition px-4 h-11"
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Refreshing..." : "Refresh Sales"}
                </Button>
              </motion.div>
              <Button 
                onClick={() => openQuickCreate("lead")}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-lg transition"
              >
                <Plus className="h-4 w-4" />
                Add Deal
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
               <motion.div whileTap={{ scale: 0.94 }}>
                <Button 
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-2 rounded-2xl border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition px-4 h-11"
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Refreshing..." : "Refresh Sales"}
                </Button>
              </motion.div>
              <div className="inline-flex items-center rounded-2xl border border-border bg-secondary px-5 py-3 text-sm font-semibold text-muted-foreground">
                Read only
              </div>
            </div>
          )}
        </div>

        {/* Sales Metrics */}
        {metrics && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[1.25rem] border border-border/70 bg-secondary/22 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Pipeline Value</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {formatCurrency(metrics.pipelineValue)}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-secondary/22 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Conversion Rate</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {metrics.conversionRate}%
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-secondary/22 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Deals Won</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {metrics.dealsWon}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-border/70 bg-secondary/22 p-4">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Avg. Sales Cycle</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {metrics.salesCycle} days
              </p>
            </div>
          </div>
        )}
      </motion.section>

      {/* Tabs and Filters */}
      <motion.section variants={item} className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "pipeline" ? "default" : "outline"}
              onClick={() => setActiveTab("pipeline")}
              className={cn(
                "rounded-xl transition-all",
                activeTab === "pipeline" 
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md" 
                  : "border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              )}
            >
              Pipeline
            </Button>
            <Button
              variant={activeTab === "leads" ? "default" : "outline"}
              onClick={() => setActiveTab("leads")}
              className={cn(
                "rounded-xl transition-all",
                activeTab === "leads" 
                  ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md" 
                  : "border-orange-200 text-orange-700 hover:bg-orange-50"
              )}
            >
              Leads
            </Button>
          </div>
          
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={activeTab === "pipeline" ? "Search deals..." : "Search leads..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            {activeTab === "pipeline" && (
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Stages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  <SelectItem value="prospecting">Prospecting</SelectItem>
                  <SelectItem value="qualification">Qualification</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed-won">Closed Won</SelectItem>
                  <SelectItem value="closed-lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Pipeline View */}
        {activeTab === "pipeline" && (
          <div className="mt-6">
            <div className="space-y-4">
              {filteredDeals.length > 0 ? (
                <>
                {filteredDeals.slice(0, visibleDealsCount).map((deal) => (
                  <Card key={deal.id} className="rounded-xl border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground">{deal.title}</h3>
                            <Badge className={getStageColor(deal.stage)}>
                              {deal.stage.replace('-', ' ')}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {deal.probability}% probability
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{deal.description}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">
                              {formatCurrency(deal.value)}
                            </span>
                            <span>Expected: {new Date(deal.expectedCloseDate).toLocaleDateString()}</span>
                            {deal.tags?.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
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
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Deal
                            </DropdownMenuItem>
                            )}
                            {canDelete && (
                            <DropdownMenuItem 
                              className="text-destructive" 
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to remove deal "${deal.title}"?`)) {
                                  deleteDealMutation.mutate(deal.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Deal
                            </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <ShowMoreButton
                  total={filteredDeals.length}
                  visible={visibleDealsCount}
                  pageSize={SALES_PAGE_SIZE}
                  onShowMore={() => setVisibleDealsCount(v => Math.min(v + SALES_PAGE_SIZE, filteredDeals.length))}
                  onShowLess={() => setVisibleDealsCount(SALES_PAGE_SIZE)}
                />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-foreground">No deals found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Leads View */}
        {activeTab === "leads" && (
          <div className="mt-6">
            <div className="space-y-4">
              {filteredLeads.length > 0 ? (
                <>
                {filteredLeads.slice(0, visibleLeadsCount).map((lead) => (
                  <Card key={lead.id} className="rounded-xl border-border/50 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-foreground">
                              {lead.firstName} {lead.lastName}
                            </h3>
                            <Badge className={getLeadStatusColor(lead.status)}>
                              {lead.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Score: {lead.score}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{lead.company}</span>
                            <span>{lead.jobTitle}</span>
                            <span>{lead.email}</span>
                            <Badge variant="outline" className="text-xs">
                              {lead.source}
                            </Badge>
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
                              View Lead
                            </DropdownMenuItem>
                            {canEdit && (
                            <DropdownMenuItem
                              onClick={() => {
                                toast.info("Edit mode coming via Quick Create extension");
                                openQuickCreate("lead", lead);
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Lead
                            </DropdownMenuItem>
                            )}
                            {canDelete && (
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to remove lead "${lead.firstName} ${lead.lastName}"?`)) {
                                  deleteLeadMutation.mutate(lead.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Lead
                            </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                <ShowMoreButton
                  total={filteredLeads.length}
                  visible={visibleLeadsCount}
                  pageSize={SALES_PAGE_SIZE}
                  onShowMore={() => setVisibleLeadsCount(v => Math.min(v + SALES_PAGE_SIZE, filteredLeads.length))}
                  onShowLess={() => setVisibleLeadsCount(SALES_PAGE_SIZE)}
                />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium text-foreground">No leads found</p>
                  <p className="text-sm text-muted-foreground">Try adjusting your search.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
};

const SalesPageWrapped = () => <AdminOnly><SalesPage /></AdminOnly>;
export default SalesPageWrapped;
