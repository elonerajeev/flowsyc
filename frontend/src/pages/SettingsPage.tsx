import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import { Edit3, Palette, Sparkles, SquareDashedMousePointer, User, Calendar, Mail } from "lucide-react";

import PageLoader from "@/components/shared/PageLoader";
import ErrorFallback from "@/components/shared/ErrorFallback";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, type BackgroundStyle, type ThemeColor, type UserRole } from "@/contexts/ThemeContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useThemePreviews } from "@/hooks/use-crm-data";
import { TEXT } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { findTeamMemberByEmail, useSharedTeamMembers } from "@/lib/team-roster";
import { crmService } from "@/services/crm";

const colorSwatches: { value: ThemeColor; hex: string }[] = [
  { value: "ocean", hex: "#2563EB" },
  { value: "midnight", hex: "#6366F1" },
  { value: "nebula", hex: "#7C3AED" },
  { value: "slate", hex: "#334155" },
];

const backgroundSwatches: {
  value: BackgroundStyle;
  label: string;
  subtitle: string;
  preview: CSSProperties;
}[] = [
  {
    value: "plain",
    label: "Plain",
    subtitle: "Clean paper surface",
    preview: {
      backgroundImage: "linear-gradient(180deg, hsl(var(--background)), hsl(var(--background)))",
      backgroundSize: "cover",
      backgroundRepeat: "no-repeat",
    },
  },
  {
    value: "ocean",
    label: "Ocean",
    subtitle: "Blue and cyan glow",
    preview: {
      backgroundImage:
        "radial-gradient(circle at 10% 12%, hsl(208 90% 60% / 0.32), transparent 28%), radial-gradient(circle at 88% 14%, hsl(193 92% 58% / 0.22), transparent 24%), linear-gradient(180deg, hsl(var(--background)), hsl(var(--background)))",
      backgroundSize: "cover, cover, cover",
      backgroundRepeat: "no-repeat, no-repeat, no-repeat",
    },
  },
  {
    value: "sunset",
    label: "Sunset",
    subtitle: "Warm orange and pink",
    preview: {
      backgroundImage:
        "radial-gradient(circle at 12% 12%, hsl(18 92% 62% / 0.34), transparent 28%), radial-gradient(circle at 86% 18%, hsl(330 82% 68% / 0.24), transparent 24%), linear-gradient(180deg, hsl(var(--background)), hsl(var(--background)))",
      backgroundSize: "cover, cover, cover",
      backgroundRepeat: "no-repeat, no-repeat, no-repeat",
    },
  },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

type ProfileKey =
  | "name"
  | "employeeId"
  | "department"
  | "team"
  | "designation"
  | "manager"
  | "workingHours"
  | "officeLocation"
  | "timeZone"
  | "joinedAt"
  | "location";

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const { canUseQuickCreate } = useWorkspace();
  const { mode, toggleMode, color, setColor, background, setBackground, role } = useTheme();
  const sharedTeamMembers = useSharedTeamMembers();
  const canEditOrgProfile = role === "admin" || role === "manager";
  const { data: themePreviews, isLoading, error: themeError, refetch } = useThemePreviews();
  const currentBackground = backgroundSwatches.find((swatch) => swatch.value === background) ?? backgroundSwatches[0];
  const currentTheme = themePreviews?.[color];
  const liveEmployeeRecord = findTeamMemberByEmail(sharedTeamMembers, user?.email);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);

  // Only fetch Google status for admin/manager
  useEffect(() => {
    if (role !== "admin" && role !== "manager") return;
    crmService.getGoogleCalendarStatus()
      .then(({ connected }) => setGoogleConnected(connected))
      .catch(() => setGoogleConnected(false));
  }, [role]);

  // Handle redirect back from Google OAuth
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleParam = params.get("google");
    if (googleParam === "connected") {
      setGoogleConnected(true);
      window.history.replaceState({}, "", window.location.pathname);
    } else if (googleParam === "error") {
      setGoogleConnected(false);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);
  const [profileDraft, setProfileDraft] = useState<Record<ProfileKey, string>>({
    name: user?.name ?? "",
    employeeId: user?.employeeId ?? "EMP-0000",
    department: user?.department ?? "Operations",
    team: user?.team ?? "Platform Ops",
    designation: user?.designation ?? "Workspace Operator",
    manager: user?.manager ?? "Team Lead",
    workingHours: user?.workingHours ?? "09:00 - 18:00",
    officeLocation: user?.officeLocation ?? "HQ - Floor 2",
    timeZone: user?.timeZone ?? "Asia/Calcutta",
    joinedAt: user?.joinedAt ?? "2024-01-01",
    location: user?.location ?? "San Francisco, CA",
  });

  useEffect(() => {
    setProfileDraft({
      name: user?.name ?? "",
      employeeId: user?.employeeId ?? "EMP-0000",
      department: user?.department ?? "Operations",
      team: user?.team ?? "Platform Ops",
      designation: user?.designation ?? "Workspace Operator",
      manager: user?.manager ?? "Team Lead",
      workingHours: user?.workingHours ?? "09:00 - 18:00",
      officeLocation: user?.officeLocation ?? "HQ - Floor 2",
      timeZone: user?.timeZone ?? "Asia/Calcutta",
      joinedAt: user?.joinedAt ?? "2024-01-01",
      location: user?.location ?? "San Francisco, CA",
    });
  }, [user]);

  const connectGoogleCalendar = async () => {
    setConnectingCalendar(true);
    try {
      const { authUrl } = await crmService.connectGoogleCalendar();
      window.location.href = authUrl;
    } catch (err) {
      console.error("Failed to connect Google Calendar:", err);
      setConnectingCalendar(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    setConnectingCalendar(true);
    try {
      await crmService.disconnectGoogleCalendar();
      setGoogleConnected(false);
    } catch (err) {
      console.error("Failed to disconnect Google Calendar:", err);
    } finally {
      setConnectingCalendar(false);
    }
  };

  const handleProfileSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile(
        canEditOrgProfile
          ? {
              name: profileDraft.name,
              department: profileDraft.department,
              team: profileDraft.team,
              designation: profileDraft.designation,
              manager: profileDraft.manager,
              workingHours: profileDraft.workingHours,
              officeLocation: profileDraft.officeLocation,
              timeZone: profileDraft.timeZone,
              location: profileDraft.location,
            }
          : {
              name: profileDraft.name,
              timeZone: profileDraft.timeZone,
              location: profileDraft.location,
            },
      );
      setIsProfileEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const profileSummary = useMemo(
    () => [
      { label: "Login status", value: user ? "Signed in" : "Guest session" },
      { label: "Quick create", value: canUseQuickCreate ? "Enabled" : "Disabled" },
      { label: "Theme palette", value: currentTheme?.label ?? "Theme" },
      { label: "Backdrop", value: currentBackground.label },
      {
        label: canEditOrgProfile ? "Employment status" : "Access level",
        value: canEditOrgProfile
          ? liveEmployeeRecord?.terminatedAt
            ? "Terminated"
            : liveEmployeeRecord?.suspendedAt
              ? "Suspended"
              : liveEmployeeRecord?.status
                ? liveEmployeeRecord.status.charAt(0).toUpperCase() + liveEmployeeRecord.status.slice(1)
                : "Active"
          : role.charAt(0).toUpperCase() + role.slice(1),
      },
    ],
    [canEditOrgProfile, canUseQuickCreate, currentBackground.label, currentTheme?.label, liveEmployeeRecord, role, user],
  );

  const profileSections: Array<{
    title: string;
    description: string;
    fields: Array<{ label: string; key: ProfileKey }>;
  }> = [
    {
      title: "Identity",
      description: "Core employee details.",
      fields: [
        { label: "Employee ID", key: "employeeId" },
        { label: "Department", key: "department" },
        { label: "Team", key: "team" },
        { label: "Designation", key: "designation" },
      ],
    },
    {
      title: "Schedule",
      description: "Hours and time zone.",
      fields: [
        { label: "Working hours", key: "workingHours" },
        { label: "Time zone", key: "timeZone" },
        { label: "Joined", key: "joinedAt" },
        { label: "Work setup", key: "location" },
      ],
    },
    {
      title: "Location",
      description: "Office and reporting details.",
      fields: [
        { label: "Office location", key: "officeLocation" },
        { label: "Manager", key: "manager" },
      ],
    },
  ];

  if (isLoading || !themePreviews) {
    if (themeError) {
      return (
        <ErrorFallback
          title="Theme settings failed to load"
          error={themeError}
          description="We could not load theme previews and background presets. Retry to continue."
          onRetry={() => refetch()}
          retryLabel="Retry settings"
        />
      );
    }
    return <PageLoader />;
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.section variants={item} className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
        <div className="space-y-3">
          <div className={cn("inline-flex items-center gap-2 rounded-full border border-border/70 bg-secondary/45 px-3 py-1 font-medium text-muted-foreground", TEXT.eyebrow)}>
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
        {/* ── Profile ── */}
        <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <User className="h-5 w-5" />
              </div>
              <p className="font-display text-xl font-semibold text-foreground">Profile</p>
            </div>
            <button
              type="button"
              onClick={() => isProfileEditing ? handleProfileSave() : setIsProfileEditing(true)}
              disabled={isSaving}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                isProfileEditing ? "border-primary bg-primary text-primary-foreground" : "border-border/70 bg-secondary/30 text-muted-foreground hover:text-foreground",
              )}
            >
              <Edit3 className="h-3.5 w-3.5" />
              {isSaving ? "Saving..." : isProfileEditing ? "Save" : "Edit"}
            </button>
          </div>

          {/* Avatar + name */}
          <div className="mb-5 flex items-center gap-4 rounded-2xl border border-border/70 bg-secondary/20 p-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-accent to-info font-display text-xl font-bold text-primary-foreground shadow-lg">
              {(user?.name ?? "JD").split(" ").map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-display text-lg font-semibold text-foreground truncate">{user?.name ?? "—"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email ?? "—"}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-primary">{role}</span>
                <span className="rounded-full border border-border/60 bg-secondary/30 px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground">{mode} mode</span>
                {canEditOrgProfile && liveEmployeeRecord && (
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase",
                    liveEmployeeRecord.terminatedAt ? "border-destructive/25 bg-destructive/10 text-destructive" :
                    liveEmployeeRecord.suspendedAt ? "border-warning/25 bg-warning/10 text-warning" :
                    "border-success/25 bg-success/10 text-success"
                  )}>
                    {liveEmployeeRecord.terminatedAt ? "Terminated" : liveEmployeeRecord.suspendedAt ? "Suspended" : "Active"}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* All profile fields in one clean grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "Name", key: "name" as ProfileKey },
              ...(canEditOrgProfile ? [
                { label: "Employee ID", key: "employeeId" as ProfileKey },
                { label: "Department", key: "department" as ProfileKey },
                { label: "Team", key: "team" as ProfileKey },
                { label: "Designation", key: "designation" as ProfileKey },
                { label: "Manager", key: "manager" as ProfileKey },
                { label: "Office", key: "officeLocation" as ProfileKey },
                { label: "Working Hours", key: "workingHours" as ProfileKey },
              ] : []),
              { label: "Timezone", key: "timeZone" as ProfileKey },
              { label: "Location", key: "location" as ProfileKey },
              ...(canEditOrgProfile ? [{ label: "Joined", key: "joinedAt" as ProfileKey }] : []),
            ].map((field) => (
              <div key={field.key}>
                <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{field.label}</p>
                <input
                  value={profileDraft[field.key]}
                  onChange={(e) => setProfileDraft(c => ({ ...c, [field.key]: e.target.value }))}
                  readOnly={!isProfileEditing}
                  className={cn(
                    "h-9 w-full rounded-xl border px-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary/20",
                    isProfileEditing ? "border-border/70 bg-background/55" : "border-border/50 bg-secondary/20 text-muted-foreground",
                  )}
                />
              </div>
            ))}
          </div>

          {/* Employment notice - only if flagged */}
          {canEditOrgProfile && liveEmployeeRecord && (liveEmployeeRecord.suspendedAt || liveEmployeeRecord.terminatedAt || (liveEmployeeRecord.warningCount ?? 0) > 0) && (
            <div className={cn("mt-4 rounded-2xl border p-4",
              liveEmployeeRecord.terminatedAt ? "border-destructive/20 bg-destructive/5" : "border-warning/20 bg-warning/5"
            )}>
              <p className="text-xs font-semibold text-foreground">
                {liveEmployeeRecord.terminatedAt ? "⚠️ Employment terminated" : `⚠️ ${liveEmployeeRecord.warningCount ?? 0} warning(s) on record`}
              </p>
              {liveEmployeeRecord.separationNote && (
                <p className="mt-1 text-xs text-muted-foreground">{liveEmployeeRecord.separationNote}</p>
              )}
            </div>
          )}
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
                    <div
                      className="h-11 rounded-xl border border-white/20"
                      style={{
                        background:
                          swatch.value === "ocean"
                            ? "#EFF6FF"
                            : swatch.value === "midnight"
                              ? "#0F172A"
                              : swatch.value === "nebula"
                                ? "linear-gradient(135deg, #7C3AED, #EC4899)"
                                : "#F8FAFC",
                      }}
                    />
                    <div className="h-11 rounded-xl border border-white/20" style={{ background: swatch.hex }} />
                    <div
                      className="h-11 rounded-xl border border-white/20"
                      style={{
                        background:
                          swatch.value === "ocean"
                            ? "#60A5FA"
                            : swatch.value === "midnight"
                              ? "#94A3B8"
                              : swatch.value === "nebula"
                                ? "#EC4899"
                                : "#CBD5F5",
                      }}
                    />
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

          <div className="rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <SquareDashedMousePointer className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold text-foreground">Background</p>
                <p className="text-sm text-muted-foreground">Only three clear background presets, with the preview moved to Profile.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {backgroundSwatches.map((swatch) => (
                <button
                  key={swatch.value}
                  type="button"
                  onClick={() => setBackground(swatch.value)}
                  className={cn(
                    "group overflow-hidden rounded-[1.25rem] border p-3 text-left transition",
                    background === swatch.value ? "border-primary bg-primary/[0.05]" : "border-border/70 bg-secondary/20 hover:border-border",
                  )}
                >
                  <div className="h-24 rounded-[1rem] border border-white/10 shadow-inner transition-transform duration-300 group-hover:scale-[1.01]" style={swatch.preview} />
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{swatch.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{swatch.subtitle}</p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]", background === swatch.value ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
                      {background === swatch.value ? "Active" : "Set"}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-[1.25rem] border border-border/70 bg-secondary/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                Visual language
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Keep the background clean, readable, and clearly different without overpowering the workspace.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/90 p-6 shadow-card">
            <div className="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div>
                <p className={cn("text-muted-foreground", TEXT.eyebrow)}>Live preview</p>
                <p className="mt-1 font-display text-xl font-semibold text-foreground">Theme and backdrop together</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Preview</span>
            </div>

            <div className="mt-4 grid gap-3">
              <div
                className="relative overflow-hidden rounded-[1.15rem] border border-white/10 shadow-inner"
                style={currentBackground.preview}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_36%)]" />
                <div className="relative flex min-h-[200px] flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-full bg-background/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground backdrop-blur">
                      {currentTheme?.label ?? "Theme"}
                    </div>
                    <div className="rounded-full bg-card/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground backdrop-blur">
                      {canEditOrgProfile ? profileDraft.officeLocation : profileDraft.location}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="h-2 w-2/3 rounded-full bg-background/65" />
                    <div className="h-2 w-5/6 rounded-full bg-background/45" />
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-12 rounded-xl bg-background/55 backdrop-blur" />
                      <div className="h-12 rounded-xl bg-background/65 backdrop-blur" />
                      <div className="h-12 rounded-xl bg-background/45 backdrop-blur" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: "Theme", value: currentTheme?.label ?? "Theme" },
                  { label: "Background", value: currentBackground.label },
                  { label: canEditOrgProfile ? "Office" : "Location", value: canEditOrgProfile ? profileDraft.officeLocation : profileDraft.location },
                  { label: "Mode", value: mode },
                  { label: "Role", value: role },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border/70 bg-secondary/20 p-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>
      </motion.section>
    </motion.div>
  );
}
