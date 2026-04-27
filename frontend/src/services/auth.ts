import { readStoredJSON, writeStoredJSON, removeStoredValue, readStoredString, writeStoredString } from "@/lib/preferences";
import { isRemoteApiEnabled, requestJson } from "@/lib/api-client";
import type { UserRole } from "@/contexts/ThemeContext";
import type { PaymentMode } from "@/types/crm";

export type AuthCredentials = {
  name?: string;
  email: string;
  password: string;
  role?: UserRole;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  employeeId: string;
  department: string;
  team: string;
  designation: string;
  manager: string;
  workingHours: string;
  officeLocation: string;
  timeZone: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  paymentMode: PaymentMode;
  payrollCycle: string;
  payrollDueDate: string;
  joinedAt: string;
  location: string;
};

export type AuthSession = {
  user: AuthUser;
  // Tokens are now in httpOnly cookies, but we keep the type for mock mode
  accessToken?: string;
  refreshToken?: string;
};

const AUTH_USER_KEY = "crm-auth-user";

function getMockProfile(role: UserRole): Omit<AuthUser, "id" | "name" | "email" | "role"> {
  switch (role) {
    case "admin":
      return {
        employeeId: "EMP-1001",
        department: "Operations",
        team: "Platform Ops",
        designation: "Admin Lead",
        manager: "Executive Team",
        workingHours: "09:30 - 18:30",
        officeLocation: "HQ - Floor 4",
        timeZone: "Asia/Calcutta",
        baseSalary: 145000,
        allowances: 22000,
        deductions: 7800,
        paymentMode: "bank-transfer",
        payrollCycle: "Mar 2026",
        payrollDueDate: "Apr 05, 2026",
        joinedAt: "2023-09-18",
        location: "Head Office",
      };
    case "manager":
      return {
        employeeId: "EMP-2042",
        department: "Management",
        team: "Growth Team",
        designation: "Workspace Manager",
        manager: "Director of Operations",
        workingHours: "10:00 - 19:00",
        officeLocation: "Hybrid Desk",
        timeZone: "Asia/Calcutta",
        baseSalary: 128000,
        allowances: 18000,
        deductions: 6500,
        paymentMode: "bank-transfer",
        payrollCycle: "Mar 2026",
        payrollDueDate: "Apr 05, 2026",
        joinedAt: "2024-01-12",
        location: "Hybrid",
      };
    case "employee":
      return {
        employeeId: "EMP-3187",
        department: "Delivery",
        team: "Client Delivery",
        designation: "Product Specialist",
        manager: "Team Manager",
        workingHours: "09:00 - 18:00",
        officeLocation: "HQ - Floor 2",
        timeZone: "Asia/Calcutta",
        baseSalary: 72000,
        allowances: 12000,
        deductions: 3200,
        paymentMode: "upi",
        payrollCycle: "Mar 2026",
        payrollDueDate: "Apr 05, 2026",
        joinedAt: "2024-05-06",
        location: "Remote",
      };
    case "client":
      return {
        employeeId: "CLT-4408",
        department: "Client",
        team: "",
        designation: "Client Contact",
        manager: "Account Team",
        workingHours: "",
        officeLocation: "",
        timeZone: "Asia/Calcutta",
        baseSalary: 0,
        allowances: 0,
        deductions: 0,
        paymentMode: "upi",
        payrollCycle: "",
        payrollDueDate: "",
        joinedAt: "2025-02-20",
        location: "External",
      };
  }
}

function createMockSession(credentials: AuthCredentials): AuthSession {
  const role = credentials.role ?? (credentials.email.endsWith("@client.com") ? "client" : "employee");
  const name = credentials.name ?? (role === "client" ? "Client User" : "Workspace User");
  const user: AuthUser = {
    id: `user-${Math.random().toString(36).slice(2, 10)}`,
    name,
    email: credentials.email,
    emailVerified: true,
    role,
    ...getMockProfile(role),
  };

  return {
    user,
    accessToken: `mock-${user.id}`,
    refreshToken: `refresh-${user.id}`,
  };
}

function persistUser(user: AuthUser | null) {
  if (!user) {
    removeStoredValue(AUTH_USER_KEY);
    removeStoredValue("crm-auth-token");
    return;
  }
  writeStoredJSON(AUTH_USER_KEY, user);
}

function persistSession(session: AuthSession) {
  persistUser(session.user);
  if (session.accessToken) {
    writeStoredString("crm-auth-token", session.accessToken);
  }
}

export function getStoredAuthUser() {
  return readStoredJSON<AuthUser | null>(AUTH_USER_KEY, null);
}

export const authService = {
  async login(credentials: AuthCredentials): Promise<AuthSession> {
    if (!isRemoteApiEnabled()) {
      const session = createMockSession(credentials);
      persistSession(session);
      return session;
    }

    const session = await requestJson<AuthSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    persistSession(session);
    return session;
  },

  async loginWithGoogle(): Promise<AuthSession> {
    // Get the auth URL and redirect to it
    const { authUrl } = await requestJson<{ authUrl: string }>("/auth/google/login-url");
    window.location.href = authUrl;
    
    // This won't return - page will redirect
    return new Promise(() => {});
  },

  async signup(credentials: AuthCredentials): Promise<AuthSession> {
    if (!isRemoteApiEnabled()) {
      const session = createMockSession({ ...credentials, role: credentials.role ?? "employee" });
      persistSession(session);
      return session;
    }

    const session = await requestJson<AuthSession>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    persistSession(session);
    return session;
  },

  async me(): Promise<AuthSession | null> {
    const storedUser = getStoredAuthUser();
    
    // In remote mode, we check cookies by calling /me
    if (isRemoteApiEnabled()) {
      try {
        const { user } = await requestJson<{ user: AuthUser }>("/auth/me");
        persistUser(user);
        return { user };
      } catch {
        persistUser(null);
        return null;
      }
    }

    // Mock mode
    if (!storedUser) return null;
    return { user: storedUser };
  },

  async updateProfile(input: Partial<Pick<AuthUser, "name" | "department" | "team" | "designation" | "manager" | "workingHours" | "officeLocation" | "timeZone" | "location">>): Promise<AuthUser> {
    const stored = getStoredAuthUser();
    if (!isRemoteApiEnabled()) {
      const updated = { ...stored!, ...input };
      persistUser(updated);
      return updated;
    }
    const { user } = await requestJson<{ user: AuthUser }>("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
    persistUser(user);
    return user;
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    return requestJson("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) });
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    return requestJson("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) });
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return requestJson("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return requestJson("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) });
  },

  async switchRole(targetRole: UserRole): Promise<AuthUser> {
    const stored = getStoredAuthUser();
    if (!stored) throw new Error("NO_SESSION");

    if (!isRemoteApiEnabled()) {
      if (stored.role === "admin") {
        const updated: AuthUser = {
          ...stored,
          role: targetRole,
          ...getMockProfile(targetRole),
          id: stored.id,
          name: stored.name,
          email: stored.email,
        };
        persistUser(updated);
        return updated;
      }
      if (stored.role !== targetRole) throw new Error("ROLE_MISMATCH");
      return stored;
    }

    try {
      const { user } = await requestJson<{ user: AuthUser }>("/auth/switch-role", {
        method: "POST",
        body: JSON.stringify({ targetRole }),
      });
      persistUser(user);
      return user;
    } catch (err: unknown) {
      const status = typeof err === "object" && err && "status" in err ? (err as { status?: number }).status : undefined;
      if (status === 403) throw new Error("ROLE_MISMATCH");
      throw new Error("NO_SESSION");
    }
  },

  async logout(): Promise<void> {
    if (isRemoteApiEnabled()) {
      try {
        await requestJson("/auth/logout", { method: "POST" });
      } catch { /* ignore logout errors */ }
    }
    persistUser(null);
  },
};
