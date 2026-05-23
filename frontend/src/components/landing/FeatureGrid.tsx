import { useState, useEffect, useRef } from "react";
import { Workflow, FolderKanban, UsersRound, ArrowUpRight, FileText, BarChart3, Zap } from "lucide-react";

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ${visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"}`}
    >
      {children}
    </div>
  );
}

const features = [
  {
    icon: Workflow,
    title: "CRM & Sales Pipeline",
    description: "Track leads through every stage — Qualified → Proposal → Negotiation → Won. Visual pipeline, deal forecasting, and auto-assignment rules built in.",
    metric: "$2.4M Pipeline",
    metricColor: "#2A8F7A",
    bgColor: "bg-[#2A8F7A]/10",
    borderColor: "border-[#2A8F7A]/20",
    accent: "from-[#2A8F7A]/20 to-[#2A8F7A]/5",
    bullets: ["Lead capture & scoring", "Deal probability tracking", "Sales forecasting"],
  },
  {
    icon: FolderKanban,
    title: "Project & Task Management",
    description: "Kanban boards, Gantt charts, task assignments, deadlines, and milestones. Every project linked to a client and budget.",
    metric: "94% On-time",
    metricColor: "#5355D6",
    bgColor: "bg-[#5355D6]/10",
    borderColor: "border-[#5355D6]/20",
    accent: "from-[#5355D6]/20 to-[#5355D6]/5",
    bullets: ["Kanban & Gantt views", "Task priorities & deadlines", "Budget & milestone tracking"],
  },
  {
    icon: UsersRound,
    title: "HR & Team Management",
    description: "Employee profiles, payroll processing, attendance logs, leave management, and performance reviews — all in one place.",
    metric: "328 Active",
    metricColor: "#F0A030",
    bgColor: "bg-[#F0A030]/10",
    borderColor: "border-[#F0A030]/20",
    accent: "from-[#F0A030]/20 to-[#F0A030]/5",
    bullets: ["Payroll & attendance", "Leave & shift management", "Performance reviews"],
  },
  {
    icon: FileText,
    title: "Invoicing & Payments",
    description: "Create, send, and track invoices in seconds. Monitor payment status, send reminders, and get a real-time view of cash flow.",
    metric: "$180k Billed",
    metricColor: "#7B7FFF",
    bgColor: "bg-[#7B7FFF]/10",
    borderColor: "border-[#7B7FFF]/20",
    accent: "from-[#7B7FFF]/20 to-[#7B7FFF]/5",
    bullets: ["One-click invoice creation", "Payment status tracking", "Overdue reminders"],
  },
  {
    icon: BarChart3,
    title: "Analytics & Reporting",
    description: "Real-time dashboards across every module — revenue trends, team performance, client health scores, and pipeline velocity.",
    metric: "Live Reports",
    metricColor: "#2A8F7A",
    bgColor: "bg-[#2A8F7A]/10",
    borderColor: "border-[#2A8F7A]/20",
    accent: "from-[#2A8F7A]/20 to-[#2A8F7A]/5",
    bullets: ["Revenue & deal analytics", "Team productivity reports", "Client health scores"],
  },
  {
    icon: Zap,
    title: "Workflow Automation",
    description: "Build rule-based triggers — auto-assign leads, send follow-up emails, update deal stages, and notify your team without lifting a finger.",
    metric: "20h Saved/week",
    metricColor: "#F0A030",
    bgColor: "bg-[#F0A030]/10",
    borderColor: "border-[#F0A030]/20",
    accent: "from-[#F0A030]/20 to-[#F0A030]/5",
    bullets: ["Trigger-based rules", "Auto lead assignment", "Email & notification actions"],
  },
    {
      icon: Zap,
      title: "Async Jobs",
      description: "Background email sending and heavy tasks processed via BullMQ and Redis, keeping the UI snappy.",
      metric: "1000+ Jobs",
      metricColor: "#2A8F7A",
      bgColor: "bg-[#2A8F7A]/10",
      borderColor: "border-[#2A8F7A]/20",
      accent: "from-[#2A8F7A]/20 to-[#2A8F7A]/5",
      bullets: ["Email queue", "Task scheduling", "Scalable workers"],
    },
    ];

export default function FeatureGrid() {
  return (
    <section id="features" className="bg-background px-4 py-16 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block rounded-full border border-border bg-muted/50 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Business Application
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
              Run Your Business
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Flowsyc unifies your entire operation — from first lead to final invoice —
            with intelligent automation and real-time insights.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <FadeIn key={feature.title} delay={i * 100}>
              <div
                className="group relative h-full overflow-hidden rounded-2xl border border-border/80 bg-muted/30 p-5 sm:p-7 transition-all duration-300 hover:border-border"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 transition-opacity duration-500 group-hover:opacity-100`} />
                <div className="absolute inset-x-0 top-0 h-px opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ background: `linear-gradient(to right, transparent, ${feature.metricColor}40, transparent)` }} />

                <div className="relative">
                  <div className="mb-5 flex items-center justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${feature.borderColor} ${feature.bgColor} transition-all duration-300 group-hover:scale-110`}>
                      <feature.icon className="h-5 w-5" style={{ color: feature.metricColor }} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ backgroundColor: `${feature.metricColor}15`, color: feature.metricColor }}>
                        {feature.metric}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/20 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
                    </div>
                  </div>

                  <h3 className="mb-2 text-base font-semibold text-foreground/90">{feature.title}</h3>
                  <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>

                  <ul className="space-y-1.5">
                    {feature.bullets.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-1 w-1 rounded-full flex-shrink-0" style={{ backgroundColor: feature.metricColor }} />
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
