import { useState, useEffect, useRef } from "react";
import { Check, Users, GitBranch, Zap, Clock, BellRing, Shield, UserCheck, BarChart3 } from "lucide-react";

/* ── Shared animated counter ── */
function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done.current) {
          done.current = true;
          const steps = 30;
          const step = value / steps;
          let i = 0;
          const t = setInterval(() => {
            i++;
            setCount(Math.min(Math.round(step * i), value));
            if (i >= steps) clearInterval(t);
          }, 40);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ── Sales Pipeline ── */
type Deal = { name: string; company: string; amount: number; initials: string };
const pipelineStageData: { stage: string; color: string; barColor: string; deals: Deal[] }[] = [
  {
    stage: "Qualified", color: "#5355D6", barColor: "bg-[#5355D6]/20",
    deals: [
      { name: "Sarah J.", company: "Acme Corp", amount: 12000, initials: "SJ" },
      { name: "Mike T.", company: "TechFlow", amount: 8000, initials: "MT" },
      { name: "Elena R.", company: "Beta Inc", amount: 15000, initials: "ER" },
    ],
  },
  {
    stage: "Proposal", color: "#F0A030", barColor: "bg-[#F0A030]/20",
    deals: [
      { name: "David K.", company: "DataSync", amount: 24000, initials: "DK" },
      { name: "Anna L.", company: "CloudBase", amount: 6000, initials: "AL" },
      { name: "Ryan P.", company: "NovaTech", amount: 18000, initials: "RP" },
    ],
  },
  {
    stage: "Closing", color: "#2A8F7A", barColor: "bg-[#2A8F7A]/20",
    deals: [
      { name: "Tom W.", company: "MegaCorp", amount: 42000, initials: "TW" },
      { name: "Lisa M.", company: "StarLabs", amount: 9000, initials: "LM" },
    ],
  },
];

const stageFunnel = [
  { label: "Total Leads", count: 120, pct: 100 },
  { label: "Qualified", count: 42, pct: 35 },
  { label: "Closing", count: 10, pct: 8 },
];

export function ShowcaseDecision() {
  const [tick, setTick] = useState(0);
  const [movingDeal, setMovingDeal] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setMovingDeal((m) => (m + 1) % 3);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="sales-pipeline" className="bg-background px-4 py-16 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#5355D6]">Sales Pipeline</p>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Close more deals with{" "}
              <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
                full pipeline visibility
              </span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Flowsyc's sales module gives you Clients, Contacts, Leads, and a visual Pipeline — all linked. Track every deal from first touch to closed-won with real-time stage updates.
            </p>
            <div className="mt-6 inline-flex items-baseline gap-2 rounded-xl border border-[#5355D6]/20 bg-[#5355D6]/5 px-4 py-2">
              <span className="text-2xl font-bold text-[#5355D6]">$<AnimatedCounter value={84200} /></span>
              <span className="text-xs text-muted-foreground">monthly revenue tracked</span>
            </div>
            <div className="mt-8 space-y-5">
              {[
                { title: "Leads → Deals → Clients in one flow", desc: "Capture leads, convert to deals, close as clients — no copy-pasting between tools. Every stage tracked automatically." },
                { title: "Revenue forecasting built in", desc: "See predicted monthly revenue based on active deals, probability scores, and historical win rates — live on your dashboard." },
              ].map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#5355D6]/20 bg-[#5355D6]/10">
                    <Check className="h-3.5 w-3.5 text-[#5355D6]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground/80">{b.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Animated Pipeline Dashboard */}
          <div className="flex-1 w-full">
            <div className="relative rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#5355D6]/3 to-transparent pointer-events-none" />

              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Pipeline Board</p>
                <span className="flex items-center gap-1.5 text-[10px] text-[#2A8F7A]">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2A8F7A] opacity-40" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2A8F7A]" />
                  </span>
                  <AnimatedCounter value={42} /> active deals
                </span>
              </div>

              {/* Funnel visualization */}
              <div className="mb-4 flex items-end gap-1.5">
                {stageFunnel.map((s, i) => (
                  <div key={s.label} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-sm transition-all duration-700"
                      style={{
                        height: `${s.pct * 1.2}px`,
                        backgroundColor: i === 0 ? "#5355D6" : i === 1 ? "#F0A030" : "#2A8F7A",
                        opacity: 0.6 - i * 0.15,
                      }}
                    />
                    <span className="text-[6px] text-muted-foreground/60">{s.label}</span>
                    <span className="text-[8px] font-bold text-foreground">{s.count}</span>
                  </div>
                ))}
              </div>

              {/* Stage columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {pipelineStageData.map((col, ci) => (
                  <div key={col.stage} className="rounded-lg border border-border bg-muted/20 p-2.5">
                    {/* Stage header */}
                    <div className="mb-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-semibold" style={{ color: col.color }}>{col.stage}</span>
                        <span className="flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold" style={{ backgroundColor: `${col.color}20`, color: col.color }}>{col.deals.length}</span>
                      </div>
                      {/* Mini progress bar */}
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-border/30">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${(col.deals.length / 3) * 100}%`, backgroundColor: col.color }}
                        />
                      </div>
                    </div>

                    {/* Deal cards */}
                    <div className="space-y-1.5">
                      {col.deals.map((deal, di) => {
                        const isMoving = movingDeal === ci && di === 0;
                        return (
                          <div
                            key={deal.company}
                            className={`rounded-md border px-2 py-1.5 transition-all duration-500 ${
                              isMoving
                                ? "border-[#5355D6]/40 bg-[#5355D6]/10 shadow-[0_0_16px_rgba(83,85,214,0.12)] scale-[1.02]"
                                : "border-border/60 bg-muted/50 hover:border-border"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {/* Avatar */}
                              <div
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[6px] font-bold text-white"
                                style={{ backgroundColor: col.color }}
                              >
                                {deal.initials}
                              </div>
                              {/* Info */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-[8px] font-medium text-foreground/70 truncate">{deal.company}</span>
                                  <span className="text-[7px] font-semibold" style={{ color: col.color }}>${(deal.amount / 1000).toFixed(0)}k</span>
                                </div>
                                <p className="text-[6px] text-muted-foreground/60">{deal.name}</p>
                              </div>
                            </div>
                            {/* Moving indicator */}
                            {isMoving && (
                              <div className="mt-1 flex items-center gap-1">
                                <span className="h-1 w-1 rounded-full bg-[#5355D6] animate-ping" />
                                <span className="text-[6px] text-[#5355D6]">Engaged — rep just contacted</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom metrics bar */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "Total Pipeline", value: "$134k", color: "#5355D6" },
                  { label: "Avg. Deal Size", value: "$3.2k", color: "#F0A030" },
                  { label: "Win Rate", value: "40%", color: "#2A8F7A" },
                ].map((m) => (
                  <div key={m.label} className="rounded-md bg-muted/20 px-2 py-1.5 text-center">
                    <p className="text-[8px] font-bold" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-[6px] text-muted-foreground/60">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Automation Engine ── */
const automationRules = [
  { trigger: "Deal stage → Closed Won", action: "Send onboarding email + create project", status: "Triggered 12x today", color: "#2A8F7A" },
  { trigger: "Lead score > 80", action: "Assign to senior sales rep + notify", status: "Triggered 8x today", color: "#5355D6" },
  { trigger: "Invoice overdue > 7d", action: "Send payment reminder + flag account", status: "Triggered 3x today", color: "#F0A030" },
  { trigger: "New hire created", action: "Setup Slack account + assign onboarding tasks", status: "Scheduled daily", color: "#7B7FFF" },
];

export function ShowcaseEfficiency() {
  const [activeRule, setActiveRule] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActiveRule((r) => (r + 1) % automationRules.length), 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="automation-engine" className="bg-background px-4 py-16 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-12 lg:flex-row-reverse lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#5355D6]">Automation Engine</p>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Build rules, let Flowsyc{" "}
              <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
                do the work
              </span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Flowsyc's automation engine lets you create conditional triggers across every module — assign leads, send emails, update deal stages, fire alerts, and schedule tasks automatically.
            </p>
            <div className="mt-6 inline-flex items-baseline gap-2 rounded-xl border border-[#5355D6]/20 bg-[#5355D6]/5 px-4 py-2">
              <span className="text-2xl font-bold text-[#5355D6]"><AnimatedCounter value={1250} /></span>
              <span className="text-xs text-muted-foreground">automated actions this month</span>
            </div>
            <div className="mt-8 space-y-5">
              {[
                { title: "Rules, Alerts, Schedules & GTM Flows", desc: "Four automation types: rule-based triggers, threshold alerts, scheduled jobs, and go-to-market playbooks — all configurable without code." },
                { title: "Cross-module actions", desc: "One rule can update a deal stage, notify a team member via Socket.IO, create a follow-up task, and log the action — simultaneously." },
              ].map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#5355D6]/20 bg-[#5355D6]/10">
                    <Check className="h-3.5 w-3.5 text-[#5355D6]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground/80">{b.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Animated Automation Rules */}
          <div className="flex-1 w-full">
            <div className="relative rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F0A030]/2 to-transparent pointer-events-none" />
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Active Automation Rules</p>
                <span className="flex items-center gap-1 text-[10px]"><Zap className="h-3 w-3 text-[#F0A030]" /> <span className="text-[#F0A030]"><AnimatedCounter value={12} /></span> <span className="text-muted-foreground">running</span></span>
              </div>
              <div className="space-y-2">
                {automationRules.map((rule, i) => {
                  const isActive = activeRule === i;
                  return (
                    <div
                      key={rule.trigger}
                      className={`relative overflow-hidden rounded-lg border p-3 transition-all duration-500 ${
                        isActive
                          ? "border-[#5355D6]/30 bg-[#5355D6]/8 shadow-[0_0_16px_rgba(83,85,214,0.06)]"
                          : "border-border bg-muted/20"
                      }`}
                    >
                      {/* Active pulse line */}
                      {isActive && (
                        <div className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-[#5355D6] to-transparent animate-pulse" />
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <div className={`relative ${isActive ? "animate-pulse" : ""}`}>
                              <GitBranch className="h-3 w-3 shrink-0" style={{ color: rule.color }} />
                            </div>
                            <span className="text-[11px] font-medium text-foreground/70">{rule.trigger}</span>
                          </div>
                          <p className="mt-1 text-[9px] text-muted-foreground">→ {rule.action}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-[8px] font-medium" style={{ color: rule.color }}>{rule.status}</span>
                        </div>
                      </div>
                      {/* Animated firing indicator */}
                      {isActive && (
                        <div className="mt-2 flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-[#F0A030] animate-ping" />
                          <span className="text-[7px] text-[#F0A030]">Firing...</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60"><Clock className="h-3 w-3" /> Avg response: 1.2s</span>
                <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60"><BellRing className="h-3 w-3" /> 0 failures</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── HR & People ── */
const directors = [
  { name: "Mike Park", role: "VP Sales", color: "#2A8F7A", team: 8 },
  { name: "Lisa Ray", role: "VP Engineering", color: "#F0A030", team: 12 },
  { name: "James Koh", role: "VP People", color: "#7B7FFF", team: 5 },
];

const hrMetrics = [
  { label: "Attendance", value: 94, suffix: "%", icon: UserCheck, color: "#2A8F7A" },
  { label: "Payroll Processed", value: 128, suffix: "k", prefix: "$", icon: Shield, color: "#5355D6" },
  { label: "Open Positions", value: 4, suffix: "", icon: BarChart3, color: "#F0A030" },
];

export function ShowcaseSatisfaction() {
  const [hoveredDir, setHoveredDir] = useState<number | null>(null);

  return (
    <section id="hr-management" className="bg-background px-4 py-16 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          <div className="flex-1 text-center lg:text-left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#5355D6]">HR & People</p>
            <h2 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Manage your entire team{" "}
              <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
                in one place
              </span>
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Flowsyc's HR module covers the full employee lifecycle — hiring pipeline, onboarding, attendance tracking, payroll processing, leave management, and performance reviews.
            </p>
            <div className="mt-6 inline-flex items-baseline gap-2 rounded-xl border border-[#5355D6]/20 bg-[#5355D6]/5 px-4 py-2">
              <span className="text-2xl font-bold text-[#5355D6]"><AnimatedCounter value={4} /></span>
              <span className="text-xs text-muted-foreground">roles · Admin · Manager · Employee · Client</span>
            </div>
            <div className="mt-8 space-y-5">
              {[
                { title: "Hiring → Onboarding → Payroll", desc: "Post jobs, track candidates, onboard new hires, and run payroll — all connected. No separate HR tool needed." },
                { title: "Role-based access control", desc: "Every team member sees only what their role allows. Admins control permissions granularly across all modules." },
              ].map((b) => (
                <div key={b.title} className="flex items-start gap-4">
                  <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-[#5355D6]/20 bg-[#5355D6]/10">
                    <Check className="h-3.5 w-3.5 text-[#5355D6]" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground/80">{b.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Animated Org Chart */}
          <div className="flex-1 w-full">
            <div className="relative rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#7B7FFF]/2 to-transparent pointer-events-none" />
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Team Overview</p>
                <span className="flex items-center gap-1 text-[10px]">
                  <Users className="h-3 w-3 text-[#5355D6]" />
                  <span className="text-[#5355D6]"><AnimatedCounter value={28} /></span>
                  <span className="text-muted-foreground">members</span>
                </span>
              </div>
              <div className="flex flex-col items-center">
                {/* CEO with glow */}
                <div className="relative rounded-lg border border-[#5355D6]/30 bg-[#5355D6]/10 px-5 py-2.5 shadow-[0_0_16px_rgba(83,85,214,0.08)]">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-transparent via-[#5355D6]/5 to-transparent animate-[shimmer_4s_ease-in-out_infinite]" />
                  <p className="relative text-xs font-semibold text-[#5355D6]">Sarah Chen</p>
                  <p className="relative text-[8px] text-muted-foreground">CEO</p>
                </div>
                {/* Animated connector lines */}
                <div className="flex justify-center gap-12">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-4 w-px bg-gradient-to-b from-[#5355D6]/40 to-transparent animate-pulse" style={{ animationDelay: `${i * 300}ms` }} />
                  ))}
                </div>
                <div className="h-px w-full max-w-[256px] bg-gradient-to-r from-transparent via-[#5355D6]/30 to-transparent" />
                {/* Directors */}
                <div className="mt-0 flex gap-2 sm:gap-4">
                  {directors.map((d, i) => {
                    const isHovered = hoveredDir === i;
                    return (
                      <div
                        key={d.name}
                        className="flex flex-col items-center transition-all duration-300"
                        onMouseEnter={() => setHoveredDir(i)}
                        onMouseLeave={() => setHoveredDir(null)}
                        style={{ transform: isHovered ? "translateY(-4px)" : "translateY(0)" }}
                      >
                        <div
                          className="relative rounded-lg border px-3 py-2 text-center transition-all duration-300"
                          style={{
                            borderColor: isHovered ? d.color : `${d.color}30`,
                            backgroundColor: `${d.color}10`,
                            boxShadow: isHovered ? `0 0 20px ${d.color}20` : "none",
                          }}
                        >
                          <p className="text-[10px] font-semibold transition-colors" style={{ color: d.color }}>{d.name}</p>
                          <p className="text-[7px] text-muted-foreground">{d.role}</p>
                        </div>
                        <div className="mt-2 flex -space-x-1">
                          {Array.from({ length: Math.min(d.team, 4) }).map((_, ai) => (
                            <div
                              key={ai}
                              className="flex h-4 w-4 items-center justify-center rounded-full border border-border/50 bg-muted text-[5px] font-bold text-muted-foreground transition-all duration-300"
                              style={isHovered ? { borderColor: `${d.color}50`, backgroundColor: `${d.color}15` } : {}}
                            >
                              {["A", "K", "M", "R", "T", "J"][ai]}
                            </div>
                          ))}
                          {d.team > 4 && <span className="text-[6px] text-muted-foreground/40 ml-1">+{d.team - 4}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Metrics row */}
                <div className="mt-5 grid w-full grid-cols-3 gap-1.5 sm:gap-2">
                  {hrMetrics.map((m) => (
                    <div key={m.label} className="rounded-lg border border-border bg-muted/20 px-2.5 py-2 text-center transition-all duration-300 hover:border-[#5355D6]/20 hover:bg-[#5355D6]/5">
                      <m.icon className="mx-auto mb-1 h-3 w-3" style={{ color: m.color }} />
                      <p className="text-xs font-bold text-foreground">
                        {m.prefix || ""}<AnimatedCounter value={m.value} suffix={m.suffix} />
                      </p>
                      <p className="text-[7px] text-muted-foreground/60">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
