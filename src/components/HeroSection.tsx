const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden">
      <div className="container py-24 md:py-36 lg:py-44">
        {/* Centered editorial headline — foresight.org inspired */}
        <div className="max-w-4xl mx-auto text-center animate-fade-in-up">
          <p className="text-sm font-body font-medium tracking-widest uppercase text-muted-foreground/70 mb-8">
            open standard.
          </p>
          <h1 className="font-display text-[2.75rem] md:text-[4rem] lg:text-[5rem] font-bold leading-[1.05] tracking-tight text-foreground text-balance">
            The Universal Coordinate System for Information.
          </h1>
          <p className="mt-8 md:mt-10 text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto font-body">
            Open infrastructure for the semantic web, open science, and frontier research. Data referenced by what it <em className="not-italic text-foreground/70">is</em>, not where it lives.
          </p>
          <div className="mt-10 md:mt-14 flex flex-wrap justify-center gap-3">
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
