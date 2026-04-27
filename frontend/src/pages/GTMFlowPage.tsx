import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import {
  Target,
  Users,
  Handshake,
  Building2,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Zap,
  Upload,
  UserPlus,
  MousePointerClick,
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { crmService } from "@/services/crm";
import { cn } from "@/lib/utils";
import { TEXT } from "@/lib/design-tokens";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Add Your Leads",
    description: "Import leads from a CSV/Excel file or add them one by one manually.",
    how: "Go to Leads → click Import CSV or + Add Lead",
    color: "from-blue-500 to-blue-600",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-500",
    link: "/leads",
    linkLabel: "Go to Leads",
  },
  {
    number: "02",
    icon: MousePointerClick,
    title: "Update Lead Status",
    description: "As you reach out to leads, change their status. This is the only action you need to take — the system handles the rest.",
    how: "Open any lead → change status dropdown → save",
    color: "from-yellow-500 to-yellow-600",
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    text: "text-yellow-500",
    link: "/leads",
    linkLabel: "View Leads",
  },
  {
    number: "03",
    icon: Zap,
    title: "Automation Kicks In",
    description: "The moment a status changes, the system auto-creates contacts, deals, and clients for you — zero manual work.",
    how: "Nothing to do — it happens automatically in the background",
    color: "from-purple-500 to-purple-600",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    text: "text-purple-500",
    link: "/automation/logs",
    linkLabel: "View Activity Logs",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "Monitor & Act",
    description: "Track your pipeline, check alerts, review automation logs, and see what's working.",
    how: "Check GTM Dashboard, Pipeline, and Alerts regularly",
    color: "from-green-500 to-green-600",
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-500",
    link: "/gtm",
    linkLabel: "GTM Dashboard",
  },
];

const triggerTable = [
  {
    action: "You add a lead",
    result: "Lead appears in your list with score 0",
    creates: null,
    icon: UserPlus,
    iconColor: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    action: "You set status → Contacted",
    result: "Contact is automatically created from lead info",
    creates: "Contact",
    icon: Users,
    iconColor: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    action: "You set status → Qualified",
    result: "Deal opportunity is created in the pipeline",
    creates: "Deal",
    icon: Handshake,
    iconColor: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    action: "You set status → Closed Won",
    result: "Lead is converted to a paying client",
    creates: "Client",
    icon: Building2,
    iconColor: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    action: "Lead inactive for 7+ days",
    result: "Alert sent — system flags the deal for follow-up",
    creates: "Alert",
    icon: Bell,
    iconColor: "text-warning",
    bg: "bg-warning/10",
  },
];

const quickLinks = [
  { label: "Import Leads (CSV/Excel)", icon: Upload, link: "/leads", desc: "Start here — add your leads" },
  { label: "View Pipeline", icon: Handshake, link: "/pipeline", desc: "Track deals in progress" },
  { label: "GTM Dashboard", icon: BarChart3, link: "/gtm", desc: "Overview of your funnel" },
  { label: "Automation Logs", icon: Zap, link: "/automation/logs", desc: "See what was automated" },
  { label: "Alerts", icon: Bell, link: "/automation/alerts", desc: "Issues needing attention" },
  { label: "Automation Rules", icon: Sparkles, link: "/automation/rules", desc: "Customize what triggers what" },
];

export default function GTMFlowPage() {
  const navigate = useNavigate();

  const { data: gtmData, isLoading, error, refetch } = useQuery({
    queryKey: ["gtm-overview"],
    queryFn: crmService.getGTMOverview,
    refetchInterval: 60000,
  });

  if (isLoading) return <PageLoader />;
  if (error) return <ErrorFallback error={error as Error} onRetry={refetch} retryLabel="Retry" />;

  const summary = gtmData?.summary;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-8">

      {/* Header */}
      <section className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 mb-3">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Automation · Flow Guide</span>
            </div>
            <h1 className="font-display text-3xl font-semibold text-foreground">Automation Guide</h1>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">A simple guide to turning leads into clients using automation. You update lead status — the system does everything else.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-muted px-4 py-2">
              <span className="text-sm font-medium">{summary?.totalLeads ?? 0} leads</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-warning/30 bg-warning/10 px-4 py-2">
              <span className="text-sm font-medium text-warning">{summary?.totalContacts ?? 0} contacts</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
              <span className="text-sm font-medium text-primary">{summary?.totalDeals ?? 0} deals</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2">
              <span className="text-sm font-medium text-success">{summary?.totalClients ?? 0} clients</span>
            </div>
          </div>
        </div>
      </section>

      {/* Step-by-step guide */}
      <motion.section variants={item}>
        <div className="mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">What You Need To Do — Step by Step</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <motion.div
              key={step.number}
              variants={item}
              className={cn(
                "relative rounded-2xl border p-5 hover:shadow-md transition-shadow cursor-default",
                step.bg,
                step.border
              )}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white", step.color)}>
                  <step.icon className="h-5 w-5" />
                </div>
                <span className={cn("text-3xl font-bold opacity-20", step.text)}>{step.number}</span>
              </div>
              <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
              <p className="text-sm text-muted-foreground mb-3">{step.description}</p>
              <div className="rounded-lg bg-background/60 p-2 text-xs text-muted-foreground mb-3">
                <span className="font-medium text-foreground">How: </span>{step.how}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className={cn("w-full gap-1 text-xs h-8", step.text)}
                onClick={() => navigate(step.link)}
              >
                {step.linkLabel}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              {idx < steps.length - 1 && (
                <div className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 hidden lg:block">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-border bg-background">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Trigger Table */}
      <motion.section variants={item}>
        <Card className="border-border/60 shadow-card">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Your Action → What Happens Automatically
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Every time you update a lead status, the system reacts instantly
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {triggerTable.map((row, idx) => (
                <motion.div
                  key={idx}
                  variants={item}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-border/40 bg-secondary/10 p-4 hover:bg-secondary/20 transition-colors"
                >
                  {/* Action (user does) */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", row.bg)}>
                      <row.icon className={cn("h-4 w-4", row.iconColor)} />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">You do</p>
                      <p className="text-sm font-semibold text-foreground">{row.action}</p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="hidden sm:flex items-center justify-center px-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                  <div className="flex sm:hidden justify-center">
                    <ArrowDown className="h-4 w-4 text-primary" />
                  </div>

                  {/* Result (system does) */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">System does</p>
                      <p className="text-sm text-muted-foreground">{row.result}</p>
                    </div>
                  </div>

                  {/* Badge */}
                  {row.creates && (
                    <Badge variant="outline" className={cn("shrink-0 text-xs", row.bg, row.iconColor, "border-current/30")}>
                      + {row.creates}
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Lead Status Journey — visual only */}
      <motion.section variants={item}>
        <Card className="border-border/60 shadow-card">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              The Full Lead Journey
            </CardTitle>
            <p className="text-sm text-muted-foreground">Move a lead through these stages to complete the journey</p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto pb-2">
              <div className="flex items-center gap-2 min-w-max">
                {[
                  { stage: "New", dot: "bg-blue-500", note: null },
                  { stage: "Contacted", dot: "bg-yellow-500", note: "Contact created" },
                  { stage: "Qualified", dot: "bg-green-500", note: "Deal created" },
                  { stage: "Proposal Sent", dot: "bg-orange-500", note: null },
                  { stage: "Negotiation", dot: "bg-purple-500", note: null },
                  { stage: "Closed Won", dot: "bg-emerald-500", note: "Client created" },
                  { stage: "Closed Lost", dot: "bg-destructive/70", note: null },
                ].map((s, idx, arr) => (
                  <div key={s.stage} className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-2 rounded-full border border-border/40 bg-secondary/20 px-3 py-1.5">
                        <div className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
                        <span className="text-xs font-medium text-foreground whitespace-nowrap">{s.stage}</span>
                      </div>
                      {s.note && (
                        <span className="text-[10px] text-green-500 flex items-center gap-0.5 whitespace-nowrap">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {s.note}
                        </span>
                      )}
                    </div>
                    {idx < arr.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Quick Navigation */}
      <motion.section variants={item}>
        <div className="mb-4 flex items-center gap-2">
          <ChevronRight className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Quick Navigation</h2>
        </div>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {quickLinks.map((link, idx) => (
            <motion.button
              key={idx}
              variants={item}
              onClick={() => navigate(link.link)}
              className="group rounded-xl border border-border/40 bg-card p-4 text-left hover:border-primary/40 hover:bg-secondary/30 transition-all hover:shadow-sm"
            >
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <link.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-xs font-semibold text-foreground leading-tight">{link.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{link.desc}</p>
            </motion.button>
          ))}
        </div>
      </motion.section>

      {/* Summary tip */}
      <motion.section variants={item}>
        <Card className="border-border/60 bg-gradient-to-br from-primary/5 via-purple-500/5 to-transparent shadow-card">
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-purple-500 text-white">
              <Sparkles className="h-7 w-7" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-semibold text-foreground text-lg">The short version</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Import leads → change their status as you work them → system creates contacts, deals & clients for you → monitor in GTM Dashboard & Alerts.
                That's it.
              </p>
            </div>
            <Button className="shrink-0 gap-2" onClick={() => navigate("/leads")}>
              <Upload className="h-4 w-4" />
              Import Leads Now
            </Button>
          </CardContent>
        </Card>
      </motion.section>
    </motion.div>
  );
}
