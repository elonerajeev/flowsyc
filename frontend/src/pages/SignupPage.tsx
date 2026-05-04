import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import AuthLayout from "@/components/layout/AuthLayout";
import type { UserRole } from "@/contexts/ThemeContext";

const strengthRules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(p) },
];

function getStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  const score = strengthRules.filter((r) => r.test(password)).length;
  if (score <= 1) return { score, label: "Weak", color: "bg-destructive" };
  if (score <= 3) return { score, label: "Fair", color: "bg-warning" };
  if (score <= 4) return { score, label: "Good", color: "bg-info" };
  return { score, label: "Strong", color: "bg-success" };
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role] = useState<UserRole>("admin");
  const [error, setError] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = getStrength(password);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup({ name, email, password, role });
      // Redirect to check-email — user must verify before logging in
      navigate("/check-email", { state: { email } });
    } catch {
      setError("Unable to create account. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoadingGoogle(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/google/login-url?intent=signup&role=admin`);
      if (!response.ok) throw new Error("Failed to get auth URL");
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (err) {
      console.error("Google signup error:", err);
      setError("Google signup not available. Use form below.");
      setLoadingGoogle(false);
    }
  };

  return (
    <AuthLayout showBack={false}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5355D6]">Create account</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Join Flowsyc</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create your admin account to set up your workspace.
          </p>
        </div>

        <div className="space-y-4">
          <label className="space-y-2 text-sm font-semibold text-foreground">
            Full name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
              required
              className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-foreground">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          <label className="space-y-2 text-sm font-semibold text-foreground">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </label>

          {password && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(strength.score / strengthRules.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground">{strength.label}</span>
              </div>
              <ul className="space-y-1">
                {strengthRules.map((rule) => (
                  <li key={rule.label} className="flex items-center gap-2 text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full transition-colors ${rule.test(password) ? "bg-success" : "bg-muted-foreground/30"}`} />
                    <span className={rule.test(password) ? "text-muted-foreground" : "text-muted-foreground/50"}>
                      {rule.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {error && (
          <p className="text-xs font-semibold text-destructive">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating account..." : "Create account"}
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
          onClick={handleGoogleSignup}
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
          Already have an account? <button type="button" onClick={() => navigate("/login")} className="text-primary underline">Sign in</button>.
        </p>
      </form>
    </AuthLayout>
  );
}
