import { useState, useEffect } from "react";
import { ArrowRight, Play, BarChart3, Users, FileText, CheckCircle2, TrendingUp, Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const stats = [
  { label: "Revenue", value: "$84.2k", icon: BarChart3, color: "#5355D6", change: "+12%" },
  { label: "Clients", value: "328", icon: Users, color: "#2A8F7A", change: "+24" },
  { label: "Deals", value: "42", icon: FileText, color: "#F0A030", change: "+8" },
  { label: "Tasks", value: "94%", icon: CheckCircle2, color: "#7B7FFF", change: "on-time" },
];

const sidebarItems = [
  { label: "Overview", active: true },
  { label: "Clients", active: false },
  { label: "Leads", active: false },
  { label: "Deals", active: false },
  { label: "Tasks", active: false },
  { label: "Projects", active: false },
  { label: "Invoices", active: false },
  { label: "Team", active: false },
];

const revenueBar = [35, 45, 40, 55, 50, 65, 60, 70, 75, 85, 80, 95];

const pipeline = [
  { label: "Won", pct: 42, color: "#2A8F7A" },
  { label: "Active", pct: 28, color: "#5355D6" },
  { label: "Pending", pct: 18, color: "#F0A030" },
  { label: "Lost", pct: 12, color: "#DC3545" },
];

const activity = [
  { text: "New deal — Acme Corp", badge: "Won", color: "#2A8F7A" },
  { text: "Task completed", badge: "Done", color: "#5355D6" },
  { text: "Invoice sent", badge: "Pending", color: "#F0A030" },
];

export default function Hero() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [activeTick, setActiveTick] = useState(0);
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Simulate live activity
  useEffect(() => {
    const id = setInterval(() => setActiveTick((n) => n + 1), 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#030308]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_30%_20%,rgba(83,85,214,0.12),transparent_70%)]" />
        <div className="absolute right-0 top-0 h-[700px] w-[700px] rounded-full bg-[#5355D6]/5 blur-[140px]" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#030308] to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Main layout: left text + right dashboard */}
      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col items-center gap-12 px-4 pb-24 pt-28 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:pt-24">

        {/* ── LEFT: Text content ── */}
        <div className={`flex-1 text-center transition-all duration-700 lg:text-left ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
          {/* Badge */}
          <button
            onClick={() => navigate("/signup")}
            className="group mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 backdrop-blur-sm transition-all hover:border-[#5355D6]/30 hover:bg-white/[0.06]"
          >
            <span className="relative flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#5355D6] opacity-20" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#5355D6]" />
            </span>
            <span className="text-xs font-medium text-white/60">All-in-One CRM Platform</span>
            <ArrowRight className="h-3 w-3 text-white/30 transition-transform group-hover:translate-x-0.5" />
          </button>

          {/* Headline */}
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-6xl xl:text-7xl">
            Transform Your
            <br />
            Business Into
            <br />
            <span className="bg-gradient-to-r from-[#5355D6] via-[#7B7FFF] to-[#5355D6] bg-clip-text text-transparent">
              Actionable Results
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/40 lg:mx-0 lg:text-lg">
            Manage clients, leads, deals, projects, tasks, invoices, HR & analytics —
            all in one powerful dashboard.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start">
            <button
              onClick={() => navigate("/signup")}
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-[#5355D6] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_0_40px_rgba(83,85,214,0.3)] transition-all hover:shadow-[0_0_60px_rgba(83,85,214,0.45)]"
            >
              <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
              Start Free Trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={() => setShowDemo(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-7 py-3.5 text-sm font-semibold text-white/70 backdrop-blur-sm transition-all hover:border-white/20 hover:text-white"
            >
              <Play className="h-3.5 w-3.5" />
              Watch Demo
            </button>
          </div>

          {/* Trust */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-white/25 lg:justify-start">
            <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#2A8F7A]" />No credit card</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#5355D6]" />14-day free trial</span>
            <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-[#F0A030]" />Cancel anytime</span>
          </div>

          {/* Social proof */}
          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["#5355D6", "#2A8F7A", "#F0A030", "#7B7FFF", "#DC3545"].map((c, i) => (
                <div key={i} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#030308] text-[9px] font-bold text-white" style={{ backgroundColor: c }}>
                  {["S", "M", "E", "D", "A"][i]}
                </div>
              ))}
            </div>
            <div className="text-xs text-white/30">
              <span className="font-semibold text-white/60">500+ teams</span> already using Flowsyc
            </div>
          </div>

          {/* Star rating */}
          <div className="mt-5 flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className="h-4 w-4 fill-[#F0A030] text-[#F0A030]" viewBox="0 0 20 20">
                  <path d="M10 1l2.39 4.84 5.34.78-3.87 3.77.91 5.33L10 13.27l-4.77 2.51.91-5.33L2.27 6.62l5.34-.78L10 1z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-white/50">
              <span className="font-semibold text-white/70">4.9/5</span> from 500+ reviews
            </span>
          </div>
        </div>

        {/* ── RIGHT: Partial dashboard preview ── */}
        <div
          className={`w-full flex-1 transition-all duration-1000 delay-300 lg:max-w-[660px] ${visible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"}`}
        >
          {/* Outer glow */}
          <div className="absolute -inset-6 rounded-3xl bg-[#5355D6]/8 blur-3xl" />

          {/* App window */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0D1117] shadow-[0_32px_80px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]">
            {/* Top accent line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5355D6]/60 to-transparent" />

            {/* Title bar */}
            <div className="flex items-center justify-between border-b border-white/5 bg-[#0A0F1A]/80 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-[#28CA41]/80" />
                </div>
                <span className="ml-2 text-[10px] text-white/25">Flowsyc — Dashboard</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2A8F7A] opacity-40" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2A8F7A]" />
                </span>
                <span className="text-[9px] text-white/25">Live</span>
                <div className="relative ml-1">
                  <Bell className="h-3.5 w-3.5 text-white/20" />
                  <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#DC3545]" />
                </div>
              </div>
            </div>

            {/* App body */}
            <div className="flex h-[360px] sm:h-[420px]">
              {/* Sidebar */}
              <div className="hidden w-40 shrink-0 border-r border-white/5 bg-[#0A0F1A]/60 p-3 sm:block">
                <div className="mb-5 flex items-center gap-2 px-1">
                  <img src="/logo.svg" alt="" className="h-5 w-5" />
                  <span className="text-xs font-bold text-white/70">Flowsyc</span>
                </div>
                <div className="space-y-0.5">
                  {sidebarItems.map((item) => (
                    <div
                      key={item.label}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] transition-all ${
                        item.active
                          ? "bg-[#5355D6]/15 font-semibold text-[#5355D6]"
                          : "text-white/25 hover:text-white/50"
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${item.active ? "bg-[#5355D6]" : "bg-white/10"}`} />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Main panel */}
              <div className="flex-1 overflow-hidden p-3 sm:p-4">
                {/* Stats */}
                <div className="mb-3 grid grid-cols-4 gap-2">
                  {stats.map((s) => (
                    <div key={s.label} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                      <div className="mb-1.5 flex items-center gap-1">
                        <s.icon className="h-3 w-3" style={{ color: s.color }} />
                        <span className="text-[8px] text-white/30">{s.label}</span>
                      </div>
                      <p className="text-sm font-bold text-white">{s.value}</p>
                      <p className="mt-0.5 text-[8px]" style={{ color: s.color }}>{s.change}</p>
                    </div>
                  ))}
                </div>

                {/* Charts row */}
                <div className="mb-3 flex gap-2">
                  {/* Revenue bar chart */}
                  <div className="flex-1 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-[8px] text-white/30">Revenue</span>
                      <span className="flex items-center gap-0.5 text-[8px] text-[#2A8F7A]">
                        <TrendingUp className="h-2.5 w-2.5" />+23%
                      </span>
                    </div>
                    <div className="flex h-16 items-end gap-px sm:h-20">
                      {revenueBar.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm transition-all"
                          style={{
                            height: `${h}%`,
                            backgroundColor: i === revenueBar.length - 1 ? "#5355D6" : `rgba(83,85,214,${0.2 + (i / revenueBar.length) * 0.4})`,
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Pipeline */}
                  <div className="w-28 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5 sm:w-32">
                    <span className="mb-2 block text-[8px] text-white/30">Pipeline</span>
                    <div className="space-y-1.5">
                      {pipeline.map((p) => (
                        <div key={p.label}>
                          <div className="mb-0.5 flex justify-between text-[7px] text-white/25">
                            <span>{p.label}</span>
                            <span>{p.pct}%</span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-white/5">
                            <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: p.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Activity */}
                <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2.5">
                  <span className="mb-2 block text-[8px] text-white/30">Recent Activity</span>
                  <div className="space-y-1.5">
                    {activity.map((a, i) => (
                      <div
                        key={a.text}
                        className={`flex items-center justify-between rounded-md px-2 py-1.5 transition-all ${
                          i === activeTick % activity.length ? "bg-white/[0.04]" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: a.color }} />
                          <span className="text-[9px] text-white/40">{a.text}</span>
                        </div>
                        <span className="rounded-full px-1.5 py-0.5 text-[7px] font-semibold" style={{ backgroundColor: `${a.color}20`, color: a.color }}>
                          {a.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom fade — partial crop effect */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#030308] via-[#030308]/60 to-transparent" />

            {/* Floating "Sign in to see more" pill */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <button
                onClick={() => navigate("/signup")}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0D1117]/90 px-4 py-2 text-xs font-medium text-white/60 shadow-lg backdrop-blur-sm transition-all hover:border-[#5355D6]/40 hover:text-white"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#5355D6]" />
                Sign up to explore the full dashboard
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Floating stat badges */}
          <div className="absolute -left-2 top-20 hidden xl:block">
            <div className="animate-bounce rounded-xl border border-white/10 bg-[#0D1117]/90 px-3 py-2 shadow-xl backdrop-blur-sm" style={{ animationDuration: "3s" }}>
              <p className="text-[9px] text-white/40">Monthly Revenue</p>
              <p className="text-sm font-bold text-white">$192k <span className="text-[10px] text-[#2A8F7A]">↑23%</span></p>
            </div>
          </div>
          <div className="absolute -right-2 bottom-28 hidden xl:block">
            <div className="animate-bounce rounded-xl border border-white/10 bg-[#0D1117]/90 px-3 py-2 shadow-xl backdrop-blur-sm" style={{ animationDuration: "4s", animationDelay: "1s" }}>
              <p className="text-[9px] text-white/40">Active Deals</p>
              <p className="text-sm font-bold text-white">42 <span className="text-[10px] text-[#5355D6]">↑8</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Modal */}
      {showDemo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowDemo(false)}>
          <div className="relative mx-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-white/10 bg-[#0D1117] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowDemo(false)}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 transition-all hover:bg-white/20 hover:text-white"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            {/* Demo placeholder — replace src with real video when available */}
            <div className="flex aspect-video flex-col items-center justify-center gap-4 bg-[#030308] px-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#5355D6]/10 border border-[#5355D6]/20">
                <svg className="h-8 w-8 text-[#5355D6]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-white">Demo Coming Soon</p>
                <p className="mt-1 text-sm text-white/40">We're recording a full walkthrough. Sign up to get early access.</p>
              </div>
              <button
                onClick={() => { setShowDemo(false); navigate("/signup"); }}
                className="mt-2 rounded-xl bg-[#5355D6] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#5355D6]/90 transition-all"
              >
                Start Free Trial Instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom arc */}
      <div className="absolute bottom-0 left-0 right-0 z-0">
        <svg viewBox="0 0 1440 160" fill="none" className="w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="ag1" x1="720" y1="0" x2="720" y2="160" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#5355D6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#5355D6" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0 160C360 30 1080 30 1440 160" stroke="url(#ag1)" strokeWidth="1.5" />
          <path d="M0 160C360 30 1080 30 1440 160" stroke="url(#ag1)" strokeWidth="12" opacity="0.08" />
        </svg>
      </div>
    </section>
  );
}
