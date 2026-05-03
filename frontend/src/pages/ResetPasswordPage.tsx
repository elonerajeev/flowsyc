import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "@/services/auth";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import AuthLayout from "@/components/layout/AuthLayout";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 3 : 2;
  const strengthLabel = ["", "Weak", "Fair", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-[#2A8F7A]"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (!token) { setError("Invalid or expired reset link. Request a new one."); return; }
    setLoading(true);
    setError("");
    try {
      await authService.resetPassword(token, password);
      setDone(true);
    } catch {
      setError("Reset link is invalid or expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {done ? (
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#2A8F7A]/10 border border-[#2A8F7A]/20">
            <CheckCircle2 className="h-7 w-7 text-[#2A8F7A]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Password updated!</h2>
            <p className="mt-2 text-sm text-white/40">Your password has been reset successfully.</p>
          </div>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-xl bg-[#5355D6] py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(83,85,214,0.3)] transition-all hover:shadow-[0_0_40px_rgba(83,85,214,0.4)]"
          >
            Sign In Now
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5355D6]">Set New Password</p>
            <h1 className="mt-2 text-2xl font-bold text-white">Create a new password</h1>
            <p className="mt-1.5 text-sm text-white/40">Choose something strong — at least 8 characters.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50">New Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
                  className="h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 pr-11 text-sm text-white placeholder-white/20 outline-none transition focus:border-[#5355D6]/50 focus:ring-1 focus:ring-[#5355D6]/30"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : "bg-white/10"}`} />
                    ))}
                  </div>
                  <span className={`text-[10px] font-semibold ${strength === 1 ? "text-red-400" : strength === 2 ? "text-yellow-400" : "text-[#2A8F7A]"}`}>
                    {strengthLabel[strength]}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/50">Confirm Password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Repeat your password"
                className={`h-11 w-full rounded-xl border bg-white/[0.04] px-4 text-sm text-white placeholder-white/20 outline-none transition focus:ring-1 ${
                  confirm && confirm !== password
                    ? "border-red-500/40 focus:border-red-500/50 focus:ring-red-500/20"
                    : "border-white/10 focus:border-[#5355D6]/50 focus:ring-[#5355D6]/30"
                }`}
              />
              {confirm && confirm !== password && (
                <p className="text-[10px] text-red-400">Passwords don't match</p>
              )}
            </div>
          </div>

          {error && <p className="text-xs font-semibold text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || (!!confirm && confirm !== password)}
            className="w-full rounded-xl bg-[#5355D6] py-3 text-sm font-semibold text-white shadow-[0_0_30px_rgba(83,85,214,0.3)] transition-all hover:shadow-[0_0_40px_rgba(83,85,214,0.4)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {loading ? "Updating..." : "Reset Password"}
          </button>

          <p className="text-center text-xs text-white/30">
            Link expired?{" "}
            <button type="button" onClick={() => navigate("/forgot-password")} className="font-semibold text-[#5355D6] hover:text-[#7B7FFF] transition-colors">
              Request a new one
            </button>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}
