import { Link } from "react-router-dom";
import { Github, Linkedin } from "lucide-react";
import uorIcon from "@/assets/uor-icon-new.png";
import DiscordIcon from "@/modules/core/components/icons/DiscordIcon";
import { navItems } from "@/data/nav-items";
import { DISCORD_URL, GITHUB_ORG_URL, LINKEDIN_URL } from "@/data/external-links";

const Footer = () => {
  return (
    <footer className="py-section-sm bg-section-dark">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <Link to="/" className="flex items-center gap-4 md:gap-5">
            <img
              src={uorIcon}
              alt="UOR Foundation"
              className="w-14 h-14 md:w-16 md:h-16 lg:w-[4.5rem] lg:h-[4.5rem] object-contain invert drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] relative z-10"
            />
            <span className="font-display font-bold tracking-[0.2em] uppercase text-foreground text-xl md:text-2xl lg:text-3xl">
              The UOR Foundation
            </span>
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 md:gap-6">
              {navItems.filter((item) => !item.isCta).map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-foreground/50 hover:text-foreground active:text-foreground/70 transition-colors duration-150 ease-out font-body uppercase tracking-[0.12em] text-fluid-label"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Desktop: icon social links */}
            <div className="hidden md:flex items-center gap-5">
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground/50 hover:text-foreground active:scale-90 transition-all duration-150 ease-out" aria-label="GitHub">
                <Github size={18} />
              </a>
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground/50 hover:text-foreground active:scale-90 transition-all duration-150 ease-out" aria-label="Discord">
                <DiscordIcon className="w-[18px] h-[18px]" />
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="p-2 text-foreground/50 hover:text-foreground active:scale-90 transition-all duration-150 ease-out" aria-label="LinkedIn">
                <Linkedin size={18} />
              </a>
            </div>

            {/* Mobile: text social links (47G editorial style) */}
            <div className="flex md:hidden items-center gap-6">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/40 hover:text-foreground transition-colors">
                Discord
              </a>
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/40 hover:text-foreground transition-colors">
                GitHub
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/40 hover:text-foreground transition-colors">
                LinkedIn
              </a>
            </div>
          </div>
        </div>

        <div className="relative h-px w-full mt-golden-lg mb-golden-sm" aria-hidden="true">
          <div className="absolute inset-0 bg-foreground/[0.06]" />
          {[2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47].map((p) => (
            <div
              key={p}
              className="absolute top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/60"
              style={{ left: `${p}%` }}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <a
            href="/llms.md"
            className="text-foreground/40 hover:text-foreground/60 transition-colors duration-150 ease-out text-fluid-caption font-body uppercase tracking-[0.1em]"
          >
            Open Standard
          </a>
          <p className="text-foreground/40 text-fluid-caption font-body uppercase tracking-[0.1em]">
            © {new Date().getFullYear()} The UOR Foundation
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
