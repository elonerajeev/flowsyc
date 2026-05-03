import { ArrowUpRight } from "lucide-react";

const integrations = [
  {
    name: "Gmail",
    description: "Sync emails, track conversations, and manage your inbox directly from Flowsyc.",
    badge: "Active",
    badgeColor: "text-[#2A8F7A] bg-[#2A8F7A]/10",
    borderHover: "hover:border-[#EA4335]/20",
    glowColor: "rgba(234,67,53,0.08)",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7">
        <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335"/>
      </svg>
    ),
  },
  {
    name: "Google Calendar",
    description: "Schedule meetings, set reminders, and sync your calendar without leaving the platform.",
    badge: "Active",
    badgeColor: "text-[#4285F4] bg-[#4285F4]/10",
    borderHover: "hover:border-[#4285F4]/20",
    glowColor: "rgba(66,133,244,0.08)",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7">
        <path d="M18.316 5.684H24v12.632h-5.684z" fill="#4285F4"/>
        <path d="M5.684 24h12.632v-5.684H5.684z" fill="#34A853"/>
        <path d="M0 18.316v4.369C0 23.425.575 24 1.316 24h4.368v-5.684z" fill="#188038"/>
        <path d="M24 5.684V1.316C24 .575 23.425 0 22.684 0h-4.368v5.684z" fill="#1967D2"/>
        <path d="M18.316 0H1.316C.575 0 0 .575 0 1.316v17h5.684V5.684h12.632z" fill="#4285F4"/>
        <path d="M8.1 15.3c-.4-.27-.68-.66-.83-1.18l.93-.38c.09.34.24.6.46.79.22.19.48.28.79.28.32 0 .59-.1.81-.3.22-.2.33-.45.33-.75 0-.31-.12-.56-.35-.76-.23-.2-.52-.3-.87-.3h-.54v-.92h.48c.3 0 .55-.08.75-.25.2-.17.3-.4.3-.68 0-.26-.09-.46-.27-.62-.18-.16-.41-.24-.69-.24-.27 0-.49.08-.65.23-.16.15-.28.34-.34.57l-.92-.38c.1-.35.3-.66.6-.93.3-.27.69-.4 1.17-.4.35 0 .67.07.95.21.28.14.5.33.66.58.16.25.24.52.24.82 0 .31-.07.57-.22.8-.15.23-.34.4-.58.52v.05c.3.12.54.31.72.57.18.26.27.56.27.9 0 .35-.09.66-.26.93-.17.27-.41.48-.72.63-.31.15-.65.22-1.03.22-.47 0-.88-.13-1.23-.4zm5.47.4l-1.02-.69.46-.7c.16-.24.27-.5.33-.77H12v-.92h1.5v.5c0 .44-.1.86-.3 1.26-.2.4-.44.74-.73 1.02l-.9.3z" fill="white"/>
      </svg>
    ),
  },
  {
    name: "Slack",
    description: "Get real-time notifications and updates delivered to your team's Slack channels.",
    badge: "Active",
    badgeColor: "text-[#E01563] bg-[#E01563]/10",
    borderHover: "hover:border-[#E01563]/20",
    glowColor: "rgba(224,21,99,0.08)",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.123 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.123a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" fill="#E01563"/>
      </svg>
    ),
  },
  {
    name: "Stripe",
    description: "Accept payments, manage subscriptions, and track revenue directly in Flowsyc.",
    badge: "Active",
    badgeColor: "text-[#635BFF] bg-[#635BFF]/10",
    borderHover: "hover:border-[#635BFF]/20",
    glowColor: "rgba(99,91,255,0.08)",
    logo: (
      <svg viewBox="0 0 60 25" className="h-6 w-auto" fill="#635BFF">
        <path d="M5 10.2c0-.7.6-1 1.5-1 1.3 0 3 .4 4.3 1.1V6.7c-1.5-.6-2.9-.8-4.3-.8C3.5 5.9 1 7.7 1 10.4c0 4.2 5.8 3.5 5.8 5.3 0 .8-.7 1.1-1.7 1.1-1.5 0-3.4-.6-4.9-1.4v3.7c1.7.7 3.2 1 4.8 1 3.4 0 5.5-1.7 5.5-4.5C10.5 11 5 11.8 5 10.2zM15.2 1.4h-4v19.4h4V1.4zM23.4 1.4h-4v19.4h4V1.4zM32.3 1.4h-4v19.4h4v-1.2c1.2 1 2.6 1.5 4.1 1.5 3.2 0 5.4-2.6 5.4-6.7 0-4.1-2.2-6.7-5.4-6.7-1.5 0-2.9.5-4.1 1.5V1.4zm-.1 13.2c0-2.2 1.4-3.8 3.2-3.8 1.8 0 3.2 1.6 3.2 3.8 0 2.2-1.4 3.8-3.2 3.8-1.8 0-3.2-1.6-3.2-3.8zM48.5 1.4h-4v19.4h4V1.4z"/>
      </svg>
    ),
  },
  {
    name: "GitHub",
    description: "Link commits, PRs, and issues to projects and tasks for full dev-to-delivery visibility.",
    badge: "Active",
    badgeColor: "text-white/40 bg-white/5",
    borderHover: "hover:border-white/10",
    glowColor: "rgba(255,255,255,0.04)",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="white">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
      </svg>
    ),
  },
  {
    name: "REST API",
    description: "Full REST API access for custom integrations, data sync, and automation workflows.",
    badge: "Active",
    badgeColor: "text-[#F0A030] bg-[#F0A030]/10",
    borderHover: "hover:border-[#F0A030]/20",
    glowColor: "rgba(240,160,48,0.08)",
    logo: (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#F0A030">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
  },
];

export default function Integrations() {
  return (
    <section id="integrations" className="bg-[#030308] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-14 text-center">
          <div className="mb-4 inline-block rounded-full border border-white/10 bg-white/[0.03] px-5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Integrations
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Connect Your{" "}
            <span className="bg-gradient-to-r from-[#5355D6] to-[#7B7FFF] bg-clip-text text-transparent">
              Existing Tools
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/35 sm:text-lg">
            Flowsyc plugs into the tools your team already uses — no workflow disruption, just more power.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((item) => (
            <div
              key={item.name}
              className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 transition-all duration-300 ${item.borderHover}`}
              style={{ "--glow": item.glowColor } as React.CSSProperties}
            >
              {/* hover glow */}
              <div
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 rounded-2xl"
                style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${item.glowColor}, transparent)` }}
              />

              <div className="relative flex items-start justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-all duration-300 group-hover:scale-110 group-hover:border-white/15">
                  {item.logo}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${item.badgeColor}`}>
                  {item.badge}
                </span>
              </div>

              <div className="relative mt-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-white/90">{item.name}</h3>
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/20 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/50" />
                </div>
                <p className="mt-2 text-sm leading-relaxed text-white/35">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="mt-10 text-center text-xs text-white/25">
          More integrations coming soon — Zapier, HubSpot, Salesforce, Jira, and more.
        </p>
      </div>
    </section>
  );
}
