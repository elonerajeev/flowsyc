import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target,
  Calendar,
  PieChart,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { crmService } from "@/services/crm";
import type { SalesMetrics, Deal, Lead } from "@/types/crm";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const EnhancedReportsPage = () => {
  const { data: metrics, error: metricsError, refetch: refetchMetrics } = useQuery({
    queryKey: ["sales-metrics"],
    queryFn: crmService.getSalesMetrics,
  });

  const { data: deals = [], error: dealsError, refetch: refetchDeals } = useQuery({
    queryKey: ["deals"],
    queryFn: crmService.getDeals,
  });

  const { data: leads = [], error: leadsError, refetch: refetchLeads } = useQuery({
    queryKey: ["leads"],
    queryFn: crmService.getLeads,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const openDealsCount = deals.filter((deal) => !["closed-won", "closed-lost"].includes(deal.stage)).length;
  const wonDealsCount = deals.filter((deal) => deal.stage === "closed-won").length;
  const activeLeadsCount = leads.filter((lead) => !["won", "lost"].includes(lead.status)).length;
  const forecastCoverage = metrics && metrics.pipelineValue > 0
    ? Math.round((metrics.forecastedRevenue / metrics.pipelineValue) * 100)
    : 0;

  // Calculate pipeline distribution
  const pipelineDistribution = deals.reduce((acc, deal) => {
    acc[deal.stage] = (acc[deal.stage] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate lead source distribution
  const leadSourceDistribution = leads.reduce((acc, lead) => {
    acc[lead.source] = (acc[lead.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate monthly performance
  const monthlyDeals = deals.filter(deal => {
    const dealDate = new Date(deal.createdAt);
    const currentMonth = new Date();
    return dealDate.getMonth() === currentMonth.getMonth() && 
           dealDate.getFullYear() === currentMonth.getFullYear();
  });

  const monthlyValue = monthlyDeals.reduce((sum, deal) => sum + deal.value, 0);

  const pageError = metricsError || dealsError || leadsError;

  if (pageError) {
    return (
      <ErrorFallback
        title="Reports failed to load"
        error={pageError}
        description="The report surface could not load metrics, deals, or leads. Retry to refresh the reporting data."
        onRetry={() => Promise.all([refetchMetrics(), refetchDeals(), refetchLeads()])}
        retryLabel="Retry reports"
      />
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.section variants={item} className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 font-medium text-muted-foreground text-xs uppercase tracking-[0.16em]">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            Sales Analytics
          </div>
          <div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Reports</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Comprehensive sales analytics, pipeline insights, and performance metrics.
            </p>
          </div>
        </div>
      </motion.section>

      {/* Key Metrics */}
      {metrics && (
        <motion.section variants={item} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-xl border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                from recorded invoices
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.conversionRate}%</div>
              <p className="text-xs text-muted-foreground">
                based on current client statuses
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Deal Size</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.averageDealSize)}</div>
              <p className="text-xs text-muted-foreground">
                average invoice amount
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sales Cycle</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.salesCycle} days</div>
              <p className="text-xs text-muted-foreground">
                from client created date to first invoice
              </p>
            </CardContent>
          </Card>
        </motion.section>
      )}

      {/* Pipeline Analysis */}
      <motion.section variants={item} className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Pipeline Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(pipelineDistribution).map(([stage, count]) => {
              const percentage = (count / deals.length) * 100;
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {stage.replace('-', ' ')}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {count} deals ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(leadSourceDistribution).map(([source, count]) => {
              const percentage = (count / leads.length) * 100;
              return (
                <div key={source} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{source}</span>
                    <span className="text-sm text-muted-foreground">
                      {count} leads ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.section>

      {/* Performance Summary */}
      <motion.section variants={item} className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Deals Created</span>
              <Badge variant="secondary">{monthlyDeals.length}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Pipeline Value</span>
              <span className="font-semibold">{formatCurrency(monthlyValue)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">New Leads</span>
              <Badge variant="secondary">
                {leads.filter(lead => {
                  const leadDate = new Date(lead.createdAt);
                  const currentMonth = new Date();
                  return leadDate.getMonth() === currentMonth.getMonth();
                }).length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle>Pipeline Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Open deals</span>
                <Badge variant="secondary">{openDealsCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Won deals</span>
                <Badge variant="secondary">{wonDealsCount}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Active leads</span>
                <Badge variant="secondary">{activeLeadsCount}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/50">
          <CardHeader>
            <CardTitle>Forecast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metrics && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Forecasted Revenue</span>
                  <span className="font-semibold">{formatCurrency(metrics.forecastedRevenue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Pipeline Value</span>
                  <span className="font-semibold">{formatCurrency(metrics.pipelineValue)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Confidence</span>
                  <Badge variant={forecastCoverage >= 70 ? "default" : "secondary"}>
                    {metrics.pipelineValue > 0 ? `${forecastCoverage}% backed by pending invoices` : "No open pipeline"}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.section>
    </motion.div>
  );
};

export default EnhancedReportsPage;
