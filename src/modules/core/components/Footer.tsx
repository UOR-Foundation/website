import { Link } from "react-router-dom";
import uorIcon from "@/assets/uor-icon-new.png";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_GOVERNANCE_URL, GITHUB_RESEARCH_URL, GITHUB_FRAMEWORK_DOCS_URL } from "@/data/external-links";

const Footer = () => {
  return (
    <footer className="section-dark py-8 md:py-14">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="relative w-7 h-7 flex items-center justify-center footer-icon-glow">
                <img src={uorIcon} alt="UOR Foundation" className="w-7 h-7 object-contain invert relative z-10" />
              </div>
              <span className="font-display text-base font-semibold">The UOR Foundation</span>
            </div>
            <p className="text-section-dark-foreground/55 font-body max-w-sm leading-relaxed text-base">
              Content-addressed infrastructure for the open web.
            </p>
          </div>

          <div>
            <h4 className="font-body text-sm font-semibold mb-5 tracking-widest uppercase text-section-dark-foreground/40">Foundation</h4>
            <nav className="flex flex-col gap-3">
              <Link to="/about" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">About</Link>
              <Link to="/standard" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Framework</Link>
              <Link to="/projects" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Projects</Link>
              <a href={GITHUB_GOVERNANCE_URL} target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Governance</a>
            </nav>
          </div>

          <div>
            <h4 className="font-body text-sm font-semibold mb-5 tracking-widest uppercase text-section-dark-foreground/40">Resources</h4>
            <nav className="flex flex-col gap-3">
              <a href={GITHUB_FRAMEWORK_DOCS_URL} target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Getting Started</a>
              <a href={GITHUB_RESEARCH_URL} target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Research Papers</a>
            </nav>
          </div>

          <div>
            <h4 className="font-body text-sm font-semibold mb-5 tracking-widest uppercase text-section-dark-foreground/40">Community</h4>
            <nav className="flex flex-col gap-3">
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">GitHub</a>
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Discord</a>
              <Link to="/research" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Community</Link>
            </nav>
          </div>
        </div>

        <div className="h-px w-full bg-section-dark-foreground/10 mt-10 md:mt-14 mb-5 md:mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-section-dark-foreground/30 text-base font-body">
            © {new Date().getFullYear()} UOR Foundation. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
