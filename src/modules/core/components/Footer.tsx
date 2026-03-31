import { Link } from "react-router-dom";
import { Github, Linkedin } from "lucide-react";
import uorIcon from "@/assets/uor-icon-new.png";
import DiscordIcon from "@/modules/core/components/icons/DiscordIcon";
import { navItems } from "@/data/nav-items";
import { DISCORD_URL, GITHUB_ORG_URL, LINKEDIN_URL } from "@/data/external-links";

const Footer = () => {
  return (
    <footer className="section-dark py-10 md:py-14">
      <div className="container max-w-6xl">
        {/* Main row: logo left, nav + socials right */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={uorIcon}
              alt="UOR Foundation"
              className="w-7 h-7 object-contain invert relative z-10"
            />
            <span className="font-display text-xl md:text-2xl font-bold tracking-tight text-section-dark-foreground">
              The UOR Foundation
            </span>
          </Link>

          {/* Nav links + social icons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 sm:gap-8">
            <nav className="flex items-center gap-5 md:gap-6">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className="text-section-dark-foreground/55 hover:text-section-dark-foreground transition-colors duration-300 font-body text-sm"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <a
                href={GITHUB_ORG_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-section-dark-foreground/15 flex items-center justify-center text-section-dark-foreground/40 hover:text-section-dark-foreground hover:border-section-dark-foreground/30 transition-all duration-300"
                aria-label="GitHub"
              >
                <Github size={16} />
              </a>
              <a
                href={DISCORD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-section-dark-foreground/15 flex items-center justify-center text-section-dark-foreground/40 hover:text-section-dark-foreground hover:border-section-dark-foreground/30 transition-all duration-300"
                aria-label="Discord"
              >
                <DiscordIcon className="w-4 h-4" />
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-section-dark-foreground/15 flex items-center justify-center text-section-dark-foreground/40 hover:text-section-dark-foreground hover:border-section-dark-foreground/30 transition-all duration-300"
                aria-label="LinkedIn"
              >
                <Linkedin size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Divider + copyright */}
        <div className="h-px w-full bg-section-dark-foreground/8 mt-8 md:mt-10 mb-4 md:mb-5" />
        <p className="text-section-dark-foreground/25 text-sm font-body text-right">
          © {new Date().getFullYear()} The UOR Foundation
        </p>
      </div>
    </footer>
  );
};

export default Footer;
