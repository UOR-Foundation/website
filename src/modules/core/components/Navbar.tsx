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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
          mobileOpen
            ? "bg-background"
            : scrolled
              ? "bg-background/60 backdrop-blur-2xl backdrop-saturate-150"
              : "bg-transparent"
        }`}
      >
        {/* SpaceX-style: generous horizontal padding, taller bar, items spread edge-to-edge */}
        <div className="flex items-center justify-between h-[5rem] md:h-[4.5rem] pt-3 md:pt-4 px-6 md:px-10 lg:px-14">
          {/* Left group: Logo + Nav links (SpaceX-style) */}
          <div className="flex items-center gap-8 lg:gap-12 relative z-[60]">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src={uorIcon}
                alt="UOR Foundation"
                className="w-10 h-10 md:w-8 md:h-8 object-contain invert brightness-[100] transition-all duration-300"
              />
              <span className="font-display text-[16px] md:text-[clamp(13px,1vw,15px)] font-semibold tracking-[0.18em] uppercase text-foreground">
                UOR Foundation
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 lg:gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-3 lg:px-5 py-2 text-[clamp(13px,1vw,16px)] font-semibold uppercase tracking-[0.18em] transition-colors duration-200 ${
                    location.pathname === item.href
                      ? "text-foreground"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right group: social icons + donate CTA */}
          <div className="hidden md:flex items-center gap-5">
            <div className="flex items-center gap-1">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="p-1.5 text-foreground/50 hover:text-foreground transition-colors duration-200" aria-label="Discord">
                <DiscordIcon size={17} />
              </a>
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="p-1.5 text-foreground/50 hover:text-foreground transition-colors duration-200" aria-label="GitHub">
                <Github size={17} />
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="p-1.5 text-foreground/50 hover:text-foreground transition-colors duration-200" aria-label="LinkedIn">
                <Linkedin size={17} />
              </a>
            </div>
            <button
              onClick={() => setDonateOpen(true)}
              className="px-5 py-2.5 text-[clamp(11px,0.8vw,13px)] font-semibold uppercase tracking-[0.2em] border border-foreground/20 text-foreground/70 hover:border-foreground/60 hover:text-foreground transition-all duration-300 inline-flex items-center cursor-pointer"
            >
              <Heart size={10} fill="currentColor" strokeWidth={0} className="mr-2 opacity-60" />
              Donate
            </button>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-3 -mr-1 text-foreground transition-transform duration-200 active:scale-90 relative z-[60]"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Full-screen mobile menu */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-background transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="h-[5rem] shrink-0" />

          <nav className="flex-[1.618] flex flex-col items-center justify-center gap-1 px-8">
            {navItems.map((item, idx) => (
              <Link
                key={item.href}
                to={item.href}
                className={`py-3 px-6 text-[15px] font-semibold uppercase tracking-[0.18em] font-body text-center transition-all duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  mobileOpen
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-3"
                } ${
                  location.pathname === item.href
                    ? "text-foreground"
                    : "text-foreground/60 active:text-foreground"
                }`}
                style={{ transitionDelay: mobileOpen ? `${80 + idx * 50}ms` : "0ms" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

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
              className="w-full max-w-xs py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] font-body text-center border border-foreground/20 text-foreground/80 flex items-center justify-center gap-2.5 cursor-pointer active:scale-[0.98] transition-all"
            >
              <Heart size={12} fill="currentColor" strokeWidth={0} className="opacity-60" />
              Donate
            </button>
            <div className="flex items-center justify-center gap-8 py-2">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="p-2.5 text-foreground/50 hover:text-foreground transition-colors" aria-label="Discord">
                <DiscordIcon size={22} />
              </a>
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="p-2.5 text-foreground/50 hover:text-foreground transition-colors" aria-label="GitHub">
                <Github size={22} />
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="p-2.5 text-foreground/50 hover:text-foreground transition-colors" aria-label="LinkedIn">
                <Linkedin size={22} />
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
