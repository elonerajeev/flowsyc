import { useState, useEffect, lazy, Suspense } from "react";
import { ArrowUp, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "@/components/landing/LandingNavbar";
import Hero from "@/components/landing/Hero";
import TrustedBy from "@/components/landing/TrustedBy";
import LiveActivityTicker from "@/components/landing/LiveActivityTicker";
import FeatureGrid from "@/components/landing/FeatureGrid";

const LiveDashboard = lazy(() => import("@/components/landing/LiveDashboard"));
const ShowcaseDecision = lazy(() => import("@/components/landing/FeatureShowcase").then((m) => ({ default: m.ShowcaseDecision })));
const ShowcaseEfficiency = lazy(() => import("@/components/landing/FeatureShowcase").then((m) => ({ default: m.ShowcaseEfficiency })));
const ShowcaseSatisfaction = lazy(() => import("@/components/landing/FeatureShowcase").then((m) => ({ default: m.ShowcaseSatisfaction })));
const Integrations = lazy(() => import("@/components/landing/Integrations"));
const Metrics = lazy(() => import("@/components/landing/Metrics"));
const ComparisonTable = lazy(() => import("@/components/landing/ComparisonTable"));
const SecurityStrip = lazy(() => import("@/components/landing/SecurityStrip"));
const Testimonials = lazy(() => import("@/components/landing/Testimonials"));
const Pricing = lazy(() => import("@/components/landing/Pricing"));
const FAQ = lazy(() => import("@/components/landing/FAQ"));
const Templates = lazy(() => import("@/components/landing/Templates"));
const CTASection = lazy(() => import("@/components/landing/CTASection"));
const LandingFooter = lazy(() => import("@/components/landing/LandingFooter"));
const HowItWorks = lazy(() => import("@/components/landing/HowItWorks"));
const CustomerLogos = lazy(() => import("@/components/landing/CustomerLogos"));

function SectionLoader() {
  return <div className="h-96 bg-[#030308]" />;
}

function MobileStickyCTA() {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => setShow(window.scrollY > 400);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#0A0F1A]/95 px-4 py-3 backdrop-blur-xl md:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/signup")}
          className="flex-1 rounded-xl bg-[#5355D6] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Start Free — Free Forever
        </button>
        <button
          onClick={() => navigate("/login")}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white/70"
        >
          Log in
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#030308]">
      <LandingNavbar />
      <Hero />
      <TrustedBy />
      <Suspense fallback={<SectionLoader />}>
        <CustomerLogos />
      </Suspense>
      <LiveActivityTicker />
      <Suspense fallback={<SectionLoader />}>
        <LiveDashboard />
      </Suspense>
      <FeatureGrid />
      <Suspense fallback={<SectionLoader />}>
        <ShowcaseDecision />
        <ShowcaseEfficiency />
        <ShowcaseSatisfaction />
        <Integrations />
        <Metrics />
        <HowItWorks />
        <ComparisonTable />
        <SecurityStrip />
        <Testimonials />
        <Pricing />
        <FAQ />
        <Templates />
        <CTASection />
        <LandingFooter />
      </Suspense>

      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 hidden h-10 w-10 items-center justify-center rounded-full bg-[#5355D6] text-white shadow-lg shadow-[#5355D6]/30 transition-all hover:bg-[#5355D6]/90 hover:shadow-[#5355D6]/50 md:flex"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
      <MobileStickyCTA />
    </div>
  );
}
