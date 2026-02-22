import { Link } from "react-router-dom";
import uorIcon from "@/assets/uor-icon-new.png";
import UorVerification from "@/modules/core/components/UorVerification";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_GOVERNANCE_URL, GITHUB_RESEARCH_URL } from "@/data/external-links";

const Footer = () => {
  return (
    <footer className="section-dark py-14 md:py-20">
      <div className="container">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="sm:col-span-2 md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="relative w-7 h-7 flex items-center justify-center footer-icon-glow">
                <img src={uorIcon} alt="UOR Foundation" className="w-7 h-7 object-contain invert relative z-10" />
              </div>
              <span className="font-display text-base font-semibold">The UOR Foundation</span>
            </div>
            <p className="text-section-dark-foreground/55 font-body max-w-sm leading-relaxed text-base">
              One permanent address for every piece of data. Open source. Open standard.
            </p>
          </div>

          <div>
            <h4 className="font-body text-sm font-semibold mb-5 tracking-widest uppercase text-section-dark-foreground/40">Foundation</h4>
            <nav className="flex flex-col gap-3">
              <Link to="/standard" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">UOR Framework</Link>
              <Link to="/research" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Community</Link>
              <Link to="/projects" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Projects</Link>
              <a href={GITHUB_GOVERNANCE_URL} target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Governance</a>
              <a href={GITHUB_RESEARCH_URL} target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Research</a>
            </nav>
          </div>

          <div>
            <h4 className="font-body text-sm font-semibold mb-5 tracking-widest uppercase text-section-dark-foreground/40">Community</h4>
            <nav className="flex flex-col gap-3">
              <a href={GITHUB_ORG_URL} target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">GitHub</a>
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-300 font-body text-base">Discord</a>
            </nav>
          </div>
        </div>

        <div className="h-px w-full bg-section-dark-foreground/10 mt-14 mb-6" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-section-dark-foreground/30 text-base font-body">
            © {new Date().getFullYear()} UOR Foundation. All rights reserved.
          </p>
          <UorVerification />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
