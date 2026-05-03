import { useNavigate } from "react-router-dom";

interface AuthLayoutProps {
  children: React.ReactNode;
  /** Show back-to-home link */
  showBack?: boolean;
}

export default function AuthLayout({ children, showBack = true }: AuthLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#030308] px-4 py-12">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#5355D6]/8 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Logo header */}
      <div className="relative z-10 mb-8 flex flex-col items-center gap-3">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <img src="/logo.svg" alt="Flowsyc" className="h-10 w-10" />
          <span className="text-2xl font-bold tracking-tight text-white">Flowsyc</span>
        </button>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/25">
          Enterprise CRM Platform
        </p>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5355D6]/50 to-transparent" />
          {children}
        </div>
      </div>

      {/* Back link */}
      {showBack && (
        <button
          onClick={() => navigate("/")}
          className="relative z-10 mt-6 text-xs text-white/25 transition-colors hover:text-white/50"
        >
          ← Back to flowsyc.com
        </button>
      )}
    </div>
  );
}
