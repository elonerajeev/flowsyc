import { useState, useEffect } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const footerLinks = {
  Product: [
    { label: "Overview", id: "product", scroll: true },
    { label: "Features", id: "features", scroll: true },
    { label: "Pricing", id: "pricing", scroll: true },
    { label: "Integrations", id: "integrations", scroll: true },
    { label: "Templates", id: "templates", scroll: true },
    { label: "FAQ", id: "faq", scroll: true },
  ],
  Solutions: [
    { label: "Sales CRM", id: "features", scroll: true },
    { label: "Project Mgmt", id: "features", scroll: true },
    { label: "HR & Payroll", id: "features", scroll: true },
    { label: "Finance", id: "features", scroll: true },
    { label: "Analytics", id: "features", scroll: true },
    { label: "Automation", id: "features", scroll: true },
  ],
  Company: [
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
    { label: "GitHub", href: "https://github.com/elonerajeev/flowsyc", external: true },
    { label: "Live App", href: "https://flowsyc-svuj.vercel.app", external: true },
  ],
  Support: [
    { label: "Get Started", path: "/signup" },
    { label: "Log In", path: "/login" },
    { label: "Privacy Policy", path: "#" },
    { label: "Terms of Service", path: "#" },
  ],
};

const socials = [
  {
    label: "Twitter",
    href: "https://twitter.com/elonerajeev",
    icon: (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>),
    color: "hover:text-white hover:bg-white/10",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com/in/elonerajeev",
    icon: (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>),
    color: "hover:text-[#0A66C2] hover:bg-[#0A66C2]/10",
  },
  {
    label: "GitHub",
    href: "https://github.com/elonerajeev/flowsyc",
    icon: (<svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 2.27-.322 1.265 0 2.27.322 2.27.322.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>),
    color: "hover:text-white hover:bg-white/10",
  },
];

export default function LandingFooter() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || subscribing) return;
    setSubscribing(true);
    setTimeout(() => {
      setSubscribed(true);
      setEmail("");
      setSubscribing(false);
    }, 1200);
  };

  const handleFooterClick = (link: (typeof footerLinks)[keyof typeof footerLinks][0]) => {
    if ("external" in link && link.external) {
      window.open(link.href, "_blank", "noopener,noreferrer");
    } else if ("path" in link) {
      navigate(link.path);
    } else if ("scroll" in link && link.scroll) {
      const el = document.getElementById(link.id);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <footer className="bg-[#030308]">
      {/* Newsletter Section */}
      <div className="border-b border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#5355D6]/20 bg-[#5355D6]/10">
              <Mail className="h-5 w-5 text-[#5355D6]" />
            </div>
            <h3 className="text-2xl font-bold text-white sm:text-3xl">
              Stay Updated with Flowsyc
            </h3>
            <p className="mt-3 text-sm text-white/40 sm:text-base">
              Get product updates, tips, and industry insights delivered to your inbox. No spam, ever.
            </p>
            {subscribed ? (
              <div className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#2A8F7A]/30 bg-[#2A8F7A]/10 px-6 py-3 text-sm font-medium text-[#2A8F7A]">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                You're subscribed! Check your inbox for a welcome email.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm text-white placeholder:text-white/25 focus:border-[#5355D6]/50 focus:outline-none focus:ring-1 focus:ring-[#5355D6]/20 sm:max-w-xs"
                  required
                  disabled={subscribing}
                />
                <button
                  type="submit"
                  disabled={subscribing}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#5355D6] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[#5355D6]/20 transition-all hover:bg-[#5355D6]/90 disabled:opacity-60"
                >
                  {subscribing ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      Subscribe
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}
            {!subscribed && (
              <p className="mt-3 text-[10px] text-white/20">
                By subscribing, you agree to our Privacy Policy. Unsubscribe anytime.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-6">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5"
            >
              <img src="/logo.svg" alt="Flowsyc" className="h-8 w-8" />
              <span className="text-xl font-bold tracking-tight text-white">Flowsyc</span>
            </button>
            <p className="mt-4 text-sm leading-relaxed text-white/35">
              Enterprise CRM platform for modern businesses. Manage clients, leads, deals, projects, tasks, invoices, HR & analytics — all in one place.
            </p>
            {/* Social Links */}
            <div className="mt-6 flex gap-2">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={`rounded-lg p-2.5 text-white/25 transition-all ${social.color}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    {"external" in link && link.external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-sm text-white/35 transition-colors hover:text-white/70">
                        {link.label} ↗
                      </a>
                    ) : (
                      <button onClick={() => handleFooterClick(link)} className="text-sm text-white/35 transition-colors hover:text-white/70">
                        {link.label}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/5">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-xs text-white/25">
              © 2026 Flowsyc. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-xs text-white/25 transition-colors hover:text-white/50">
                Privacy Policy
              </a>
              <a href="#" className="text-xs text-white/25 transition-colors hover:text-white/50">
                Terms of Service
              </a>
              <a href="#" className="text-xs text-white/25 transition-colors hover:text-white/50">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
