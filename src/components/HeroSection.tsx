const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden">
      <div className="container py-24 md:py-36 lg:py-44">
        <div className="max-w-4xl mx-auto text-center">
          <p
            className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-8 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.1s" }}
          >
            Introducing UOR
          </p>
          <h1
            className="font-display text-[2.75rem] md:text-[4rem] lg:text-[5rem] font-bold leading-[1.05] tracking-tight text-foreground text-balance animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            The Universal Coordinate System for Information.
          </h1>
          <p
            className="mt-8 md:mt-10 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.45s" }}
          >
            Open infrastructure for the semantic web, open science, and frontier research.
            Data referenced by what it{" "}
            <em className="not-italic text-foreground/70">is</em>, not where it lives.
          </p>
          <div
            className="mt-10 md:mt-14 flex flex-wrap justify-center gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.6s" }}
          >
            <a
              href="https://github.com/UOR-Foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
            >
              Explore on GitHub
            </a>
            <a href="#pillars" className="btn-outline">
              Learn More
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
