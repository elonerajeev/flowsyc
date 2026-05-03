import { useNavigate } from "react-router-dom";
import { ArrowRight, UserPlus, Plug, TrendingUp } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Sign Up in 30 Seconds",
    description: "Create your account with email or Google. No credit card required. Your workspace is ready instantly.",
    color: "#5355D6",
    bgColor: "bg-[#5355D6]/10",
    borderColor: "border-[#5355D6]/20",
  },
  {
    icon: Plug,
    step: "02",
    title: "Connect Your Tools",
    description: "Link Gmail, Google Calendar, Slack, or import from your existing CRM. We handle the data migration for you.",
    color: "#2A8F7A",
    bgColor: "bg-[#2A8F7A]/10",
    borderColor: "border-[#2A8F7A]/20",
  },
  {
    icon: TrendingUp,
    step: "03",
    title: "Grow Your Business",
    description: "Track deals, automate workflows, manage your team, and watch your revenue grow — all from one dashboard.",
    color: "#F0A030",
    bgColor: "bg-[#F0A030]/10",
    borderColor: "border-[#F0A030]/20",
  },
];

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <section id="how-it-works" className="bg-[#030308] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <div className="mb-4 inline-block rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            How It Works
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Up and Running in{" "}
            <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
              3 Simple Steps
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/35 sm:text-lg">
            No complex setup. No IT department needed. Just sign up and start managing your business.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.step} className="relative group">
              {/* Connector line between steps (hidden on last) */}
              {i < steps.length - 1 && (
                <div className="absolute top-16 left-[60%] hidden h-px w-[80%] bg-gradient-to-r from-white/10 to-transparent lg:block" />
              )}

              <div className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 transition-all duration-300 hover:border-white/10`}>
                {/* Step number + icon */}
                <div className="mb-6 flex items-center gap-4">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-xl border ${step.borderColor} ${step.bgColor}`}>
                    <step.icon className="h-6 w-6" style={{ color: step.color }} />
                  </div>
                  <span className="text-4xl font-bold text-white/5">{step.step}</span>
                </div>

                <h3 className="mb-3 text-xl font-bold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/40">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <button
            onClick={() => navigate("/signup")}
            className="group inline-flex items-center gap-2 rounded-xl bg-[#5355D6] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#5355D6]/20 transition-all hover:bg-[#5355D6]/90 hover:shadow-[#5355D6]/30"
          >
            Start Free — Takes 30 Seconds
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="mt-4 text-xs text-white/25">
            No credit card required · 14-day free trial · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
