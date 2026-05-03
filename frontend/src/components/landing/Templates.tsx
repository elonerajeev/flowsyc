import { ArrowRight, FileBarChart, UserPlus, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

const templates = [
  {
    icon: FileBarChart,
    title: "Sales Pipeline Report",
    description: "Track deals, forecast revenue, and analyze conversion rates across your entire pipeline.",
    metric: "$2.4M Pipeline",
    metricColor: "#2A8F7A",
    bgColor: "bg-[#2A8F7A]/10",
    borderColor: "border-[#2A8F7A]/20",
  },
  {
    icon: UserPlus,
    title: "Client Onboarding Kit",
    description: "Welcome new clients with automated workflows, document collection, and task assignments.",
    metric: "48h Onboarding",
    metricColor: "#5355D6",
    bgColor: "bg-[#5355D6]/10",
    borderColor: "border-[#5355D6]/20",
  },
  {
    icon: DollarSign,
    title: "Financial Dashboard",
    description: "Monitor invoices, payments, expenses, and cash flow in real-time with visual reports.",
    metric: "$180k Revenue",
    metricColor: "#F0A030",
    bgColor: "bg-[#F0A030]/10",
    borderColor: "border-[#F0A030]/20",
  },
];

export default function Templates() {
  const navigate = useNavigate();

  return (
    <section id="templates" className="bg-[#0A0F1A] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
            Ready-to-use Templates
          </div>
          <h2 className="mt-4 text-3xl font-bold text-white sm:text-4xl md:text-5xl">
            Streamlined workflows for{" "}
            <span className="text-[#5355D6]">every team</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-white/40 sm:text-base">
            Hit the ground running with pre-built templates designed for sales, onboarding, and finance teams.
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {templates.map((t) => (
            <div
              key={t.title}
              className="group cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#111827]/60 p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/10 hover:bg-[#111827]/90"
            >
              {/* Mini chart */}
              <div className="mb-5 flex h-20 items-end gap-1">
                {[40, 65, 45, 75, 55, 85, 70, 90, 60, 95].map((h, j) => (
                  <div
                    key={j}
                    className="flex-1 rounded-t-sm transition-all group-hover:opacity-80"
                    style={{
                      height: `${h}%`,
                      backgroundColor: t.metricColor,
                      opacity: 0.2 + (j / 10) * 0.6,
                    }}
                  />
                ))}
              </div>

              {/* Metric with colorful icon */}
              <div className="mb-3 flex items-center gap-2">
                <div className={`flex h-6 w-6 items-center justify-center rounded-md ${t.bgColor}`}>
                  <t.icon className="h-3.5 w-3.5" style={{ color: t.metricColor }} />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: t.metricColor }}>
                  {t.metric}
                </span>
              </div>

              <h3 className="mb-2 text-base font-semibold text-white">{t.title}</h3>
              <p className="text-xs leading-relaxed text-white/35">{t.description}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
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
