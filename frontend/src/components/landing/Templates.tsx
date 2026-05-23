import { useState, useEffect, useRef } from "react";
import { ArrowRight, FileBarChart, UserPlus, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

/* ── Animated counter ── */
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
          const steps = 25;
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

/* ── Pipeline Funnel ── */
const funnelStages = [
  { label: "Leads", pct: 100 },
  { label: "Qualified", pct: 78 },
  { label: "Proposal", pct: 52 },
  { label: "Negotiation", pct: 35 },
  { label: "Closed", pct: 22 },
];

function PipelineFunnel() {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex w-full flex-col justify-end gap-1.5">
      {funnelStages.map((s, i) => (
        <div key={s.label} className="flex items-center gap-2" style={{ animationDelay: `${i * 120}ms` }}>
          <div className="relative flex items-center flex-1">
            <div
              className="h-5 rounded-r-sm transition-all duration-1000 ease-out"
              style={{
                width: visible ? `${s.pct}%` : "0%",
                backgroundColor: "#2A8F7A",
                opacity: 0.3 + (s.pct / 100) * 0.5,
              }}
            />
            {/* Animated shimmer overlay */}
            <div
              className="absolute inset-0 h-5 rounded-r-sm bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_ease-in-out_infinite]"
              style={{ width: `${s.pct}%`, opacity: visible ? 1 : 0 }}
            />
            <span className="absolute right-1 text-[6px] font-medium text-white/70">{s.pct}%</span>
          </div>
          <span className="text-[7px] text-muted-foreground w-10 text-right">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Onboarding Timeline ── */
const timelineItems = [
  { label: "Welcome sent", time: "0h", done: true, person: "SM" },
  { label: "Docs collected", time: "4h", done: true, person: "JD" },
  { label: "Team intro", time: "12h", done: true, person: "AK" },
  { label: "Tools setup", time: "24h", done: false, person: null },
  { label: "Review", time: "48h", done: false, person: null },
];

function OnboardingTimeline() {
  const [activeStep, setActiveStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(() => setActiveStep((s) => (s + 1) % 5), 2500);
    return () => clearInterval(id);
  }, [visible]);

  return (
    <div ref={ref} className="flex w-full flex-col gap-2">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted-foreground/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] transition-all duration-1000"
            style={{ width: visible ? "60%" : "0%" }}
          />
        </div>
        <span className="text-[8px] font-semibold text-[#5355D6]">3/5</span>
      </div>
      {/* Timeline */}
      <div className="flex items-start justify-between overflow-x-auto">
        {timelineItems.map((s, i) => {
          const isActive = visible && activeStep === i;
          return (
            <div key={s.label} className="flex flex-col items-center gap-1.5 transition-all duration-500">
              <div className="relative">
                {s.done ? (
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full bg-[#5355D6] transition-all duration-500 ${isActive ? "shadow-[0_0_16px_rgba(83,85,214,0.6)] scale-110" : "shadow-[0_0_8px_rgba(83,85,214,0.4)]"}`}>
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                ) : (
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border border-dashed transition-all duration-500 ${
                    isActive ? "border-[#5355D6]/60 bg-[#5355D6]/10" : "border-muted-foreground/30 bg-muted/30"
                  }`}>
                    <div className={`h-1.5 w-1.5 rounded-full transition-all duration-500 ${isActive ? "bg-[#5355D6] animate-pulse" : "bg-white/15"}`} />
                  </div>
                )}
                {/* Connector line */}
                {i < timelineItems.length - 1 && (
                  <div className={`absolute left-6 top-3 h-px w-[calc(100%+8px)] transition-all duration-700 ${s.done ? "bg-[#5355D6]/40" : "bg-muted-foreground/10"}`} />
                )}
              </div>
              <span className={`text-[7px] transition-colors duration-300 ${isActive ? "text-[#5355D6] font-semibold" : "text-muted-foreground/60"}`}>{s.label}</span>
              <span className={`text-[6px] font-medium transition-colors duration-300 ${s.done ? "text-[#5355D6]" : "text-muted-foreground/30"}`}>{s.time}</span>
            </div>
          );
        })}
      </div>
      {/* Person avatars */}
      <div className="flex items-center gap-1">
        {["SM", "JD", "AK"].map((p, i) => (
          <div
            key={p}
            className="flex h-4 w-4 items-center justify-center rounded-full text-[6px] font-bold text-[#5355D6] transition-all duration-300"
            style={{
              backgroundColor: `rgba(83,85,214,${visible ? 0.2 + i * 0.1 : 0})`,
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0)",
              transitionDelay: `${i * 150}ms`,
            }}
          >
            {p}
          </div>
        ))}
        <span className="ml-1 text-[6px] text-muted-foreground/40">+2 pending</span>
      </div>
    </div>
  );
}

/* ── Financial Mini Dashboard ── */
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const revenueData = [45, 52, 48, 62, 58, 72];
const expensesData = [38, 35, 40, 42, 38, 36];
const maxVal = Math.max(...revenueData);

function FinancialMiniDashboard() {
  const [visible, setVisible] = useState(false);
  const [lineProgress, setLineProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          setTimeout(() => setLineProgress(100), 300);
          obs.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const buildPath = (data: number[], offset = 0) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (data.length - 1)) * 180} ${40 - (v / maxVal) * 35}`).join(" ");

  return (
    <div ref={ref} className="flex w-full flex-col gap-3">
      {/* Mini stat tiles */}
      <div className="grid grid-cols-3 gap-1.5 sm:flex sm:gap-2">
        {[
          { label: "Revenue", value: 180, suffix: "k", change: "+23%", changeColor: "#2A8F7A", prefix: "$" },
          { label: "Expenses", value: 112, suffix: "k", change: "-8%", changeColor: "#F0A030", prefix: "$" },
          { label: "Profit", value: 68, suffix: "k", change: "+42%", changeColor: "#2A8F7A", prefix: "$" },
        ].map((s) => (
          <div key={s.label} className="flex flex-1 flex-col rounded-md border border-border bg-muted/30 px-2 py-1.5 transition-all duration-300 hover:border-[#5355D6]/20 hover:bg-[#5355D6]/5">
            <span className="text-[7px] text-muted-foreground/60">{s.label}</span>
            <span className="text-xs font-bold text-foreground">
              {s.prefix}{visible ? <AnimatedCounter value={s.value} suffix={s.suffix} /> : "0"}
            </span>
            <span className="text-[6px]" style={{ color: s.changeColor }}>{s.change}</span>
          </div>
        ))}
      </div>
      {/* Animated area chart */}
      <div className="h-10">
        <svg viewBox="0 0 180 40" className="h-full w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F0A030" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#F0A030" stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Area fill */}
          <path
            d={buildPath(revenueData) + ` L 180 40 L 0 40 Z`}
            fill="url(#revGrad)"
            style={{ opacity: visible ? 1 : 0, transition: "opacity 0.8s ease" }}
          />
          {/* Revenue line - animated draw */}
          <path
            d={buildPath(revenueData)}
            fill="none"
            stroke="#F0A030"
            strokeWidth={1.5}
            strokeDasharray="200"
            strokeDashoffset={visible ? 0 : 200}
            style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }}
          />
          {/* Expenses line */}
          <path
            d={buildPath(expensesData)}
            fill="none"
            stroke="#DC3545"
            strokeWidth={1}
            strokeDasharray="3 2"
            strokeDashoffset={visible ? 0 : 200}
            style={{ transition: "stroke-dashoffset 1.8s ease-in-out" }}
            opacity={0.5}
          />
        </svg>
      </div>
      {/* Legend */}
      <div className="flex gap-3">
        <span className="flex items-center gap-1 text-[6px] text-muted-foreground/60">
          <span className="h-1.5 w-1.5 rounded-full bg-[#F0A030]" /> Revenue
        </span>
        <span className="flex items-center gap-1 text-[6px] text-muted-foreground/60">
          <span className="h-1.5 w-1.5 rounded-full bg-[#DC3545]" /> Expenses
        </span>
        <span className="flex items-center gap-1 text-[6px] text-[#2A8F7A]">↑ 23% YoY</span>
      </div>
    </div>
  );
}

/* ── Templates data ── */
const templates = [
  {
    icon: FileBarChart,
    title: "Sales Pipeline Report",
    description: "Track deals, forecast revenue, and analyze conversion rates across your entire pipeline.",
    metric: "$2.4M Pipeline",
    metricColor: "#2A8F7A",
    bgColor: "bg-[#2A8F7A]/10",
    chart: <PipelineFunnel />,
  },
  {
    icon: UserPlus,
    title: "Client Onboarding Kit",
    description: "Welcome new clients with automated workflows, document collection, and task assignments.",
    metric: "48h Onboarding",
    metricColor: "#5355D6",
    bgColor: "bg-[#5355D6]/10",
    chart: <OnboardingTimeline />,
  },
  {
    icon: DollarSign,
    title: "Financial Dashboard",
    description: "Monitor invoices, payments, expenses, and cash flow in real-time with visual reports.",
    metric: "$180k Revenue",
    metricColor: "#F0A030",
    bgColor: "bg-[#F0A030]/10",
    chart: <FinancialMiniDashboard />,
  },
];

export default function Templates() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <section id="templates" className="bg-background px-4 py-16 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block rounded-full border border-border bg-muted/40 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Ready-to-use Templates
          </div>
          <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl md:text-5xl">
            Jumpstart with{" "}
            <span className="text-[#5355D6]">proven templates</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Hit the ground running with pre-built templates designed for sales, onboarding, and finance teams.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {templates.map((t, i) => (
            <div
              key={t.title}
              className="group cursor-pointer overflow-hidden rounded-xl border border-border bg-card/60 p-6 backdrop-blur-sm transition-all duration-300 hover:border-border hover:bg-card/90"
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                transform: hoveredCard === i ? "translateY(-4px)" : "translateY(0)",
                boxShadow: hoveredCard === i ? "0 12px 40px rgba(0,0,0,0.12)" : "none",
              }}
            >
              <div className="relative mb-5">
                {t.chart}
              </div>

              <div className="mb-3 flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-md ${t.bgColor}`}>
                  <t.icon className="h-3.5 w-3.5" style={{ color: t.metricColor }} />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: t.metricColor }}>
                  {t.metric}
                </span>
              </div>

              <h3 className="mb-2 text-base font-semibold text-foreground">{t.title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{t.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => navigate("/signup")}
            className="group inline-flex items-center gap-2 rounded-xl bg-[#5355D6] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#5355D6]/20 transition-all hover:bg-[#5355D6]/90 hover:shadow-[#5355D6]/30"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
