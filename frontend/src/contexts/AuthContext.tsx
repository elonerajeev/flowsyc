import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { isRemoteApiEnabled } from "@/lib/api-client";
import { authService, getStoredAuthUser } from "@/services/auth";
import type { AuthCredentials, AuthUser } from "@/services/auth";
import type { UserRole } from "@/contexts/ThemeContext";

type ProfileUpdate = Partial<Pick<AuthUser, "name" | "department" | "team" | "designation" | "manager" | "workingHours" | "officeLocation" | "timeZone" | "location">>;

type AuthContextType = {
  user: AuthUser | null;
  login: (credentials: AuthCredentials) => Promise<AuthUser>;
  signup: (credentials: AuthCredentials) => Promise<AuthUser>;
  loginWithGoogle: () => Promise<AuthUser>;
  logout: () => void;
  updateProfile: (input: ProfileUpdate) => Promise<void>;
  switchRole: (targetRole: UserRole) => Promise<{ success: boolean; error: "NO_SESSION" | "ROLE_MISMATCH" | null }>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async (credentials) => (await authService.login(credentials)).user,
  signup: async (credentials) => (await authService.signup(credentials)).user,
  loginWithGoogle: async () => (await authService.loginWithGoogle()).user,
  logout: () => {},
  updateProfile: async () => {},
  switchRole: async () => ({ success: false, error: "NO_SESSION" }),
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser());
  const [skipInitialFetch, setSkipInitialFetch] = useState(false);

  useEffect(() => {
    if (skipInitialFetch) return;

    // In remote mode, always try to verify the session (cookies are automatic)
    if (isRemoteApiEnabled()) {
      let cancelled = false;
      authService
        .me()
        .then((session) => {
          if (cancelled) return;
          setUser(session?.user ?? null);
        })
        .catch(() => {
          if (cancelled) return;
          setUser(null);
        });
      return () => { cancelled = true; };
    } else {
      // Mock mode: rely on localStorage
      setUser(getStoredAuthUser());
    }
  }, [skipInitialFetch]);

  const login = async (credentials: AuthCredentials) => {
    const session = await authService.login(credentials);
    setUser(session.user);
    setSkipInitialFetch(true);
    return session.user;
  };

  const signup = async (credentials: AuthCredentials) => {
    const session = await authService.signup(credentials);
    setUser(session.user);
    setSkipInitialFetch(true);
    return session.user;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const loginWithGoogle = async () => {
    const session = await authService.loginWithGoogle();
    setUser(session.user);
    setSkipInitialFetch(true);
    return session.user;
  };

  const updateProfile = async (input: ProfileUpdate) => {
    const updated = await authService.updateProfile(input);
    setUser(updated);
  };

  const switchRole = async (targetRole: UserRole): Promise<{ success: boolean; error: "NO_SESSION" | "ROLE_MISMATCH" | null }> => {
    try {
      const updated = await authService.switchRole(targetRole);
      setUser(updated);
      return { success: true, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg === "NO_SESSION") return { success: false, error: "NO_SESSION" };
      if (msg === "ROLE_MISMATCH") return { success: false, error: "ROLE_MISMATCH" };
      return { success: false, error: "NO_SESSION" };
    }
  };

  const value = useMemo<AuthContextType>(
    () => ({ user, login, signup, loginWithGoogle, logout, updateProfile, switchRole }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
