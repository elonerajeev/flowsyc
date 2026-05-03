import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "@/services/auth";
import { Loader2 } from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "already" | "error">("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link — token is missing.");
      return;
    }
    authService.verifyEmail(token)
      .then((res) => {
        const msg = res.message ?? "";
        if (msg.toLowerCase().includes("already")) {
          setStatus("already");
        } else {
          setStatus("success");
        }
        setMessage(msg);
      })
      .catch((err) => {
        const msg = (err as Error)?.message ?? "";
        if (msg.toLowerCase().includes("already")) {
          setStatus("already");
        } else {
          setStatus("error");
          setMessage(msg || "Verification failed. The link may be expired or already used.");
        }
      });
  }, [searchParams]);

  // Countdown redirect on success
  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) { navigate("/login"); return; }
    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [status, countdown, navigate]);

  return (
    <AuthLayout showBack={false}>
      {status === "loading" && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <Loader2 className="h-8 w-8 animate-spin text-[#5355D6]" />
          </div>
          <h2 className="text-xl font-bold text-white">Verifying your email...</h2>
          <p className="text-sm text-white/40">Please wait a moment.</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-5 text-center">
          {/* Celebration */}
          <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
            {/* Pulse rings */}
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2A8F7A] opacity-10" />
            <span className="absolute inline-flex h-3/4 w-3/4 animate-ping rounded-full bg-[#2A8F7A] opacity-15" style={{ animationDelay: "0.2s" }} />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#2A8F7A]/40 bg-[#2A8F7A]/10">
              <svg className="h-8 w-8 text-[#2A8F7A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#2A8F7A]">Verified ✓</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Email Verified!</h2>
            <p className="mt-2 text-sm text-white/40">
              Your account is now active. Welcome to Flowsyc.
            </p>
          </div>

          {/* Countdown bar */}
          <div className="rounded-xl border border-[#2A8F7A]/15 bg-[#2A8F7A]/5 px-4 py-3">
            <p className="text-xs text-[#2A8F7A]/70">
              Redirecting to login in <span className="font-bold text-[#2A8F7A]">{countdown}s</span>...
            </p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#2A8F7A]/10">
              <div
                className="h-full rounded-full bg-[#2A8F7A] transition-all duration-1000"
                style={{ width: `${(countdown / 5) * 100}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-xl bg-[#5355D6] py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(83,85,214,0.3)] transition-all hover:shadow-[0_0_40px_rgba(83,85,214,0.4)]"
          >
            Go to Login Now
          </button>
        </div>
      )}

      {status === "already" && (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#5355D6]/20 bg-[#5355D6]/10">
            <svg className="h-8 w-8 text-[#5355D6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5355D6]">Already Done</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Email Already Verified</h2>
            <p className="mt-2 text-sm text-white/40">
              Your email was already verified. You can log in directly.
            </p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-xl bg-[#5355D6] py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(83,85,214,0.3)] transition-all hover:shadow-[0_0_40px_rgba(83,85,214,0.4)]"
          >
            Go to Login
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
            <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400">Failed</p>
            <h2 className="mt-2 text-2xl font-bold text-white">Link Invalid or Expired</h2>
            <p className="mt-2 text-sm text-white/40">{message}</p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/check-email")}
              className="w-full rounded-xl bg-[#5355D6] py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(83,85,214,0.3)] transition-all hover:shadow-[0_0_40px_rgba(83,85,214,0.4)]"
            >
              Resend Verification Email
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-semibold text-white/60 transition-all hover:bg-white/[0.06] hover:text-white"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
