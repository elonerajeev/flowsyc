import { useState, useEffect } from "react";
import { Menu, X, Sun, Moon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "@/contexts/ThemeContext";

const navLinks = [
  { label: "Product", id: "product", type: "scroll" as const },
  { label: "Features", id: "features", type: "scroll" as const },
  { label: "Pricing", id: "pricing", type: "scroll" as const },
  { label: "Integrations", id: "integrations", type: "scroll" as const },
  { label: "About", id: "/about", type: "page" as const },
  { label: "Contact", id: "/contact", type: "page" as const },
];

const NAV_LINKS = [
  { label: "Product", id: "product", type: "scroll" as const },
  { label: "Features", id: "features", type: "scroll" as const },
  { label: "Pricing", id: "pricing", type: "scroll" as const },
  { label: "Integrations", id: "integrations", type: "scroll" as const },
  { label: "About", id: "/about", type: "page" as const },
  { label: "Contact", id: "/contact", type: "page" as const },
];

export default function LandingNavbar() {
  const navigate = useNavigate();
  const { mode, toggleMode } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sections = NAV_LINKS
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

  const handleNavClick = (link: (typeof NAV_LINKS)[0]) => {
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
            ? "border-border bg-background/95 backdrop-blur-xl shadow-lg shadow-black/20"
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
            <span className="text-xl font-bold tracking-tight text-foreground">Flowsyc</span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className={`text-sm transition-colors hover:text-foreground ${
                  activeSection === link.id ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-3 md:flex">
            <button
              onClick={toggleMode}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => navigate("/login")}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary/90"
            >
              Get Started
            </button>
          </div>

          {/* Mobile toggle */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              onClick={toggleMode}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 z-40 border-border bg-background/95 px-4 py-6 backdrop-blur-xl md:hidden">
          <div className="mb-4 flex items-center gap-2.5 pb-4 border-b border-border/50">
            <img src="/logo.svg" alt="Flowsyc" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight text-foreground">Flowsyc</span>
          </div>
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className={`text-left text-base transition-colors hover:text-foreground ${
                  activeSection === link.id ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="mt-2 flex flex-col gap-3">
              <button
                onClick={() => { setMobileOpen(false); navigate("/login"); }}
                className="text-sm text-muted-foreground"
              >
                Login
              </button>
              <button
                onClick={() => { setMobileOpen(false); navigate("/signup"); }}
                className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
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
