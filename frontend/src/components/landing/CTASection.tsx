import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="bg-[#0A0F1A] px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#111827] to-[#0D1117] px-6 py-16 text-center sm:px-12 sm:py-20">
          {/* Glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_50%_at_50%_0%,rgba(83,85,214,0.12),transparent)]" />
          {/* Top accent */}
          <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#5355D6]/40 to-transparent" />

          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-white sm:text-4xl md:text-5xl">
              Start Your Free{" "}
              <span className="text-[#5355D6]">Trial Today</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm text-white/40 sm:text-base">
              No credit card required. Get full access to all features for 14 days.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/signup")}
                className="group inline-flex items-center gap-2 rounded-xl bg-[#5355D6] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#5355D6]/20 transition-all hover:bg-[#5355D6]/90"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10"
              >
                Log In
              </button>
            </div>
          </div>

          {/* Arc */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg viewBox="0 0 800 60" fill="none" className="w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="ctaArc" x1="400" y1="0" x2="400" y2="60" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#5355D6" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#5355D6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 60C200 10 600 10 800 60" stroke="url(#ctaArc)" strokeWidth="1.5" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
