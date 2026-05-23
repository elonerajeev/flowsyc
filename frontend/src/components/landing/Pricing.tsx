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
    <section id="pricing" className="bg-background px-4 py-16 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block rounded-full border-border bg-muted/50 px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Pricing
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Simple,{" "}
            <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
              Transparent
            </span>{" "}
            Pricing
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:text-lg">
            Start free, scale as you grow. No hidden fees, no surprises.
          </p>

          {/* Annual/Monthly Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm transition-all duration-300 ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`relative h-7 w-12 rounded-full transition-all duration-300 ${isAnnual ? "bg-[#5355D6]" : "bg-muted-foreground/20"}`}
              aria-label="Toggle annual pricing"
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full bg-primary-foreground shadow transition-all duration-300 ease-out"
                style={{ left: isAnnual ? "22px" : "2px" }}
              />
            </button>
            <span className={`text-sm transition-all duration-300 ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}>
              Annual
            </span>
            <span
              className={`rounded-full bg-[#2A8F7A]/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#2A8F7A] transition-all duration-300 ${
                isAnnual ? "scale-100 opacity-100" : "scale-75 opacity-0 pointer-events-none"
              }`}
            >
              Save 20%
            </span>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`group relative overflow-hidden rounded-2xl border p-6 sm:p-8 transition-all duration-300 ${
                plan.popular
                  ? "border-[#5355D6]/30 bg-[#5355D6]/5"
                  : "border-border bg-muted/30 hover:border-border"
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

              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {plan.name}
              </p>

              <div className="mb-4 flex items-baseline gap-1">
                {plan.price === "Custom" ? (
                  <span className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">Custom</span>
                ) : (
                  <>
                    <span className="inline-block text-4xl sm:text-5xl font-bold tracking-tight text-foreground min-w-[4rem]">
                      <span
                        key={isAnnual ? "annual" : "monthly"}
                        className="inline-block animate-in fade-in slide-in-from-bottom-1 duration-300"
                      >
                        ${isAnnual ? plan.annualPrice : plan.price}
                      </span>
                    </span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </>
                )}
              </div>

              <div className="relative h-5">
                <p
                  key={isAnnual ? "show-billed" : "hide-billed"}
                  className={`text-xs text-[#2A8F7A] transition-all duration-300 ${
                    isAnnual && plan.price !== "0" && plan.price !== "Custom"
                      ? "translate-y-0 opacity-100"
                      : "translate-y-1 opacity-0 pointer-events-none"
                  }`}
                >
                  Billed annually (${isAnnual && plan.annualPrice !== "Custom" ? parseInt(plan.annualPrice) * 12 : 0}/year)
                </p>
              </div>

              <p className="mb-8 text-sm text-muted-foreground">{plan.description}</p>

              <ul className="mb-8 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 sm:gap-3">
                    <Check className="h-4 w-4 shrink-0 text-[#2A8F7A]" />
                    <span className="text-sm text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => navigate("/signup")}
                className={`flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-all ${
                  plan.popular
                    ? "bg-[#5355D6] text-white shadow-lg shadow-[#5355D6]/20 hover:bg-[#5355D6]/90"
                    : "border-border bg-muted/50 text-foreground/80 hover:border-border hover:bg-muted/80 hover:text-foreground"
                }`}
              >
                {plan.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Risk reversal */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
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
