import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { authService } from "@/services/auth";
import AuthLayout from "@/components/layout/AuthLayout";
import type { UserRole } from "@/contexts/ThemeContext";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Manager",
  employee: "Employee",
  client: "Client",
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pendingSwitchRole = searchParams.get("switchRole") as UserRole | null;

  const { login, switchRole } = useAuth();
  const { setRole } = useTheme();
  const [email, setEmail] = useState("john@crmpro.com");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationResent, setVerificationResent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setEmailNotVerified(false);
    setLoading(true);
    try {
      const user = await login({ email, password });
      setRole(user.role);

      if (pendingSwitchRole && pendingSwitchRole !== user.role) {
        const result = await switchRole(pendingSwitchRole);
        if (result.success) setRole(pendingSwitchRole);
      }

      if (rememberMe) {
        localStorage.setItem("crm-remember-email", email);
      } else {
        localStorage.removeItem("crm-remember-email");
      }

      navigate(nextPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("EMAIL_NOT_VERIFIED") || msg.includes("verify your email")) {
        setEmailNotVerified(true);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendingVerification(true);
    try {
      await authService.resendVerification(email);
      setVerificationResent(true);
    } catch {
      setError("Failed to resend verification email.");
    } finally {
      setResendingVerification(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoadingGoogle(true);
    setError("");
    try {
      const response = await fetch("/api/auth/google/login-url?intent=login");
      if (!response.ok) throw new Error("Failed to get auth URL");
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      console.error("Google login error:", err);
      setError("Google login not available. Use email/password.");
      setLoadingGoogle(false);
    }
  };

  return (
    <AuthLayout showBack={false}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5355D6]">Sign in</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Welcome back</h1>
          {pendingSwitchRole ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Sign in to switch to{" "}
              <span className="font-semibold text-primary">{roleLabels[pendingSwitchRole]}</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your credentials to continue into the workspace.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <label className="space-y-2 text-sm font-semibold text-foreground">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-foreground">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            />
          </label>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-input bg-background text-primary focus:ring-ring focus:ring-offset-0"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-primary underline hover:brightness-125"
            >
              Forgot password?
            </button>
          </div>
        </div>

        {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

        {emailNotVerified && (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm">
            <p className="font-semibold text-yellow-600">Email not verified</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Please check your inbox and click the verification link before logging in.
            </p>
            {verificationResent ? (
              <p className="mt-2 text-xs font-medium text-green-600">✓ Verification email resent!</p>
            ) : (
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingVerification}
                className="mt-2 text-xs font-semibold text-primary underline hover:brightness-125 disabled:opacity-50"
              >
                {resendingVerification ? "Sending..." : "Resend verification email"}
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Signing in..."
            : pendingSwitchRole
              ? `Sign in as ${roleLabels[pendingSwitchRole]}`
              : "Sign in"}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loadingGoogle}
          className="w-full flex items-center justify-center gap-2 rounded-2xl border border-input bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-accent disabled:opacity-50"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {loadingGoogle ? "Connecting..." : "Google"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Need an account?{" "}
          <button type="button" onClick={() => navigate("/signup")} className="text-primary underline">
            Create one
          </button>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
