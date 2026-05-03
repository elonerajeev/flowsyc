import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { authService } from "@/services/auth";
import { RefreshCw } from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";

export default function CheckEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email ?? "";

  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError("");
    try {
      await authService.resendVerification(email);
      setResent(true);
    } catch {
      setError("Failed to resend. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout showBack={false}>
      <div className="space-y-6 text-center">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#5355D6]/20 bg-[#5355D6]/10">
          <svg className="h-8 w-8 text-[#5355D6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
          </svg>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5355D6]">Almost there</p>
          <h1 className="mt-2 text-2xl font-bold text-white">Verify your email</h1>
          <p className="mt-2 text-sm text-white/40">
            We sent a verification link to{" "}
            {email
              ? <span className="font-semibold text-white/70">{email}</span>
              : "your email address"
            }.
            Click the link to activate your account.
          </p>
        </div>

        {/* Steps */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left space-y-2">
          {[
            "Open your email inbox",
            "Find the email from Flowsyc",
            "Click \"Verify Email\" button",
            "You'll be redirected to login",
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#5355D6]/15 text-[10px] font-bold text-[#5355D6]">{i + 1}</span>
              <span className="text-xs text-white/40">{step}</span>
            </div>
          ))}
        </div>

        {resent ? (
          <p className="text-sm font-semibold text-[#2A8F7A]">✓ Verification email resent!</p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending || !email}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-medium text-white/60 transition-all hover:bg-white/[0.06] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
            {resending ? "Sending..." : "Resend verification email"}
          </button>
        )}

        {error && <p className="text-xs text-red-400">{error}</p>}

        <p className="text-xs text-white/25">
          Wrong email?{" "}
          <button onClick={() => navigate("/signup")} className="font-semibold text-[#5355D6] hover:text-[#7B7FFF] transition-colors">
            Sign up again
          </button>
          {" · "}
          <button onClick={() => navigate("/login")} className="font-semibold text-white/40 hover:text-white/70 transition-colors">
            Back to login
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}
