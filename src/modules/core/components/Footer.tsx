import { Link } from "react-router-dom";
import { Github, Linkedin } from "lucide-react";
import uorIcon from "@/assets/uor-icon-new.png";
import DiscordIcon from "@/modules/core/components/icons/DiscordIcon";
import { navItems } from "@/data/nav-items";
import { DISCORD_URL, GITHUB_ORG_URL, LINKEDIN_URL } from "@/data/external-links";

const Footer = () => {
  return (
    <footer className="py-section-sm bg-section-dark">
      <div className="container max-w-[1400px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={uorIcon}
              alt="UOR Foundation"
              className="w-7 h-7 object-contain invert relative z-10"
            />
            <span className="font-body font-semibold tracking-[0.12em] uppercase text-foreground/80 text-fluid-label">
              The UOR Foundation
            </span>
          </Link>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            <nav className="flex items-center gap-5 md:gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-foreground/50 hover:text-foreground transition-colors duration-300 font-body uppercase tracking-[0.12em] text-fluid-label"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="text-foreground/50 hover:text-foreground transition-colors duration-300" aria-label="GitHub">
                <Github size={16} />
              </a>
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-foreground/50 hover:text-foreground transition-colors duration-300" aria-label="Discord">
                <DiscordIcon className="w-4 h-4" />
              </a>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="text-foreground/50 hover:text-foreground transition-colors duration-300" aria-label="LinkedIn">
                <Linkedin size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="rule-glow mt-golden-lg mb-golden-sm" />
        <p className="text-foreground/40 text-fluid-caption font-body text-right uppercase tracking-[0.1em]">
          © {new Date().getFullYear()} The UOR Foundation
        </p>
      </div>
    </footer>
  );
};

export default Footer;
