import { motion } from "framer-motion";
import { Palette, Shield, User, Workflow } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import { useTheme, type ThemeColor, type UserRole } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { useThemePreviews } from "@/hooks/use-crm-data";

const colorSwatches: { value: ThemeColor; hex: string }[] = [
  { value: "ocean", hex: "#2563EB" },
  { value: "midnight", hex: "#6366F1" },
  { value: "nebula", hex: "#7C3AED" },
  { value: "slate", hex: "#334155" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function SettingsPage() {
  const { mode, toggleMode, color, setColor, role, setRole } = useTheme();
  const { data: themePreviews, isLoading } = useThemePreviews();

  if (isLoading || !themePreviews) {
    return <PageLoader />;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/45 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <Palette className="h-3.5 w-3.5 text-primary" />
            Settings
          </div>
          <h1 className="font-display text-3xl font-semibold text-foreground">Workspace settings</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Theme, role preview, and integration-ready configuration are grouped here with a cleaner hierarchy.
          </p>
        </div>
      </motion.section>

      <motion.section variants={item} className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">Profile</p>
              <p className="text-sm text-muted-foreground">Primary operator information.</p>
            </div>
          </div>

          <div className="mb-6 flex items-center gap-4 rounded-[1.5rem] border border-border/70 bg-secondary/25 p-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] bg-secondary/55 text-2xl font-display font-semibold text-foreground">
              JD
            </div>
            <div>
              <p className="font-display text-xl font-semibold text-foreground">John Doe</p>
              <p className="text-sm text-muted-foreground">john@crmpro.com</p>
              <p className="mt-1 text-xs font-semibold text-primary">{role}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              { label: "Full Name", value: "John Doe" },
              { label: "Email", value: "john@crmpro.com" },
              { label: "Phone", value: "+1 (555) 123-4567" },
              { label: "Location", value: "San Francisco, CA" },
            ].map((field) => (
              <label key={field.label} className="space-y-2">
                <span className="text-sm font-medium text-foreground">{field.label}</span>
                <input
                  defaultValue={field.value}
                  className="h-11 w-full rounded-2xl border border-border/70 bg-background/55 px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-foreground">Theme</p>
                <p className="text-sm text-muted-foreground">Choose a compact, contrast-safe preset.</p>
              </div>
            </div>

            <div className="mb-5">
              <p className="mb-3 text-sm font-medium text-foreground">Mode</p>
              <div className="inline-flex rounded-full border border-border/70 bg-secondary/35 p-1">
                {(["light", "dark"] as const).map((nextMode) => (
                  <button
                    key={nextMode}
                    type="button"
                    onClick={() => {
                      if (nextMode !== mode) toggleMode();
                    }}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-semibold transition",
                      nextMode === mode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {nextMode === "light" ? "Light" : "Dark"}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              {colorSwatches.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  onClick={() => setColor(swatch.value)}
                  className={cn(
                    "grid gap-3 rounded-[1.25rem] border p-3 text-left transition md:grid-cols-[72px_1fr_auto]",
                    color === swatch.value ? "border-primary bg-primary/[0.05]" : "border-border/70 bg-secondary/20 hover:border-border",
                  )}
                >
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="h-11 rounded-xl border border-white/20" style={{ background: swatch.value === "ocean" ? "#EFF6FF" : swatch.value === "midnight" ? "#0F172A" : swatch.value === "nebula" ? "linear-gradient(135deg, #7C3AED, #EC4899)" : "#F8FAFC" }} />
                    <div className="h-11 rounded-xl border border-white/20" style={{ background: swatch.hex }} />
                    <div className="h-11 rounded-xl border border-white/20" style={{ background: swatch.value === "ocean" ? "#60A5FA" : swatch.value === "midnight" ? "#94A3B8" : swatch.value === "nebula" ? "#EC4899" : "#CBD5F5" }} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{themePreviews[swatch.value].label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{themePreviews[swatch.value].subtitle}</p>
                  </div>
                  <div className="flex items-start justify-end">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", color === swatch.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                      {color === swatch.value ? "Active" : "Set"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-warning/12 text-warning">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">Role Simulation</p>
                  <p className="text-xs text-muted-foreground">View-based access preview.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(["admin", "manager", "employee", "client"] as UserRole[]).map((candidate) => (
                  <button
                    key={candidate}
                    type="button"
                    onClick={() => setRole(candidate)}
                    className={cn(
                      "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                      role === candidate ? "bg-primary text-primary-foreground" : "border border-border/70 bg-secondary/28 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {candidate}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-5 shadow-card">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-success/12 text-success">
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-lg font-semibold text-foreground">Integration Readiness</p>
                  <p className="text-xs text-muted-foreground">Prepared for backend layers.</p>
                </div>
              </div>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>Theming uses semantic tokens, so backend-driven workspace preferences can be added later.</p>
                <p>Role state is centralized, which makes auth and permission sync easier to implement.</p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
