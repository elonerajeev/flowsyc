import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { UserRole } from "@/contexts/ThemeContext";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const { setRole } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setLocalRole] = useState<UserRole>("employee");
  const [error, setError] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const user = await signup({ name, email, password, role });
      setRole(user.role);
      navigate("/overview");
    } catch {
      setError("Unable to create account. Try again.");
    }
  };

  const handleGoogleSignup = async () => {
    setLoadingGoogle(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/google/login-url?intent=signup&role=${encodeURIComponent(role)}`);
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-8 shadow-card">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Create account</p>
          <h1 className="mt-3 text-3xl font-display font-semibold text-foreground">Join the workspace</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a role and we&apos;ll personalize your layout.
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

          <label className="space-y-2 text-sm font-semibold text-foreground">
            Role
            <select
              value={role}
              onChange={(event) => setLocalRole(event.target.value as UserRole)}
              className="h-11 w-full rounded-2xl border border-input bg-background px-4 text-sm text-foreground outline-none transition focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {(["employee", "client"] as UserRole[]).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && (
          <p className="text-xs font-semibold text-destructive">{error}</p>
        )}

        <button
          type="submit"
          className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
        >
          Create account
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
    </div>
  );
}
