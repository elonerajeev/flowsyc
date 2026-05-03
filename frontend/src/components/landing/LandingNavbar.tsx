import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LandingNavbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  const navLinks = [
    { label: "Product", id: "product", type: "scroll" as const },
    { label: "Features", id: "features", type: "scroll" as const },
    { label: "Pricing", id: "pricing", type: "scroll" as const },
    { label: "Integrations", id: "integrations", type: "scroll" as const },
    { label: "About", id: "/about", type: "page" as const },
    { label: "Contact", id: "/contact", type: "page" as const },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sections = navLinks
      .filter((l) => l.type === "scroll")
      .map((l) => l.id)
      .map((id) => document.getElementById(id))
      .filter(Boolean) as Element[];

    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px" }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileOpen(false);
  };

  const handleNavClick = (link: (typeof navLinks)[0]) => {
    if (link.type === "page") {
      navigate(link.id);
      setMobileOpen(false);
    } else {
      scrollToSection(link.id);
    }
  };

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled
            ? "border-b border-white/10 bg-[#0A0F1A]/95 backdrop-blur-xl shadow-lg shadow-black/20"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5"
          >
            <img src="/logo.svg" alt="Flowsyc" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight text-white">Flowsyc</span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className={`text-sm transition-colors hover:text-white ${
                  activeSection === link.id ? "text-white" : "text-white/50"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-white/60 transition-colors hover:text-white"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="rounded-full bg-[#5355D6] px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-[#5355D6]/90"
            >
              Get Started
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-lg p-2 text-white/60 transition-colors hover:text-white md:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-white/10 bg-[#0A0F1A]/95 px-4 py-6 backdrop-blur-xl md:hidden">
          <div className="mb-4 flex items-center gap-2.5 pb-4 border-b border-white/5">
            <img src="/logo.svg" alt="Flowsyc" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight text-white">Flowsyc</span>
          </div>
          <nav className="flex flex-col gap-4">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className={`text-left text-base transition-colors hover:text-white ${
                  activeSection === link.id ? "text-white" : "text-white/50"
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="mt-2 flex flex-col gap-3">
              <button
                onClick={() => { setMobileOpen(false); navigate("/login"); }}
                className="text-sm text-white/60"
              >
                Login
              </button>
              <button
                onClick={() => { setMobileOpen(false); navigate("/signup"); }}
                className="rounded-full bg-[#5355D6] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Get Started
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
