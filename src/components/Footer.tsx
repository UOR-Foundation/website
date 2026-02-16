import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="section-dark py-16 md:py-20">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-sm">U</span>
              </div>
              <span className="font-display text-lg font-semibold">UOR Foundation</span>
            </div>
            <p className="text-section-dark-foreground/70 font-body max-w-sm leading-relaxed">
              Building the open standard for universal coordinate systems — enabling interoperability, open science, and the next generation of data infrastructure.
            </p>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold mb-4 tracking-wide uppercase opacity-60">Foundation</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/standard" className="text-section-dark-foreground/70 hover:text-section-dark-foreground transition-colors font-body text-sm">The Standard</Link>
              <Link to="/research" className="text-section-dark-foreground/70 hover:text-section-dark-foreground transition-colors font-body text-sm">Research</Link>
              <Link to="/projects" className="text-section-dark-foreground/70 hover:text-section-dark-foreground transition-colors font-body text-sm">Projects</Link>
              <Link to="/about" className="text-section-dark-foreground/70 hover:text-section-dark-foreground transition-colors font-body text-sm">About Us</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-display text-sm font-semibold mb-4 tracking-wide uppercase opacity-60">Community</h4>
            <nav className="flex flex-col gap-2">
              <a href="https://github.com/UOR-Foundation" target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/70 hover:text-section-dark-foreground transition-colors font-body text-sm">GitHub</a>
              <a href="https://discord.gg/ZwuZaNyuve" target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/70 hover:text-section-dark-foreground transition-colors font-body text-sm">Discord</a>
            </nav>
          </div>
        </div>

        <div className="glow-line mt-12 mb-6" />

        <p className="text-section-dark-foreground/40 text-xs font-body text-center">
          © {new Date().getFullYear()} UOR Foundation. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
