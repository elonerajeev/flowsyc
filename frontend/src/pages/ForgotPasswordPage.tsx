import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/auth";
import AuthLayout from "@/components/layout/AuthLayout";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authService.forgotPassword(email);
      setSent(true);
    } catch {
      setError("Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {sent ? (
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2A8F7A]/10 border border-[#2A8F7A]/20">
            <svg className="h-7 w-7 text-[#2A8F7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Check your inbox</h2>
            <p className="mt-2 text-sm text-white/40">
              We sent a reset link to <span className="font-semibold text-white/70">{email}</span>
            </p>
          </div>
          <p className="text-xs text-white/25">Didn't receive it? Check spam or</p>
          <button
            onClick={() => setSent(false)}
            className="text-xs font-semibold text-[#5355D6] hover:text-[#7B7FFF] transition-colors"
          >
            try a different email
          </button>
          <button
            onClick={() => navigate("/login")}
            className="mt-2 block w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-white/70 transition-all hover:bg-white/[0.06] hover:text-white"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5355D6]">Password Reset</p>
            <h1 className="mt-2 text-2xl font-bold text-white">Forgot your password?</h1>
            <p className="mt-1.5 text-sm text-white/40">
              Enter your email and we'll send you a secure reset link.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@company.com"
              className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#5355D6]/50 focus:ring-1 focus:ring-[#5355D6]/30"
            />
          </div>

          {error && <p className="text-xs font-semibold text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="relative w-full overflow-hidden rounded-xl bg-[#5355D6] py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(83,85,214,0.3)] transition-all hover:shadow-[0_0_40px_rgba(83,85,214,0.4)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {loading ? "Sending..." : "Send Reset Link"}
          </button>

          <p className="text-center text-xs text-white/30">
            Remember it?{" "}
            <button type="button" onClick={() => navigate("/login")} className="font-semibold text-[#5355D6] hover:text-[#7B7FFF] transition-colors">
              Sign in
            </button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
