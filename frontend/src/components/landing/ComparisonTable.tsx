import { Check, X } from "lucide-react";

const rows = [
  { feature: "CRM & Sales Pipeline", flowsyc: true, salesforce: true, hubspot: true, asana: false, bamboohr: false },
  { feature: "Project & Task Management", flowsyc: true, salesforce: false, hubspot: false, asana: true, bamboohr: false },
  { feature: "HR & Payroll", flowsyc: true, salesforce: false, hubspot: false, asana: false, bamboohr: true },
  { feature: "Invoicing & Finance", flowsyc: true, salesforce: false, hubspot: "partial", asana: false, bamboohr: false },
  { feature: "Workflow Automation", flowsyc: true, salesforce: true, hubspot: true, asana: "partial", bamboohr: false },
  { feature: "Real-Time Notifications", flowsyc: true, salesforce: true, hubspot: true, asana: true, bamboohr: false },
  { feature: "Analytics & Reports", flowsyc: true, salesforce: true, hubspot: true, asana: "partial", bamboohr: "partial" },
  { feature: "Role-Based Access", flowsyc: true, salesforce: true, hubspot: "partial", asana: "partial", bamboohr: true },
  { feature: "Audit Logs", flowsyc: true, salesforce: true, hubspot: false, asana: false, bamboohr: false },
  { feature: "All-in-One (no extra tools)", flowsyc: true, salesforce: false, hubspot: false, asana: false, bamboohr: false },
  { feature: "Free Plan", flowsyc: true, salesforce: false, hubspot: true, asana: true, bamboohr: false },
  { feature: "Starting Price", flowsyc: "$0", salesforce: "$25/u", hubspot: "$20/u", asana: "$10/u", bamboohr: "$6/u" },
];

const cols = [
  { key: "flowsyc", label: "Flowsyc", highlight: true },
  { key: "salesforce", label: "Salesforce" },
  { key: "hubspot", label: "HubSpot" },
  { key: "asana", label: "Asana" },
  { key: "bamboohr", label: "BambooHR" },
];

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-[#2A8F7A]" />;
  if (value === false) return <X className="mx-auto h-4 w-4 text-white/15" />;
  if (value === "partial") return <span className="text-[10px] text-[#F0A030]">Partial</span>;
  return <span className="text-xs font-semibold text-white/70">{value}</span>;
}

export default function ComparisonTable() {
  return (
    <section id="comparison" className="bg-[#0A0F1A] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-block rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Why Flowsyc
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            One platform vs{" "}
            <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
              five separate tools
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/35">
            Flowsyc replaces your entire SaaS stack. Compare what you get.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <p className="block px-4 pt-3 text-center text-[10px] text-white/25 sm:hidden">← Scroll to compare →</p>
          <div className="sm:hidden mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2 text-xs text-white/40">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12M8 12h12m-12 5h12M4 7h.01M4 12h.01M4 17h.01" />
            </svg>
            Scroll horizontally to see all columns
            <svg className="h-4 w-4 animate-pulse ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5M5 7l5 5m0 0l-5 5" />
            </svg>
          </div>
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-5 py-4 text-left text-xs font-semibold text-white/30">Feature</th>
                {cols.map((col) => (
                  <th key={col.key} className={`px-4 py-4 text-center text-xs font-semibold ${col.highlight ? "text-[#5355D6]" : "text-white/30"}`}>
                    {col.highlight && (
                      <div className="mb-1 inline-block rounded-full bg-[#5355D6]/10 px-2 py-0.5 text-[9px] text-[#5355D6]">★ Best</div>
                    )}
                    <div>{col.label}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.feature} className={`border-b border-white/[0.03] transition-colors hover:bg-white/[0.02] ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                  <td className="px-5 py-3.5 text-sm text-white/60">{row.feature}</td>
                  {cols.map((col) => (
                    <td key={col.key} className={`px-4 py-3.5 text-center ${col.highlight ? "bg-[#5355D6]/[0.04]" : ""}`}>
                      <Cell value={row[col.key as keyof typeof row] as boolean | string} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-center text-xs text-white/20">
          Pricing shown per user/month on entry-level paid plans. Flowsyc Free plan includes all core features.
        </p>
      </div>
    </section>
  );
}
