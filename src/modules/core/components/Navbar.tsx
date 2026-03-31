import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X, Heart, Github, Linkedin } from "lucide-react";
import uorIcon from "@/assets/uor-icon-new.png";
import DonatePopup from "@/modules/donate/components/DonatePopup";
import { navItems } from "@/data/nav-items";
import { DISCORD_URL, GITHUB_ORG_URL, LINKEDIN_URL } from "@/data/external-links";
import DiscordIcon from "@/modules/core/components/icons/DiscordIcon";

const Navbar = ({ isDark: propIsDark }: { isDark?: boolean }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  const isDark = propIsDark || location.pathname.startsWith('/developers');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          isDark ? "dark" : ""
        } ${
          mobileOpen
            ? "bg-background"
            : scrolled
              ? "bg-background/90 backdrop-blur-2xl backdrop-saturate-150 border-b border-border/10 shadow-sm"
              : "bg-transparent"
        }`}
      >
        <div className="container flex items-center justify-between h-[5rem] md:h-24">
          <Link to="/" className="flex items-center gap-3 group relative z-[60]">
            <img
              src={uorIcon}
              alt="UOR Foundation"
              className={`w-10 h-10 md:w-8 md:h-8 object-contain transition-all duration-300 ${isDark && !mobileOpen ? "invert brightness-[100]" : ""}`}
            />
            <span className={`font-display text-base md:text-base font-semibold tracking-tight ${isDark && !mobileOpen ? "text-white" : "text-foreground"}`}>The UOR Foundation</span>
          </Link>

          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`nav-pill ${location.pathname === item.href ? "nav-pill-active" : ""}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Discord">
                <DiscordIcon size={20} />
              </a>
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <Github size={20} />
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="p-1.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
            </div>
            <button
              onClick={() => setDonateOpen(true)}
              className="btn-primary !py-2 !px-5 !text-sm inline-flex items-center cursor-pointer"
            >
              <Heart size={14} fill="currentColor" strokeWidth={0} className="mr-1.5" />
              Donate
            </button>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-3 -mr-1 text-foreground transition-transform duration-200 active:scale-90 relative z-[60]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Full-screen mobile menu — covers entire viewport */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-background transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* 
          Golden ratio layout: navbar (4.5rem) + nav links (≈61.8%) + bottom actions (≈38.2%)
          Using flex with justified spacing for natural golden distribution
        */}
        <div className="h-full flex flex-col">
          {/* Navbar spacer */}
          <div className="h-[4.5rem] shrink-0" />

          {/* Nav links — centered in the upper golden section */}
          <nav className="flex-[1.618] flex flex-col items-center justify-center gap-2 px-8">
            {navItems.map((item, idx) => (
              <Link
                key={item.href}
                to={item.href}
                className={`py-3.5 px-6 rounded-2xl text-xl font-medium font-body text-center transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  mobileOpen
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3"
                } ${
                  location.pathname === item.href
                    ? "text-primary bg-primary/8 font-semibold"
                    : "text-foreground/70 active:bg-muted/60"
                }`}
                style={{ transitionDelay: mobileOpen ? `${80 + idx * 50}ms` : "0ms" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Bottom actions — lower golden section */}
          <div
            className={`flex-1 flex flex-col items-center justify-end px-8 pb-[max(2rem,env(safe-area-inset-bottom,2rem))] gap-5 transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              mobileOpen
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: mobileOpen ? "280ms" : "0ms" }}
          >
            <button
              onClick={() => { setDonateOpen(true); setMobileOpen(false); }}
              className="w-full max-w-xs py-4 rounded-2xl text-base font-semibold font-body text-center bg-primary text-primary-foreground flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <Heart size={16} fill="currentColor" strokeWidth={0} />
              Donate
            </button>
            <div className="flex items-center justify-center gap-8 py-2">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="p-2.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="Discord">
                <DiscordIcon size={24} />
              </a>
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="p-2.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <Github size={24} />
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="p-2.5 text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
                <Linkedin size={24} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <DonatePopup open={donateOpen} onOpenChange={setDonateOpen} />
    </>
  );
};

export default Navbar;
