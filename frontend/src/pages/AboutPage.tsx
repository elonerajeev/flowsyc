import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";

const features = [
  "CRM & Sales Pipeline", "Project & Task Management", "HR & Payroll",
  "Invoicing & Finance", "Analytics & Reports", "Workflow Automation",
  "Role-Based Access (4 roles)", "Real-Time Notifications (Socket.IO)",
  "Audit Logs", "Multi-Workspace", "Gmail & Calendar Integration", "REST API",
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#030308] px-4 py-20">
      <div className="mx-auto max-w-3xl">
        <button onClick={() => navigate("/")} className="mb-8 flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </button>

        <div className="mb-12">
          <div className="mb-4 inline-block rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            About Flowsyc
          </div>
          <h1 className="text-4xl font-bold text-white">
            Enterprise CRM for{" "}
            <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
              Modern Businesses
            </span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-white/40">
            Flowsyc is an all-in-one business management platform built to replace the fragmented stack of CRM, project management, HR, and finance tools that modern teams struggle with.
          </p>
        </div>

        <div className="mb-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <h2 className="mb-2 text-xl font-bold text-white">The Problem We Solve</h2>
          <p className="text-sm leading-relaxed text-white/40">
            Most businesses run on 5–10 disconnected SaaS tools — Salesforce for CRM, Asana for projects, BambooHR for people, QuickBooks for finance. Data is scattered, teams are siloed, and costs add up fast. Flowsyc brings everything into one unified platform with a single source of truth.
          </p>
        </div>

        <div className="mb-12">
          <h2 className="mb-6 text-xl font-bold text-white">What's Inside</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5355D6]" />
                <span className="text-sm text-white/60">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-12 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8">
          <h2 className="mb-2 text-xl font-bold text-white">Tech Stack</h2>
          <p className="text-sm leading-relaxed text-white/40">
            React 18 + TypeScript + Vite frontend deployed on Vercel. Express 5 + TypeScript backend on EC2. PostgreSQL with Prisma ORM (28+ models). Socket.IO for real-time. JWT auth with Google OAuth. Prometheus + Grafana + Loki for monitoring.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button onClick={() => navigate("/signup")} className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#5355D6] px-7 py-3.5 text-sm font-semibold text-white hover:bg-[#5355D6]/90 transition-all">
            Get Started Free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button onClick={() => navigate("/contact")} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-7 py-3.5 text-sm font-semibold text-white/70 hover:text-white transition-all">
            Contact Us
          </button>
        </div>
      </div>
    </div>
  );
}
