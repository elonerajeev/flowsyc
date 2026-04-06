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
import { RADIUS, SPACING, TEXT } from "@/lib/design-tokens";
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
      "prospecting": "border-border/70 bg-secondary/40 text-muted-foreground",
      "qualification": "border-primary/20 bg-primary/10 text-primary",
      "proposal": "border-warning/20 bg-warning/10 text-warning",
      "negotiation": "border-info/20 bg-info/10 text-info",
      "closed-won": "border-success/20 bg-success/10 text-success",
      "closed-lost": "border-destructive/20 bg-destructive/10 text-destructive",
    };
    return colors[stage] || "border-border/70 bg-secondary/40 text-muted-foreground";
  };

  const getLeadStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      "new": "border-primary/20 bg-primary/10 text-primary",
      "contacted": "border-warning/20 bg-warning/10 text-warning",
      "qualified": "border-success/20 bg-success/10 text-success",
      "proposal": "border-info/20 bg-info/10 text-info",
      "negotiation": "border-accent/20 bg-accent/10 text-accent",
      "won": "border-success/20 bg-success/10 text-success",
      "lost": "border-destructive/20 bg-destructive/10 text-destructive",
    };
    return colors[status] || "border-border/70 bg-secondary/40 text-muted-foreground";
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
      <motion.section variants={item} className={cn("border border-border/70 bg-card/90", RADIUS.xl, SPACING.card, "shadow-card")}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className={cn("inline-flex items-center gap-2 border border-border/70 bg-secondary/40 font-medium text-muted-foreground", RADIUS.pill, SPACING.buttonCompact, TEXT.eyebrow)}>
              <DollarSign className="h-3.5 w-3.5 text-primary" />
              Sales Workspace
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
                  className={cn("inline-flex items-center gap-2 border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition", RADIUS.lg, SPACING.button, TEXT.body)}
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Refreshing..." : "Refresh Sales"}
                </Button>
              </motion.div>
              <Button 
                onClick={() => openQuickCreate("lead")}
                className={cn("inline-flex items-center gap-2 bg-primary font-semibold text-primary-foreground shadow-lg transition hover:bg-primary/90", RADIUS.lg, SPACING.button, TEXT.body)}
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
                  className={cn("inline-flex items-center gap-2 border-border/70 bg-background/50 font-semibold text-foreground backdrop-blur-sm transition", RADIUS.lg, SPACING.button, TEXT.body)}
                >
                  <RefreshCw className={cn("h-4 w-4 text-primary", isRefreshing && "animate-spin")} />
                  {isRefreshing ? "Refreshing..." : "Refresh Sales"}
                </Button>
              </motion.div>
              <div className={cn("inline-flex items-center border border-border/70 bg-secondary/30 font-semibold text-muted-foreground", RADIUS.lg, SPACING.button, TEXT.body)}>
                Read only
              </div>
            </div>
          )}
        </div>

        {/* Sales Metrics */}
        {metrics && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={cn("border border-border/70 bg-background/70 p-4", RADIUS.lg, "shadow-sm")}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <DollarSign className="h-5 w-5" />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Pipeline Value</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {formatCurrency(metrics.pipelineValue)}
              </p>
            </div>
            <div className={cn("border border-border/70 bg-background/70 p-4", RADIUS.lg, "shadow-sm")}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-info/10 text-info">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Conversion Rate</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {metrics.conversionRate}%
              </p>
            </div>
            <div className={cn("border border-border/70 bg-background/70 p-4", RADIUS.lg, "shadow-sm")}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-success/10 text-success">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">Deals Won</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {metrics.dealsWon}
              </p>
            </div>
            <div className={cn("border border-border/70 bg-background/70 p-4", RADIUS.lg, "shadow-sm")}>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-warning/10 text-warning">
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
      <motion.section variants={item} className={cn("border border-border/70 bg-card/90", RADIUS.xl, SPACING.card, "shadow-card")}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "pipeline" ? "default" : "outline"}
              onClick={() => setActiveTab("pipeline")}
              className={cn(
                "rounded-2xl transition-all",
                activeTab === "pipeline"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
              )}
            >
              Pipeline
            </Button>
            <Button
              variant={activeTab === "leads" ? "default" : "outline"}
              onClick={() => setActiveTab("leads")}
              className={cn(
                "rounded-2xl transition-all",
                activeTab === "leads"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "border-border/70 bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
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
                className="pl-10 w-64 rounded-2xl border-border/70 bg-background/60"
              />
            </div>
            {activeTab === "pipeline" && (
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-40 rounded-2xl border-border/70 bg-background/60">
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
                  <Card key={deal.id} className="rounded-[1.5rem] border-border/70 bg-background/70 shadow-card transition hover:border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <h3 className="font-display text-lg font-semibold text-foreground">{deal.title}</h3>
                            <Badge className={cn("border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", getStageColor(deal.stage))}>
                              {deal.stage.replace("-", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{deal.probability}% probability</span>
                          </div>
                          {deal.description && (
                            <p className="text-sm text-muted-foreground mb-3">{deal.description}</p>
                          )}
                          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                            <div>
                              <p className={cn(TEXT.eyebrow, "text-muted-foreground")}>Deal Value</p>
                              <p className="font-semibold text-foreground">{formatCurrency(deal.value)}</p>
                            </div>
                            <div>
                              <p className={cn(TEXT.eyebrow, "text-muted-foreground")}>Expected Close</p>
                              <p className="font-semibold text-foreground">{new Date(deal.expectedCloseDate).toLocaleDateString()}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              {deal.tags?.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
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
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-border/60 bg-secondary/10">
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
                  <Card key={lead.id} className="rounded-[1.5rem] border-border/70 bg-background/70 shadow-card transition hover:border-border">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-display text-lg font-semibold text-foreground">
                              {lead.firstName} {lead.lastName}
                            </h3>
                            <Badge className={cn("border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]", getLeadStatusColor(lead.status))}>
                              {lead.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">Score: {lead.score}</span>
                          </div>
                          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                            <div>
                              <p className={cn(TEXT.eyebrow, "text-muted-foreground")}>Company</p>
                              <p className="font-semibold text-foreground">{lead.company}</p>
                            </div>
                            <div>
                              <p className={cn(TEXT.eyebrow, "text-muted-foreground")}>Role</p>
                              <p className="font-semibold text-foreground">{lead.jobTitle}</p>
                            </div>
                            <div>
                              <p className={cn(TEXT.eyebrow, "text-muted-foreground")}>Contact</p>
                              <p className="font-semibold text-foreground">{lead.email}</p>
                            </div>
                          </div>
                          <div className="mt-3">
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
                <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-dashed border-border/60 bg-secondary/10">
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
