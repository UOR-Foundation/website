import heroSphere from "@/assets/hero-sphere.png";

const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden">
      <div className="container py-20 md:py-28 lg:py-36">
        {/* Centered editorial headline */}
        <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
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

        {/* Hero image — centered below headline */}
        <div className="flex justify-center mt-12 md:mt-16 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <img
            src={heroSphere}
            alt="Universal coordinate system visualization — interconnected geometric nodes forming a crystalline sphere"
            className="w-full max-w-sm md:max-w-lg lg:max-w-2xl opacity-90"
          />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
