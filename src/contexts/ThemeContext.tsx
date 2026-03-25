import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeColor = "teal" | "violet" | "rose" | "amber" | "blue";
export type ThemeMode = "light" | "dark";
export type UserRole = "admin" | "manager" | "employee" | "client";

interface ThemeContextType {
  mode: ThemeMode;
  color: ThemeColor;
  role: UserRole;
  toggleMode: () => void;
  setColor: (c: ThemeColor) => void;
  setRole: (r: UserRole) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "light", color: "teal", role: "admin",
  toggleMode: () => {}, setColor: () => {}, setRole: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const colorTokens: Record<ThemeColor, { primary: string; accent: string; ring: string; sidebarActive: string }> = {
  teal:   { primary: "173 58% 39%",  accent: "262 52% 55%",  ring: "173 58% 39%",  sidebarActive: "173 58% 39%" },
  violet: { primary: "262 83% 58%",  accent: "330 81% 60%",  ring: "262 83% 58%",  sidebarActive: "262 83% 58%" },
  rose:   { primary: "346 77% 50%",  accent: "25 95% 53%",   ring: "346 77% 50%",  sidebarActive: "346 77% 50%" },
  amber:  { primary: "38 92% 50%",   accent: "262 52% 55%",  ring: "38 92% 50%",   sidebarActive: "38 92% 50%" },
  blue:   { primary: "217 91% 60%",  accent: "173 58% 39%",  ring: "217 91% 60%",  sidebarActive: "217 91% 60%" },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => (localStorage.getItem("crm-mode") as ThemeMode) || "light");
  const [color, setColorState] = useState<ThemeColor>(() => (localStorage.getItem("crm-color") as ThemeColor) || "teal");
  const [role, setRoleState] = useState<UserRole>(() => (localStorage.getItem("crm-role") as UserRole) || "admin");

  const applyTheme = (m: ThemeMode, c: ThemeColor) => {
    const root = document.documentElement;
    root.classList.toggle("dark", m === "dark");
    const tokens = colorTokens[c];
    root.style.setProperty("--primary", tokens.primary);
    root.style.setProperty("--ring", tokens.ring);
    root.style.setProperty("--accent", tokens.accent);
    root.style.setProperty("--sidebar-active", tokens.sidebarActive);
    root.style.setProperty("--sidebar-primary", tokens.sidebarActive);
    root.style.setProperty("--sidebar-ring", tokens.sidebarActive);
  };

  useEffect(() => { applyTheme(mode, color); }, [mode, color]);

  const toggleMode = () => {
    const next = mode === "light" ? "dark" : "light";
    setMode(next);
    localStorage.setItem("crm-mode", next);
  };

  const setColor = (c: ThemeColor) => {
    setColorState(c);
    localStorage.setItem("crm-color", c);
  };

  const setRole = (r: UserRole) => {
    setRoleState(r);
    localStorage.setItem("crm-role", r);
  };

  return (
    <ThemeContext.Provider value={{ mode, color, role, toggleMode, setColor, setRole }}>
      {children}
    </ThemeContext.Provider>
  );
}
