import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "How is Flowsyc different from Salesforce or HubSpot?",
    answer: "Salesforce and HubSpot are great at CRM — but that's all they do. Flowsyc includes CRM, project management, HR & payroll, invoicing, workflow automation, and analytics in one platform. Most teams replace 4–5 separate tools with Flowsyc, saving $200+/month per user and eliminating context switching.",
  },
  {
    question: "Can I migrate from HubSpot, Salesforce, or another CRM?",
    answer: "Yes. Flowsyc supports CSV imports from all major CRM platforms including Salesforce, HubSpot, Pipedrive, Zoho, and more. For Pro and Enterprise plans, our onboarding team handles the full migration for you — including contacts, deals, tasks, and custom fields. Most migrations complete within 24 hours.",
  },
  {
    question: "Do I need to install anything or is it cloud-based?",
    answer: "Flowsyc is 100% cloud-based. Just open your browser, sign up, and you're ready. No downloads, no server setup, no IT department needed. It works on Chrome, Firefox, Safari, and Edge. A native mobile app for iOS and Android is in development for Q2 2026.",
  },
  {
    question: "What happens after my 14-day free trial ends?",
    answer: "You can keep using Flowsyc on our Free plan forever — no credit card required. The Free plan includes core CRM features for up to 3 users. If you want more power (advanced pipeline, HR tools, automation, unlimited contacts), upgrade to Pro ($29/month) anytime. You won't lose any data if you downgrade.",
  },
  {
    question: "Can I use Flowsyc with my existing tools (Gmail, Slack, etc.)?",
    answer: "Absolutely. Flowsyc integrates with Gmail, Google Calendar, Slack, Stripe, and GitHub out of the box. We also offer a REST API and webhook support so you can connect any custom tool. Pro and Enterprise plans include unlimited API access.",
  },
  {
    question: "What kind of support do you offer?",
    answer: "Free plan users get community support via our Discord and documentation. Pro users get priority email support with <4 hour response times. Enterprise customers get a dedicated account manager, 24/7 premium support, custom SLAs, and onboarding assistance.",
  },
  {
    question: "Is my data secure and backed up?",
    answer: "Yes. We use AES-256 encryption at rest, TLS 1.3 in transit, and automated daily backups. The platform includes audit logs, role-based access control, and SSO (SAML 2.0) for Enterprise. Our infrastructure runs on AWS with 99.9% uptime SLA.",
  },
  {
    question: "How long does it take to set up for my team?",
    answer: "Most teams are productive within a day. Sign up, invite your team, and import your contacts — everything works immediately. For larger organizations, our Pro and Enterprise onboarding includes guided setup, custom workflow configuration, and team training sessions.",
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="bg-[#030308] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            FAQ
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <FAQItem key={i} question={faq.question} answer={faq.answer} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all duration-300 hover:border-white/10">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span className="text-sm font-semibold text-white/80">{question}</span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] transition-all">
          {isOpen ? (
            <Minus className="h-3.5 w-3.5 text-white/40" />
          ) : (
            <Plus className="h-3.5 w-3.5 text-white/40" />
          )}
        </span>
      </button>
      {isOpen && (
        <p className="px-6 pb-5 text-sm leading-relaxed text-white/40">{answer}</p>
      )}
    </div>
  );
}
