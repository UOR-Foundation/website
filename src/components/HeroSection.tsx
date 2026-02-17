const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden">
      <div className="container py-16 md:py-24 lg:py-28">
        {/* Centered editorial headline */}
        <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
          <span className="inline-block px-4 py-1.5 rounded-full border border-border/40 bg-muted/40 text-xs font-medium tracking-widest uppercase text-muted-foreground mb-6">
            open standard.
          </span>
          <h1 className="font-display text-[2.5rem] md:text-[3.5rem] lg:text-[4.25rem] font-bold leading-[1.08] tracking-tight text-foreground text-balance">
            The Universal Coordinate System for Information
          </h1>
          <p className="mt-6 md:mt-8 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto font-body">
            Open infrastructure for the semantic web, open science, and frontier research. Data referenced by what it <em className="not-italic text-foreground/70">is</em>, not where it lives.
          </p>
          <div className="mt-8 md:mt-10 flex flex-wrap justify-center gap-3">
            <a
              href="https://github.com/UOR-Foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
            >
              Explore on GitHub
            </a>
            <a
              href="#pillars"
              className="px-7 py-3 rounded-full border border-pill text-foreground font-medium text-sm hover:border-foreground/25 transition-all"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
