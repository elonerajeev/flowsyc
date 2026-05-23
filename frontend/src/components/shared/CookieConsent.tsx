import { useState, useEffect } from "react";
import { X } from "lucide-react";

const COOKIE_CONSENT_KEY = "flowsyc-cookie-consent";

type ConsentChoice = "accepted" | "rejected" | null;

export default function CookieConsent() {
  const [choice, setChoice] = useState<ConsentChoice>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(COOKIE_CONSENT_KEY) as ConsentChoice;
    if (!saved) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
    setChoice(saved);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted");
    setChoice("accepted");
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "rejected");
    setChoice("rejected");
    setVisible(false);
  };

  if (!visible || choice !== null) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[200] p-4">
      <div className="mx-auto max-w-5xl">
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0A0F1A]/95 backdrop-blur-xl shadow-2xl shadow-black/40">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#5355D6]/50 to-transparent" />
          <div className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">We value your privacy</p>
              <p className="mt-1 text-xs text-white/40 max-w-2xl">
                We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. See our{" "}
                <a href="/privacy" className="text-[#5355D6] underline hover:brightness-125">Privacy Policy</a>.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                onClick={handleReject}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-xs font-semibold text-white/60 transition hover:bg-white/[0.06] hover:text-white/80"
              >
                Reject All
              </button>
              <button
                onClick={handleAccept}
                className="rounded-xl bg-[#5355D6] px-5 py-2.5 text-xs font-semibold text-white shadow-lg shadow-[#5355D6]/20 transition hover:brightness-105"
              >
                Accept All
              </button>
              <button
                onClick={handleReject}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/20 transition hover:bg-white/[0.05] hover:text-white/40"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
