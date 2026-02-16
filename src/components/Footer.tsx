import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="section-dark py-16 md:py-20">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-xs">U</span>
              </div>
              <span className="font-display text-base font-semibold">UOR Foundation</span>
            </div>
            <p className="text-section-dark-foreground/55 font-body max-w-sm leading-relaxed text-sm">
              The open standard for universal data infrastructure.
            </p>
          </div>

          <div>
            <h4 className="font-body text-xs font-semibold mb-4 tracking-widest uppercase text-section-dark-foreground/40">Foundation</h4>
            <nav className="flex flex-col gap-2.5">
              <Link to="/standard" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors font-body text-sm">The Standard</Link>
              <Link to="/research" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors font-body text-sm">Research</Link>
              <Link to="/projects" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors font-body text-sm">Projects</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-body text-xs font-semibold mb-4 tracking-widest uppercase text-section-dark-foreground/40">Community</h4>
            <nav className="flex flex-col gap-2.5">
              <a href="https://github.com/UOR-Foundation" target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors font-body text-sm">GitHub</a>
              <a href="https://discord.gg/ZwuZaNyuve" target="_blank" rel="noopener noreferrer" className="text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors font-body text-sm">Discord</a>
            </nav>
          </div>
        </div>

        <div className="h-px w-full bg-section-dark-foreground/10 mt-14 mb-6" />

        <p className="text-section-dark-foreground/30 text-xs font-body text-center">
          © {new Date().getFullYear()} UOR Foundation. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;