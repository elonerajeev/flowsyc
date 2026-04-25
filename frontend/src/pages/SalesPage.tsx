import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { 
  Plus, 
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
  Target,
  Handshake,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { SalesSkeleton } from "@/components/skeletons";
import ShowMoreButton from "@/components/shared/ShowMoreButton";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { RADIUS, TEXT } from "@/lib/design-tokens";
import { useTheme } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import AdminOnly from "@/components/shared/AdminOnly";

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
    queryKey: ["sales-leads"],
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
      queryClient.invalidateQueries({ queryKey: ["sales-leads"] });
      toast.success("Lead removed successfully");
    },
    onError: () => toast.error("Failed to remove lead"),
  });

  const syncDealMutation = useMutation({
    mutationFn: (id: number) => crmService.syncDealLifecycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
      toast.success("Pipeline automation synced");
    },
    onError: () => toast.error("Failed to sync pipeline automation"),
  });

  const handleRefresh = async () => {
    await Promise.all([refetchDeals(), refetchLeads(), refetchMetrics()]);
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

  const getStageConfig = (stage: string) => {
    const configs: Record<string, { bg: string; text: string; gradient: string }> = {
      "prospecting": { bg: "bg-secondary/20", text: "text-muted-foreground", gradient: "from-secondary to-secondary/60" },
      "qualification": { bg: "bg-primary/10", text: "text-primary", gradient: "from-primary to-primary/60" },
      "proposal": { bg: "bg-warning/10", text: "text-warning", gradient: "from-warning to-warning/60" },
      "negotiation": { bg: "bg-info/10", text: "text-info", gradient: "from-info to-info/60" },
      "closed-won": { bg: "bg-success/10", text: "text-success", gradient: "from-success to-success/60" },
      "closed-lost": { bg: "bg-destructive/10", text: "text-destructive", gradient: "from-destructive to-destructive/60" },
    };
    return configs[stage] || { bg: "bg-secondary/20", text: "text-muted-foreground", gradient: "from-secondary to-secondary/60" };
  };

  const getLeadStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; gradient: string }> = {
      "new": { bg: "bg-primary/10", text: "text-primary", gradient: "from-primary to-primary/60" },
      "contacted": { bg: "bg-warning/10", text: "text-warning", gradient: "from-warning to-warning/60" },
      "qualified": { bg: "bg-success/10", text: "text-success", gradient: "from-success to-success/60" },
      "proposal": { bg: "bg-info/10", text: "text-info", gradient: "from-info to-info/60" },
      "negotiation": { bg: "bg-accent/10", text: "text-accent", gradient: "from-accent to-accent/60" },
      "won": { bg: "bg-success/10", text: "text-success", gradient: "from-success to-success/60" },
      "lost": { bg: "bg-destructive/10", text: "text-destructive", gradient: "from-destructive to-destructive/60" },
    };
    return configs[status] || { bg: "bg-secondary/20", text: "text-muted-foreground", gradient: "from-secondary to-secondary/60" };
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

  if (dealsLoading || leadsLoading) return <SalesSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 mb-3">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">Sales · Pipeline</span>
              </div>
              <h1 className="font-display text-3xl font-semibold text-foreground">Sales Pipeline</h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Track deals through stages, manage leads, and monitor your sales performance.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/automation/gtm">
                <Button variant="outline" size="sm" className="gap-2">
                  <Activity className="h-4 w-4" />
                  GTM Center
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
              {canUseQuickCreate ? (
                <Button size="sm" onClick={() => openQuickCreate("lead")} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Deal
                </Button>
              ) : (
                <div className="inline-flex h-10 items-center rounded-xl border border-border/60 bg-secondary/40 px-4 text-xs font-medium text-muted-foreground">
                  Read only
                </div>
              )}
            </div>
          </div>
          {metrics && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
                <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-primary">{formatCurrency(metrics.pipelineValue)}</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2">
                <TrendingUp className="h-4 w-4 text-success flex-shrink-0" />
                <span className="text-sm font-medium text-success">{metrics.conversionRate}% conversion</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-4 py-2">
                <Handshake className="h-4 w-4 text-info flex-shrink-0" />
                <span className="text-sm font-medium text-info">{metrics.dealsWon} won</span>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
                <span className="text-sm font-medium text-muted-foreground">{metrics.salesCycle}d avg cycle</span>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border bg-card px-4 py-3 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              {["pipeline", "leads"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as "pipeline" | "leads")}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "border border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={activeTab === "pipeline" ? "Search deals..." : "Search leads..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 pl-10 text-sm"
                />
              </div>
              {activeTab === "pipeline" && (
                <select
                  value={stageFilter}
                  onChange={(event) => setStageFilter(event.target.value)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                >
                  <option value="all">All Stages</option>
                  <option value="prospecting">Prospecting</option>
                  <option value="qualification">Qualification</option>
                  <option value="proposal">Proposal</option>
                  <option value="negotiation">Negotiation</option>
                  <option value="closed-won">Closed Won</option>
                  <option value="closed-lost">Closed Lost</option>
                </select>
              )}
            </div>
          </div>
      </section>

      <section>
        {activeTab === "pipeline" && (
          <div className="space-y-4">
            {filteredDeals.length > 0 ? (
              <>
              {filteredDeals.slice(0, visibleDealsCount).map((deal) => {
                const stageConfig = getStageConfig(deal.stage);
                return (
                  <motion.article
                    key={deal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-card transition-all hover:border-border hover:shadow-lg", RADIUS.xl)}
                  >
                    <div className={cn("absolute left-0 top-0 h-0.5 w-0 bg-gradient-to-r transition-all duration-300 group-hover:w-full", stageConfig.gradient)} />
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <h3 className="font-display text-lg font-semibold text-foreground">{deal.title}</h3>
                          <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase", stageConfig.bg, stageConfig.text)}>
                            {deal.stage.replace("-", " ")}
                          </span>
                          <span className="text-xs text-muted-foreground">{deal.probability}% probability</span>
                        </div>
                        {deal.description && (
                          <p className="text-sm text-muted-foreground mb-4">{deal.description}</p>
                        )}
                        <div className="grid gap-4 text-sm sm:grid-cols-3">
                          <div className={cn("rounded-xl border border-border/40 bg-secondary/20 p-3", RADIUS.md)}>
                            <p className={cn("text-muted-foreground", TEXT.meta)}>Deal Value</p>
                            <p className="mt-1 font-display text-lg font-semibold text-foreground">{formatCurrency(deal.value)}</p>
                          </div>
                          <div className={cn("rounded-xl border border-border/40 bg-secondary/20 p-3", RADIUS.md)}>
                            <p className={cn("text-muted-foreground", TEXT.meta)}>Expected Close</p>
                            <p className="mt-1 font-semibold text-foreground">{new Date(deal.expectedCloseDate).toLocaleDateString()}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {deal.tags?.map(tag => (
                              <span key={tag} className="rounded-full border border-border/60 bg-secondary/30 px-2.5 py-1 text-xs text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="rounded-xl">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => syncDealMutation.mutate(deal.id)}>
                            <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                            Run GTM Sync
                          </DropdownMenuItem>
                          {canEdit && (
                          <DropdownMenuItem onClick={() => openQuickCreate("lead", deal)}>
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
                  </motion.article>
                );
              })}
              <ShowMoreButton
                total={filteredDeals.length}
                visible={visibleDealsCount}
                pageSize={SALES_PAGE_SIZE}
                onShowMore={() => setVisibleDealsCount(v => Math.min(v + SALES_PAGE_SIZE, filteredDeals.length))}
                onShowLess={() => setVisibleDealsCount(SALES_PAGE_SIZE)}
              />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border border-dashed border-border/60 bg-card">
                <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-foreground">No deals found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "leads" && (
          <div className="space-y-4">
            {filteredLeads.length > 0 ? (
              <>
              {filteredLeads.slice(0, visibleLeadsCount).map((lead) => {
                const statusConfig = getLeadStatusConfig(lead.status);
                return (
                  <motion.article
                    key={lead.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-card transition-all hover:border-border hover:shadow-lg", RADIUS.xl)}
                  >
                    <div className={cn("absolute left-0 top-0 h-0.5 w-0 bg-gradient-to-r transition-all duration-300 group-hover:w-full", statusConfig.gradient)} />
                    
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-info/10 font-display text-lg font-bold text-foreground">
                            {lead.firstName[0]}{lead.lastName[0]}
                          </div>
                          <div>
                            <h3 className="font-display text-lg font-semibold text-foreground">
                              {lead.firstName} {lead.lastName}
                            </h3>
                            <p className="text-sm text-muted-foreground">{lead.jobTitle} at {lead.company}</p>
                          </div>
                          <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold uppercase", statusConfig.bg, statusConfig.text)}>
                            {lead.status}
                          </span>
                          <span className="rounded-full bg-secondary/40 px-3 py-1 text-xs font-semibold text-muted-foreground">
                            Score: {lead.score}
                          </span>
                        </div>
                        <div className="grid gap-4 text-sm sm:grid-cols-2">
                          <div className={cn("rounded-xl border border-border/40 bg-secondary/20 p-3", RADIUS.md)}>
                            <p className={cn("text-muted-foreground", TEXT.meta)}>Email</p>
                            <p className="mt-1 font-semibold text-foreground">{lead.email}</p>
                          </div>
                          <div className={cn("rounded-xl border border-border/40 bg-secondary/20 p-3", RADIUS.md)}>
                            <p className={cn("text-muted-foreground", TEXT.meta)}>Source</p>
                            <p className="mt-1 font-semibold text-foreground">{lead.source}</p>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="rounded-xl">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="h-4 w-4 mr-2" />
                            View Lead
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => crmService.recalculateLeadScore(lead.id).then(() => {
                            queryClient.invalidateQueries({ queryKey: ["leads"] });
                            queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
                            toast.success("Lead score recalculated");
                          }).catch(() => toast.error("Failed to recalculate score"))}>
                            <RefreshCw className="h-4 w-4 mr-2 text-blue-500" />
                            Recalculate Score
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => crmService.createLeadFollowUp(lead.id).then(() => {
                            queryClient.invalidateQueries({ queryKey: ["tasks"] });
                            queryClient.invalidateQueries({ queryKey: ["gtm-overview"] });
                            toast.success("Follow-up sequence created");
                          }).catch(() => toast.error("Failed to create follow-up sequence"))}>
                            <Calendar className="h-4 w-4 mr-2 text-green-500" />
                            Create Follow-up
                          </DropdownMenuItem>
                          {canEdit && (
                          <DropdownMenuItem onClick={() => openQuickCreate("lead", lead)}>
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
                  </motion.article>
                );
              })}
              <ShowMoreButton
                total={filteredLeads.length}
                visible={visibleLeadsCount}
                pageSize={SALES_PAGE_SIZE}
                onShowMore={() => setVisibleLeadsCount(v => Math.min(v + SALES_PAGE_SIZE, filteredLeads.length))}
                onShowLess={() => setVisibleLeadsCount(SALES_PAGE_SIZE)}
              />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl border border-dashed border-border/60 bg-card">
                <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium text-foreground">No leads found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </motion.div>
  );
};

const SalesPageWrapped = () => <AdminOnly><SalesPage /></AdminOnly>;
export default SalesPageWrapped;
