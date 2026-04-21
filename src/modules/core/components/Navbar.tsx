import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { Menu, X, Github, Linkedin } from "lucide-react";
import uorIcon from "@/assets/uor-icon-new.png";
import { navItems } from "@/data/nav-items";
import { DISCORD_URL, GITHUB_ORG_URL, LINKEDIN_URL } from "@/data/external-links";
import DiscordIcon from "@/modules/core/components/icons/DiscordIcon";

const Navbar = ({ isDark: propIsDark }: { isDark?: boolean }) => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    let last = scrolled;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const next = window.scrollY > 20;
        if (next !== last) {
          last = next;
          setScrolled(next);
        }
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const primaryNavItems = navItems.filter(item => !(item as any).isCta);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,backdrop-filter] duration-300 ease-out ${
          mobileOpen
            ? "bg-background"
            : scrolled
              ? "bg-background/60 backdrop-blur-2xl backdrop-saturate-150"
              : "bg-transparent"
        }`}
      >
        <div className="flex items-center justify-between h-[4.5rem] md:h-[clamp(5rem,6.5vw,7rem)] pt-4 md:pt-[clamp(1.25rem,2vw,2.5rem)] px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          {/* Left group: Logo + Nav links */}
          <div className="flex items-center gap-8 lg:gap-[clamp(2rem,2.5vw,4rem)] relative z-[60]">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src={uorIcon}
                alt="UOR Foundation"
                width={40}
                height={40}
                fetchPriority="high"
                decoding="async"
                className="w-10 h-10 md:w-[clamp(2.25rem,2.6vw,3.25rem)] md:h-[clamp(2.25rem,2.6vw,3.25rem)] object-contain invert brightness-[300] contrast-[1.5] drop-shadow-[0_0_1px_rgba(255,255,255,0.4)] transition-all duration-300"
              />
              <span className="md:hidden font-display text-[14px] font-bold tracking-[0.18em] uppercase text-foreground">
                The UOR Foundation
              </span>
              <span className="hidden md:inline font-display text-[clamp(16px,1.25vw,22px)] font-semibold tracking-[0.18em] uppercase text-foreground">
                The UOR Foundation
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {primaryNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-3 lg:px-[clamp(1rem,1.2vw,1.75rem)] py-2 text-[clamp(15px,1.1vw,21px)] font-semibold uppercase tracking-[0.18em] transition-colors duration-150 ease-out ${
                    location.pathname === item.href
                      ? "text-foreground"
                      : "text-foreground/60 hover:text-foreground active:text-foreground/80"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right group: social icons + Contribute CTA (desktop) */}
          <div className="hidden md:flex items-center">
            <div className="flex items-center gap-1.5">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground/50 hover:text-foreground active:scale-90 transition-all duration-150 ease-out" aria-label="Discord">
                <DiscordIcon className="w-[clamp(21px,1.5vw,28px)] h-[clamp(21px,1.5vw,28px)]" />
              </a>
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground/50 hover:text-foreground active:scale-90 transition-all duration-150 ease-out" aria-label="GitHub">
                <Github className="w-[clamp(21px,1.5vw,28px)] h-[clamp(21px,1.5vw,28px)]" />
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground/50 hover:text-foreground active:scale-90 transition-all duration-150 ease-out" aria-label="LinkedIn">
                <Linkedin className="w-[clamp(21px,1.5vw,28px)] h-[clamp(21px,1.5vw,28px)]" />
              </a>
            </div>
          </div>

          {/* Mobile: Hamburger / X icon toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-foreground/70 active:text-foreground transition-colors duration-200 relative z-[60] p-2"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Full-screen mobile menu — 47G editorial style */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-background" />

        <div className="relative h-full flex flex-col px-8">
          {/* Spacer for header */}
          <div className="h-[4.5rem] shrink-0" />

          {/* Primary nav links — large, left-aligned, editorial */}
          <nav className="flex flex-col items-start pt-10 gap-1">
            {primaryNavItems.map((item, idx) => (
              <Link
                key={item.href}
                to={item.href}
                className={`py-3 text-[28px] font-display font-bold uppercase tracking-[0.08em] transition-all duration-[350ms] ease-out ${
                  mobileOpen
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3"
                } ${
                  location.pathname === item.href
                    ? "text-foreground"
                    : "text-foreground/50 active:text-foreground"
                }`}
                style={{ transitionDelay: mobileOpen ? `${80 + idx * 50}ms` : "0ms" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Divider */}
          <div
            className={`w-12 h-px bg-foreground/15 mt-8 mb-6 transition-all duration-[350ms] ${
              mobileOpen ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: mobileOpen ? "350ms" : "0ms" }}
          />

          {/* Spacer */}
          <div className="flex-1" />

          {/* Social links as text labels */}
          <div
            className={`flex items-center gap-8 pb-5 transition-all duration-[350ms] ${
              mobileOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
            }`}
            style={{ transitionDelay: mobileOpen ? "420ms" : "0ms" }}
          >
            <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-[14px] font-medium uppercase tracking-[0.18em] text-foreground/55 hover:text-foreground transition-colors">
              Discord
            </a>
            <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-[14px] font-medium uppercase tracking-[0.18em] text-foreground/55 hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-[14px] font-medium uppercase tracking-[0.18em] text-foreground/55 hover:text-foreground transition-colors">
              LinkedIn
            </a>
          </div>

          {/* Copyright at bottom */}
          <p
            className={`font-mono text-[13px] uppercase tracking-[0.18em] text-foreground/40 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] transition-all duration-[350ms] ${
              mobileOpen ? "opacity-100" : "opacity-0"
            }`}
            style={{ transitionDelay: mobileOpen ? "460ms" : "0ms" }}
          >
            © {new Date().getFullYear()} The UOR Foundation
          </p>
        </div>
      </div>
    </>
  );
};

export default Navbar;
