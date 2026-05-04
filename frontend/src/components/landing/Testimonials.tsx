import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Flowsyc replaced 5 tools we were paying for. Our team onboarded in a day and deal closures went up 40% in the first month.",
    name: "Sarah Chen",
    role: "VP of Sales",
    company: "TechFlow Inc",
    avatar: "SC",
    color: "#5355D6",
    rating: 5,
    logo: "TF",
  },
  {
    quote: "The unified dashboard gives every department visibility they never had. It's like having Salesforce, Asana, and BambooHR in one place.",
    name: "Marcus Johnson",
    role: "Operations Director",
    company: "ScaleUp Co",
    avatar: "MJ",
    color: "#2A8F7A",
    rating: 5,
    logo: "SC",
  },
  {
    quote: "Automation rules alone saved us 20+ hours per week. ROI was visible within the first month.",
    name: "Elena Rodriguez",
    role: "CEO",
    company: "GrowthLab",
    avatar: "ER",
    color: "#F0A030",
    rating: 5,
    logo: "GL",
  },
  {
    quote: "We replaced Salesforce, HubSpot, and three other tools. Flowsyc does everything we need — and it's a fraction of the cost.",
    name: "David Park",
    role: "CTO",
    company: "Innovate.io",
    avatar: "DP",
    color: "#5355D6",
    rating: 5,
    logo: "IO",
  },
  {
    quote: "HR and payroll integration is seamless. Our team management is completely streamlined now.",
    name: "Amanda Foster",
    role: "HR Director",
    company: "PeopleFirst",
    avatar: "AF",
    color: "#2A8F7A",
    rating: 5,
    logo: "PF",
  },
  {
    quote: "Real-time analytics changed how we do quarterly planning. We make decisions in hours, not weeks.",
    name: "James Wilson",
    role: "Finance Lead",
    company: "DataDriven",
    avatar: "JW",
    color: "#F0A030",
    rating: 5,
    logo: "DD",
  },
];

const avatarGradients: Record<string, string> = {
  "#5355D6": "from-[#5355D6] to-[#7B7FFF]",
  "#2A8F7A": "from-[#2A8F7A] to-[#34D399]",
  "#F0A030": "from-[#F0A030] to-[#FBBF24]",
};

export default function Testimonials() {
  return (
    <section id="testimonials" className="bg-[#030308] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <div className="mb-4 inline-block rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Testimonials
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Loved by{" "}
            <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
              Teams Worldwide
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/35">
            Real stories from teams that replaced multiple tools with Flowsyc.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="group overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
            >
              <Quote className="mb-3 h-5 w-5 opacity-20" style={{ color: t.color }} />

              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-[#F0A030] text-[#F0A030]" />
                ))}
              </div>

              <p className="mb-5 text-sm leading-relaxed text-white/60">"{t.quote}"</p>

              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradients[t.color] ?? "from-[#5355D6] to-[#7B7FFF]"} text-xs font-bold text-white shadow-lg`}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/80">{t.name}</p>
                  <p className="text-xs text-white/30">{t.role} · {t.company}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-8 py-6">
          {[
            { value: "4.9/5", label: "Average Rating" },
            { value: "500+", label: "Teams Onboarded" },
            { value: "98%", label: "Retention Rate" },
            { value: "< 1 day", label: "Avg. Onboarding" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className="mt-1 text-xs text-white/35">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
