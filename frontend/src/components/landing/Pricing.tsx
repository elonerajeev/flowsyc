import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "0",
    annualPrice: "0",
    description: "For individuals and small teams getting started.",
    features: [
      "Up to 3 team members",
      "500 contacts",
      "Basic sales pipeline",
      "Task management",
      "Email integration",
      "Standard reports",
    ],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "29",
    annualPrice: "23",
    description: "For growing businesses that need more power.",
    features: [
      "Up to 25 team members",
      "Unlimited contacts",
      "Advanced pipeline & forecasting",
      "Project management",
      "HR & attendance tracking",
      "Automation rules (50/mo)",
      "Custom dashboards",
      "Priority support",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    annualPrice: "Custom",
    description: "For large organizations with complex needs.",
    features: [
      "Unlimited team members",
      "Unlimited everything",
      "Advanced analytics & AI insights",
      "Custom integrations & API",
      "SSO & advanced security",
      "Unlimited automation",
      "Dedicated account manager",
      "24/7 premium support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="bg-[#0A0F1A] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Pricing
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Simple,{" "}
            <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
              Transparent
            </span>{" "}
            Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/35 sm:text-lg">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Annual/Monthly Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm ${!isAnnual ? "text-white" : "text-white/40"}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative h-7 w-12 rounded-full transition-colors ${isAnnual ? "bg-[#5355D6]" : "bg-white/15"}`}
              aria-label="Toggle annual pricing"
            >
              <span
                className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${isAnnual ? "translate-x-5" : "translate-x-0.5"}`}
              />
            </button>
            <span className={`text-sm ${isAnnual ? "text-white" : "text-white/40"}`}>
              Annual
            </span>
            {isAnnual && (
              <span className="rounded-full bg-[#2A8F7A]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#2A8F7A]">
                Save 20%
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`group relative overflow-hidden rounded-2xl border p-8 transition-all duration-300 ${
                plan.popular
                  ? "border-[#5355D6]/30 bg-[#5355D6]/5"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/10"
              }`}
            >
              {plan.popular && (
                <>
                  <div className="absolute right-6 top-6">
                    <span className="rounded-full bg-[#5355D6] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                      Most Popular
                    </span>
                  </div>
                  <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#5355D6] to-transparent" />
                </>
              )}

              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-white/40">
                {plan.name}
              </p>

              <div className="mb-4 flex items-baseline gap-1">
                {plan.price === "Custom" ? (
                  <span className="text-5xl font-bold tracking-tight text-white">Custom</span>
                ) : (
                  <>
                    <span className="text-5xl font-bold tracking-tight text-white">
                      ${isAnnual && plan.annualPrice !== "Custom" ? plan.annualPrice : plan.price}
                    </span>
                    <span className="text-sm text-white/35">/month</span>
                  </>
                )}
              </div>

              {isAnnual && plan.price !== "0" && plan.price !== "Custom" && (
                <p className="mb-2 text-xs text-[#2A8F7A]">
                  Billed annually (${parseInt(plan.annualPrice) * 12}/year)
                </p>
              )}

              <p className="mb-8 text-sm text-white/40">{plan.description}</p>

              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="h-4 w-4 shrink-0 text-[#2A8F7A]" />
                    <span className="text-sm text-white/60">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate("/signup")}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-[#5355D6] text-white shadow-lg shadow-[#5355D6]/20 hover:bg-[#5355D6]/90"
                    : "border border-white/10 bg-white/[0.03] text-white/80 hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Risk reversal */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-white/30">
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-[#2A8F7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            30-day money-back guarantee
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-[#2A8F7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
            Cancel anytime, no questions asked
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="h-4 w-4 text-[#2A8F7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            Free data export on cancellation
          </span>
        </div>
      </div>
    </section>
  );
}
