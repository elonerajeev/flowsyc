import { useState, useEffect, lazy, Suspense } from "react";
import { LayoutDashboard, Users, FolderKanban, UserSquare2, FileText, Bell, Search, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OverviewTab = lazy(() => import("./dashboard/OverviewTab"));
const CRMTab = lazy(() => import("./dashboard/CRMTab"));
const ProjectsTab = lazy(() => import("./dashboard/ProjectsTab"));
const HRTab = lazy(() => import("./dashboard/HRTab"));
const InvoicesTab = lazy(() => import("./dashboard/InvoicesTab"));

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, color: "#5355D6" },
  { id: "crm", label: "CRM", icon: Users, color: "#2A8F7A" },
  { id: "projects", label: "Projects", icon: FolderKanban, color: "#F0A030" },
  { id: "hr", label: "HR", icon: UserSquare2, color: "#7B7FFF" },
  { id: "invoices", label: "Invoices", icon: FileText, color: "#DC3545" },
];

const sidebarItems = [
  { label: "Overview", icon: LayoutDashboard, tab: "overview" },
  { label: "CRM", icon: Users, tab: "crm" },
  { label: "Projects", icon: FolderKanban, tab: "projects" },
  { label: "HR", icon: UserSquare2, tab: "hr" },
  { label: "Invoices", icon: FileText, tab: "invoices" },
];

function TabLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/10 border-t-[#5355D6]" />
    </div>
  );
}

export default function LiveDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [tick, setTick] = useState(0);

  // Simulate live data ticking
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const active = tabs.find((t) => t.id === activeTab)!;

  return (
    <section id="product" className="bg-[#030308] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        {/* Section header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#5355D6]/20 bg-[#5355D6]/5 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2A8F7A] opacity-40" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2A8F7A]" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5355D6]">
              Interactive Platform Preview
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Explore Flowsyc{" "}
            <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
              Live
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/35 sm:text-lg">
            Click through the modules below — this is the actual interface you'll use after signing up.
          </p>
        </div>

        {/* App shell — clipped to show top portion, blurred CTA on bottom */}
        <div className="relative">
        {/* Height clip wrapper */}
        <div className="relative max-h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[#0D1117] shadow-[0_0_80px_rgba(83,85,214,0.08)]">
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5355D6]/40 to-transparent" />

          {/* Top bar */}
          <div className="flex items-center justify-between border-b border-white/5 bg-[#0A0F1A]/80 px-4 py-2.5 sm:px-5">
            {/* Left: logo + breadcrumb */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="Flowsyc" className="h-5 w-5" />
                <span className="text-sm font-bold text-white/80">Flowsyc</span>
              </div>
              <span className="text-white/20">/</span>
              <span className="text-xs font-medium" style={{ color: active.color }}>{active.label}</span>
            </div>

            {/* Right: search + icons */}
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-1.5 sm:flex">
                <Search className="h-3 w-3 text-white/20" />
                <span className="text-[10px] text-white/20">Search...</span>
              </div>
              <div className="relative">
                <Bell className="h-4 w-4 text-white/30" />
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[#DC3545]" />
              </div>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#5355D6]/20 text-[9px] font-bold text-[#5355D6]">
                A
              </div>
            </div>
          </div>

          <div className="flex">
            {/* Sidebar */}
            <div className="hidden w-44 shrink-0 border-r border-white/5 bg-[#0A0F1A]/50 p-3 sm:block">
              <div className="space-y-0.5">
                {sidebarItems.map((item) => {
                  const isActive = activeTab === item.tab;
                  const tabColor = tabs.find((t) => t.id === item.tab)?.color ?? "#5355D6";
                  return (
                    <button
                      key={item.label}
                      onClick={() => setActiveTab(item.tab)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs transition-all ${
                        isActive ? "font-semibold" : "text-white/30 hover:bg-white/[0.03] hover:text-white/60"
                      }`}
                      style={isActive ? { backgroundColor: `${tabColor}15`, color: tabColor } : {}}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      {item.label}
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tabColor }} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Live indicator */}
              <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2A8F7A] opacity-40" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#2A8F7A]" />
                  </span>
                  <span className="text-[9px] text-white/30">Live · {tick} updates</span>
                </div>
              </div>

              <button className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-white/20 hover:text-white/40">
                <Settings className="h-3.5 w-3.5" />Settings
              </button>
            </div>

            {/* Main content */}
            <div className="min-w-0 flex-1 p-4 sm:p-5">
              {/* Mobile tab bar */}
              <div className="mb-4 flex gap-1 overflow-x-auto sm:hidden">
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[10px] font-semibold transition-all ${
                      activeTab === t.id ? "text-white" : "text-white/30"
                    }`}
                    style={activeTab === t.id ? { backgroundColor: `${t.color}20`, color: t.color } : {}}
                  >
                    <t.icon className="h-3 w-3" />
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <Suspense fallback={<TabLoader />}>
                {activeTab === "overview" && <OverviewTab />}
                {activeTab === "crm" && <CRMTab />}
                {activeTab === "projects" && <ProjectsTab />}
                {activeTab === "hr" && <HRTab />}
                {activeTab === "invoices" && <InvoicesTab />}
              </Suspense>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex items-center justify-between border-t border-white/5 bg-[#0A0F1A]/50 px-5 py-2">
            <span className="text-[9px] text-white/20">Flowsyc v2.0 · All data is demo</span>
            <div className="flex items-center gap-1.5 text-[9px] text-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2A8F7A]" />
              All systems operational
            </div>
          </div>
        </div>{/* end clip wrapper */}

        {/* Blur + CTA overlay on bottom half */}
        <div className="absolute bottom-0 left-0 right-0 h-[55%] rounded-b-2xl overflow-hidden">
          {/* Layered blur fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#030308] via-[#030308]/80 to-transparent backdrop-blur-[6px]" />
          {/* Extra dark at very bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[#030308] to-transparent" />

          {/* CTA card */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-4">
            <div className="text-center">
              <p className="text-lg font-bold text-white sm:text-xl">
                See the full dashboard in action
              </p>
              <p className="mt-1.5 text-sm text-white/40">
                Sign up free — no credit card required
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/signup")}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-[#5355D6] px-7 py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(83,85,214,0.4)] transition-all hover:shadow-[0_0_50px_rgba(83,85,214,0.5)]"
              >
                <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-[100%]" />
                Start Free Trial
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </button>
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-7 py-3 text-sm font-semibold text-white/70 backdrop-blur-sm transition-all hover:border-white/25 hover:text-white"
              >
                Log in
              </button>
            </div>
            <p className="text-[11px] text-white/25">
              14-day free trial · Cancel anytime · No credit card
            </p>
          </div>
        </div>
        </div>{/* end relative wrapper */}
      </div>
    </section>
  );
}
