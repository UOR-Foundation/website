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
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out ${
        isDark ? "dark" : ""
      } ${
        scrolled
          ? "bg-background/90 backdrop-blur-2xl backdrop-saturate-150 border-b border-border/10 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-[4.5rem] md:h-24">
        <Link to="/" className="flex items-center gap-2.5 group">
          <img 
            src={uorIcon} 
            alt="UOR Foundation" 
            className={`w-9 h-9 md:w-8 md:h-8 object-contain transition-all duration-300 ${isDark ? "invert brightness-[100]" : ""}`} 
          />
          <span className={`font-display text-[0.9375rem] md:text-base font-semibold tracking-tight ${isDark ? "text-white" : "text-foreground"}`}>The UOR Foundation</span>
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

      {/* Full-screen mobile menu overlay */}
      <div
        className={`md:hidden fixed inset-0 top-[4.5rem] z-50 transition-all duration-300 ease-out ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute inset-0 bg-background/98 backdrop-blur-xl" />
        <div
          className={`relative h-full flex flex-col px-6 pt-6 pb-[env(safe-area-inset-bottom,1.5rem)] transition-transform duration-300 ease-out ${
            mobileOpen ? "translate-y-0" : "-translate-y-4"
          }`}
        >
          {/* Nav links */}
          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`py-4 px-4 rounded-xl text-lg font-medium font-body transition-colors ${
                  location.pathname === item.href
                    ? "text-primary border-l-2 border-primary bg-primary/5"
                    : "text-foreground/80 active:bg-muted"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Bottom section — anchored */}
          <div className="mt-auto pt-6 flex flex-col gap-4 border-t border-border/30">
            <button
              onClick={() => { setDonateOpen(true); setMobileOpen(false); }}
              className="py-3.5 px-4 rounded-xl text-base font-semibold font-body text-center bg-primary text-primary-foreground flex items-center justify-center gap-2 cursor-pointer"
            >
              <Heart size={16} fill="currentColor" strokeWidth={0} />
              Donate
            </button>
            <div className="flex items-center justify-center gap-6 py-3">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="Discord">
                <DiscordIcon size={22} />
              </a>
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub">
                <Github size={22} />
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-foreground hover:text-foreground transition-colors" aria-label="LinkedIn">
                <Linkedin size={22} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <DonatePopup open={donateOpen} onOpenChange={setDonateOpen} />
    </header>
  );
};

export default Navbar;
