import React, { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { isRemoteApiEnabled } from "@/lib/api-client";
import { readStoredJSON, readStoredString, removeStoredValue, writeStoredString } from "@/lib/preferences";
import { crmService } from "@/services/crm";

export type ThemeColor = "ocean" | "midnight" | "nebula" | "slate";
export type ThemeMode = "light" | "dark";
export type UserRole = "admin" | "manager" | "employee" | "client";
export type BackgroundStyle = "plain" | "ocean" | "sunset" | "forest" | "iris" | "grid";

interface ThemeContextType {
  mode: ThemeMode;
  color: ThemeColor;
  background: BackgroundStyle;
  role: UserRole;
  toggleMode: () => void;
  setColor: (c: ThemeColor) => void;
  setBackground: (style: BackgroundStyle) => void;
  setRole: (r: UserRole) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark", color: "ocean", background: "ocean", role: "admin",
  toggleMode: () => {}, setColor: () => {}, setBackground: () => {}, setRole: () => {},
});

export const useTheme = () => useContext(ThemeContext);

type ThemeTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  info: string;
  infoForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebarBg: string;
  sidebarFg: string;
  sidebarHover: string;
  sidebarActive: string;
  sidebarActiveForeground: string;
  sidebarMuted: string;
  sidebarBorder: string;
  sidebarPrimary: string;
  sidebarPrimaryForeground: string;
  sidebarAccent: string;
  sidebarAccentForeground: string;
  sidebarRing: string;
};

const themeTokens: Record<ThemeColor, { light: ThemeTokens; dark: ThemeTokens }> = {
  ocean: {
    light: {
      background: "214 100% 96%",
      foreground: "223 47% 12%",
      card: "0 0% 100%",
      cardForeground: "223 47% 12%",
      popover: "0 0% 100%",
      popoverForeground: "223 47% 12%",
      primary: "221 83% 53%",
      primaryForeground: "0 0% 100%",
      secondary: "214 32% 94%",
      secondaryForeground: "223 40% 18%",
      muted: "214 26% 92%",
      mutedForeground: "216 16% 40%",
      accent: "213 95% 70%",
      accentForeground: "223 47% 12%",
      destructive: "0 72% 51%",
      destructiveForeground: "0 0% 100%",
      success: "173 58% 39%",
      successForeground: "0 0% 100%",
      warning: "38 92% 50%",
      warningForeground: "223 47% 12%",
      info: "210 100% 89%",
      infoForeground: "223 47% 12%",
      border: "214 30% 86%",
      input: "214 30% 86%",
      ring: "221 83% 53%",
      sidebarBg: "222 48% 10%",
      sidebarFg: "214 28% 84%",
      sidebarHover: "223 35% 16%",
      sidebarActive: "221 83% 53%",
      sidebarActiveForeground: "0 0% 100%",
      sidebarMuted: "214 16% 58%",
      sidebarBorder: "223 26% 18%",
      sidebarPrimary: "221 83% 53%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "223 35% 16%",
      sidebarAccentForeground: "214 28% 84%",
      sidebarRing: "221 83% 53%",
    },
    dark: {
      background: "222 48% 8%",
      foreground: "214 32% 96%",
      card: "221 36% 11%",
      cardForeground: "214 32% 96%",
      popover: "221 36% 10%",
      popoverForeground: "214 32% 96%",
      primary: "221 83% 61%",
      primaryForeground: "0 0% 100%",
      secondary: "220 36% 18%",
      secondaryForeground: "214 28% 86%",
      muted: "220 24% 14%",
      mutedForeground: "214 18% 67%",
      accent: "213 95% 70%",
      accentForeground: "223 47% 12%",
      destructive: "0 65% 48%",
      destructiveForeground: "0 0% 100%",
      success: "173 58% 39%",
      successForeground: "0 0% 100%",
      warning: "38 88% 52%",
      warningForeground: "223 47% 12%",
      info: "210 100% 89%",
      infoForeground: "223 47% 12%",
      border: "220 20% 20%",
      input: "220 20% 20%",
      ring: "221 83% 61%",
      sidebarBg: "222 52% 6%",
      sidebarFg: "214 30% 84%",
      sidebarHover: "223 34% 14%",
      sidebarActive: "221 83% 61%",
      sidebarActiveForeground: "0 0% 100%",
      sidebarMuted: "214 16% 58%",
      sidebarBorder: "220 22% 14%",
      sidebarPrimary: "221 83% 61%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "223 34% 14%",
      sidebarAccentForeground: "214 30% 84%",
      sidebarRing: "221 83% 61%",
    },
  },
  midnight: {
    light: {
      background: "215 28% 97%",
      foreground: "222 47% 12%",
      card: "0 0% 100%",
      cardForeground: "222 47% 12%",
      popover: "0 0% 100%",
      popoverForeground: "222 47% 12%",
      primary: "226 88% 58%",
      primaryForeground: "0 0% 100%",
      secondary: "215 24% 94%",
      secondaryForeground: "222 40% 18%",
      muted: "215 20% 92%",
      mutedForeground: "217 16% 40%",
      accent: "236 87% 67%",
      accentForeground: "0 0% 100%",
      destructive: "0 72% 51%",
      destructiveForeground: "0 0% 100%",
      success: "173 58% 39%",
      successForeground: "0 0% 100%",
      warning: "38 92% 50%",
      warningForeground: "222 47% 12%",
      info: "210 100% 89%",
      infoForeground: "222 47% 12%",
      border: "215 28% 85%",
      input: "215 28% 85%",
      ring: "226 88% 58%",
      sidebarBg: "222 47% 9%",
      sidebarFg: "214 22% 84%",
      sidebarHover: "223 31% 15%",
      sidebarActive: "236 87% 67%",
      sidebarActiveForeground: "0 0% 100%",
      sidebarMuted: "214 14% 58%",
      sidebarBorder: "223 24% 16%",
      sidebarPrimary: "236 87% 67%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "223 31% 15%",
      sidebarAccentForeground: "214 22% 84%",
      sidebarRing: "236 87% 67%",
    },
    dark: {
      background: "215 52% 8%",
      foreground: "210 30% 96%",
      card: "215 36% 12%",
      cardForeground: "210 30% 96%",
      popover: "215 36% 11%",
      popoverForeground: "210 30% 96%",
      primary: "236 87% 67%",
      primaryForeground: "0 0% 100%",
      secondary: "215 28% 18%",
      secondaryForeground: "214 22% 86%",
      muted: "215 20% 14%",
      mutedForeground: "214 16% 67%",
      accent: "236 87% 67%",
      accentForeground: "0 0% 100%",
      destructive: "0 65% 48%",
      destructiveForeground: "0 0% 100%",
      success: "173 58% 39%",
      successForeground: "0 0% 100%",
      warning: "38 88% 52%",
      warningForeground: "222 47% 12%",
      info: "210 100% 89%",
      infoForeground: "222 47% 12%",
      border: "215 18% 20%",
      input: "215 18% 20%",
      ring: "236 87% 67%",
      sidebarBg: "222 52% 6%",
      sidebarFg: "214 24% 84%",
      sidebarHover: "223 30% 14%",
      sidebarActive: "236 87% 67%",
      sidebarActiveForeground: "0 0% 100%",
      sidebarMuted: "214 14% 58%",
      sidebarBorder: "223 20% 14%",
      sidebarPrimary: "236 87% 67%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "223 30% 14%",
      sidebarAccentForeground: "214 24% 84%",
      sidebarRing: "236 87% 67%",
    },
  },
  nebula: {
    light: {
      background: "250 72% 97%",
      foreground: "262 46% 13%",
      card: "0 0% 100%",
      cardForeground: "262 46% 13%",
      popover: "0 0% 100%",
      popoverForeground: "262 46% 13%",
      primary: "267 84% 58%",
      primaryForeground: "0 0% 100%",
      secondary: "250 40% 94%",
      secondaryForeground: "262 40% 18%",
      muted: "250 28% 92%",
      mutedForeground: "262 18% 40%",
      accent: "330 81% 60%",
      accentForeground: "0 0% 100%",
      destructive: "0 72% 51%",
      destructiveForeground: "0 0% 100%",
      success: "173 58% 39%",
      successForeground: "0 0% 100%",
      warning: "38 92% 50%",
      warningForeground: "262 46% 13%",
      info: "272 95% 90%",
      infoForeground: "262 46% 13%",
      border: "250 28% 86%",
      input: "250 28% 86%",
      ring: "267 84% 58%",
      sidebarBg: "261 56% 10%",
      sidebarFg: "260 26% 84%",
      sidebarHover: "264 38% 16%",
      sidebarActive: "267 84% 58%",
      sidebarActiveForeground: "0 0% 100%",
      sidebarMuted: "260 14% 58%",
      sidebarBorder: "264 24% 18%",
      sidebarPrimary: "267 84% 58%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "264 38% 16%",
      sidebarAccentForeground: "260 26% 84%",
      sidebarRing: "267 84% 58%",
    },
    dark: {
      background: "262 48% 8%",
      foreground: "260 24% 96%",
      card: "263 35% 12%",
      cardForeground: "260 24% 96%",
      popover: "263 35% 11%",
      popoverForeground: "260 24% 96%",
      primary: "267 84% 66%",
      primaryForeground: "0 0% 100%",
      secondary: "263 28% 18%",
      secondaryForeground: "260 22% 86%",
      muted: "263 18% 14%",
      mutedForeground: "260 14% 67%",
      accent: "330 81% 64%",
      accentForeground: "0 0% 100%",
      destructive: "0 65% 48%",
      destructiveForeground: "0 0% 100%",
      success: "173 58% 39%",
      successForeground: "0 0% 100%",
      warning: "38 88% 52%",
      warningForeground: "262 46% 13%",
      info: "272 95% 90%",
      infoForeground: "262 46% 13%",
      border: "263 16% 20%",
      input: "263 16% 20%",
      ring: "267 84% 66%",
      sidebarBg: "261 56% 6%",
      sidebarFg: "260 24% 84%",
      sidebarHover: "264 34% 14%",
      sidebarActive: "267 84% 66%",
      sidebarActiveForeground: "0 0% 100%",
      sidebarMuted: "260 14% 58%",
      sidebarBorder: "264 20% 14%",
      sidebarPrimary: "267 84% 66%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "264 34% 14%",
      sidebarAccentForeground: "260 24% 84%",
      sidebarRing: "267 84% 66%",
    },
  },
  slate: {
    light: {
      background: "210 33% 98%",
      foreground: "222 47% 12%",
      card: "0 0% 100%",
      cardForeground: "222 47% 12%",
      popover: "0 0% 100%",
      popoverForeground: "222 47% 12%",
      primary: "215 25% 27%",
      primaryForeground: "0 0% 100%",
      secondary: "214 24% 94%",
      secondaryForeground: "222 40% 18%",
      muted: "214 20% 92%",
      mutedForeground: "216 16% 40%",
      accent: "217 33% 68%",
      accentForeground: "222 47% 12%",
      destructive: "0 72% 51%",
      destructiveForeground: "0 0% 100%",
      success: "173 58% 39%",
      successForeground: "0 0% 100%",
      warning: "38 92% 50%",
      warningForeground: "222 47% 12%",
      info: "210 100% 89%",
      infoForeground: "222 47% 12%",
      border: "215 18% 86%",
      input: "215 18% 86%",
      ring: "215 25% 27%",
      sidebarBg: "222 47% 8%",
      sidebarFg: "214 24% 84%",
      sidebarHover: "223 24% 14%",
      sidebarActive: "215 25% 27%",
      sidebarActiveForeground: "0 0% 100%",
      sidebarMuted: "214 14% 58%",
      sidebarBorder: "223 18% 15%",
      sidebarPrimary: "215 25% 27%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "223 24% 14%",
      sidebarAccentForeground: "214 24% 84%",
      sidebarRing: "215 25% 27%",
    },
    dark: {
      background: "222 47% 8%",
      foreground: "214 30% 96%",
      card: "223 30% 12%",
      cardForeground: "214 30% 96%",
      popover: "223 30% 11%",
      popoverForeground: "214 30% 96%",
      primary: "215 25% 35%",
      primaryForeground: "0 0% 100%",
      secondary: "223 20% 18%",
      secondaryForeground: "214 24% 86%",
      muted: "223 14% 14%",
      mutedForeground: "214 14% 67%",
      accent: "217 33% 68%",
      accentForeground: "222 47% 12%",
      destructive: "0 65% 48%",
      destructiveForeground: "0 0% 100%",
      success: "173 58% 39%",
      successForeground: "0 0% 100%",
      warning: "38 88% 52%",
      warningForeground: "222 47% 12%",
      info: "210 100% 89%",
      infoForeground: "222 47% 12%",
      border: "223 14% 20%",
      input: "223 14% 20%",
      ring: "215 25% 35%",
      sidebarBg: "222 47% 6%",
      sidebarFg: "214 24% 84%",
      sidebarHover: "223 22% 14%",
      sidebarActive: "215 25% 35%",
      sidebarActiveForeground: "0 0% 100%",
      sidebarMuted: "214 14% 58%",
      sidebarBorder: "223 16% 14%",
      sidebarPrimary: "215 25% 35%",
      sidebarPrimaryForeground: "0 0% 100%",
      sidebarAccent: "223 22% 14%",
      sidebarAccentForeground: "214 24% 84%",
      sidebarRing: "215 25% 35%",
    },
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Reset old theme cache if version mismatch
  if (readStoredString("crm-theme-v", "") !== "5") {
    removeStoredValue("crm-mode");
    removeStoredValue("crm-color");
    removeStoredValue("crm-background");
    writeStoredString("crm-theme-v", "5");
  }

  const [mode, setMode] = useState<ThemeMode>(() => (readStoredString("crm-mode", "dark") as ThemeMode) || "dark");
  const validColors = Object.keys(themeTokens) as ThemeColor[];
  const [color, setColorState] = useState<ThemeColor>(() => {
    const saved = readStoredString("crm-color", "") as ThemeColor;
    return validColors.includes(saved) ? saved : "ocean";
  });
  const validBackgrounds = ["plain", "ocean", "sunset", "forest", "iris", "grid"] as const;
  const [background, setBackgroundState] = useState<BackgroundStyle>(() => {
    const saved = readStoredString("crm-background", "") as BackgroundStyle;
    return validBackgrounds.includes(saved) ? saved : "ocean";
  });
  const [role, setRoleState] = useState<UserRole>(() => {
    const storedUser = readStoredJSON<{ role?: UserRole }>("crm-auth-user", null);
    return (storedUser?.role as UserRole) || (readStoredString("crm-role", "admin") as UserRole) || "admin";
  });

  // Sync with backend on mount
  useEffect(() => {
    const storedUser = readStoredJSON<{ role?: UserRole }>("crm-auth-user", null);
    if (!isRemoteApiEnabled() || !storedUser) {
      if (storedUser?.role) setRoleState(storedUser.role as UserRole);
      return;
    }

    let mounted = true;
    const syncPreferences = async () => {
      try {
        const { data } = await crmService.getPreferences();
        if (!mounted) return;
        if (data["crm-mode"]) setMode(data["crm-mode"] as ThemeMode);
        if (data["crm-color"]) setColorState(data["crm-color"] as ThemeColor);
        if (data["crm-background"]) setBackgroundState(data["crm-background"] as BackgroundStyle);
        // Auth user role always wins over stored preference
        const storedUser = readStoredJSON<{ role?: UserRole }>("crm-auth-user", null);
        if (storedUser?.role) {
          setRoleState(storedUser.role as UserRole);
        } else if (data["crm-role"]) {
          setRoleState(data["crm-role"] as UserRole);
        }
      } catch (err) {
        if (!mounted) return;
        console.warn("Failed to sync preferences from backend:", err);
        // Still apply auth user role even if preferences fail
        const storedUser = readStoredJSON<{ role?: UserRole }>("crm-auth-user", null);
        if (storedUser?.role) setRoleState(storedUser.role as UserRole);
      }
    };
    syncPreferences();
    return () => { mounted = false; };
  }, []);

  const applyTheme = (m: ThemeMode, c: ThemeColor, backdrop: BackgroundStyle) => {
    const root = document.documentElement;
    root.classList.toggle("dark", m === "dark");
    const t = themeTokens[c]?.[m] ?? themeTokens.ocean[m];
    const backdropMap: Record<BackgroundStyle, { image: string; size: string; position: string; repeat: string }> = {
      plain: {
        image: "none",
        size: "auto",
        position: "0 0",
        repeat: "repeat",
      },
      ocean: {
        image: `radial-gradient(circle at 10% 12%, hsl(208 90% 60% / 0.25), transparent 28%), radial-gradient(circle at 88% 14%, hsl(193 92% 58% / 0.18), transparent 24%), linear-gradient(180deg, hsl(${t.background}), hsl(${t.background}))`,
        size: "cover, cover, cover",
        position: "top left, top right, 0 0",
        repeat: "no-repeat, no-repeat, no-repeat",
      },
      sunset: {
        image: `radial-gradient(circle at 12% 12%, hsl(18 92% 62% / 0.26), transparent 28%), radial-gradient(circle at 86% 18%, hsl(330 82% 68% / 0.22), transparent 24%), linear-gradient(180deg, hsl(${t.background}), hsl(${t.background}))`,
        size: "cover, cover, cover",
        position: "top left, top right, 0 0",
        repeat: "no-repeat, no-repeat, no-repeat",
      },
      forest: {
        image: `radial-gradient(circle at 14% 82%, hsl(155 62% 38% / 0.22), transparent 26%), radial-gradient(circle at 84% 16%, hsl(173 58% 42% / 0.18), transparent 24%), linear-gradient(180deg, hsl(${t.background}), hsl(${t.background}))`,
        size: "cover, cover, cover",
        position: "bottom left, top right, 0 0",
        repeat: "no-repeat, no-repeat, no-repeat",
      },
      iris: {
        image: `radial-gradient(circle at 16% 14%, hsl(267 84% 60% / 0.24), transparent 26%), radial-gradient(circle at 86% 84%, hsl(330 81% 60% / 0.18), transparent 24%), linear-gradient(180deg, hsl(${t.background}), hsl(${t.background}))`,
        size: "cover, cover, cover",
        position: "top left, bottom right, 0 0",
        repeat: "no-repeat, no-repeat, no-repeat",
      },
      grid: {
        image: `linear-gradient(hsl(${t.foreground} / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(${t.foreground} / 0.04) 1px, transparent 1px), linear-gradient(180deg, hsl(${t.background}), hsl(${t.background}))`,
        size: "28px 28px, 28px 28px, cover",
        position: "0 0, 0 0, 0 0",
        repeat: "repeat, repeat, no-repeat",
      },
    };
    const backdropTokens = backdropMap[backdrop];
    root.style.setProperty("--background", t.background);
    root.style.setProperty("--foreground", t.foreground);
    root.style.setProperty("--card", t.card);
    root.style.setProperty("--card-foreground", t.cardForeground);
    root.style.setProperty("--popover", t.popover);
    root.style.setProperty("--popover-foreground", t.popoverForeground);
    root.style.setProperty("--primary", t.primary);
    root.style.setProperty("--primary-foreground", t.primaryForeground);
    root.style.setProperty("--secondary", t.secondary);
    root.style.setProperty("--secondary-foreground", t.secondaryForeground);
    root.style.setProperty("--muted", t.muted);
    root.style.setProperty("--muted-foreground", t.mutedForeground);
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-foreground", t.accentForeground);
    root.style.setProperty("--destructive", t.destructive);
    root.style.setProperty("--destructive-foreground", t.destructiveForeground);
    root.style.setProperty("--success", t.success);
    root.style.setProperty("--success-foreground", t.successForeground);
    root.style.setProperty("--warning", t.warning);
    root.style.setProperty("--warning-foreground", t.warningForeground);
    root.style.setProperty("--info", t.info);
    root.style.setProperty("--info-foreground", t.infoForeground);
    root.style.setProperty("--border", t.border);
    root.style.setProperty("--input", t.input);
    root.style.setProperty("--ring", t.ring);
    root.style.setProperty("--sidebar-bg", t.sidebarBg);
    root.style.setProperty("--sidebar-fg", t.sidebarFg);
    root.style.setProperty("--sidebar-hover", t.sidebarHover);
    root.style.setProperty("--sidebar-active", t.sidebarActive);
    root.style.setProperty("--sidebar-muted", t.sidebarMuted);
    root.style.setProperty("--sidebar-border", t.sidebarBorder);
    root.style.setProperty("--sidebar-background", t.sidebarBg);
    root.style.setProperty("--sidebar-foreground", t.sidebarFg);
    root.style.setProperty("--sidebar-primary", t.sidebarPrimary);
    root.style.setProperty("--sidebar-primary-foreground", t.sidebarPrimaryForeground);
    root.style.setProperty("--sidebar-accent", t.sidebarAccent);
    root.style.setProperty("--sidebar-accent-foreground", t.sidebarAccentForeground);
    root.style.setProperty("--sidebar-ring", t.sidebarRing);
    root.style.setProperty("--app-background-image", backdropTokens.image);
    root.style.setProperty("--app-background-size", backdropTokens.size);
    root.style.setProperty("--app-background-position", backdropTokens.position);
    root.style.setProperty("--app-background-repeat", backdropTokens.repeat);
  };

  useEffect(() => { applyTheme(mode, color, background); }, [mode, color, background]);

  const toggleMode = useCallback(() => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    writeStoredString("crm-mode", next);
    crmService.updatePreferences({ "crm-mode": next });
  }, [mode]);

  const setColor = (c: ThemeColor) => {
    setColorState(c);
    writeStoredString("crm-color", c);
    crmService.updatePreferences({ "crm-color": c });
  };

  const setBackground = (style: BackgroundStyle) => {
    setBackgroundState(style);
    writeStoredString("crm-background", style);
    crmService.updatePreferences({ "crm-background": style });
  };

  const setRole = (r: UserRole) => {
    setRoleState(r);
    writeStoredString("crm-role", r);
    crmService.updatePreferences({ "crm-role": r });
  };

  return (
    <ThemeContext.Provider value={useMemo(() => ({ mode, color, background, role, toggleMode, setColor, setBackground, setRole }), [mode, color, background, role, toggleMode])}>
      {children}
    </ThemeContext.Provider>
  );
}
