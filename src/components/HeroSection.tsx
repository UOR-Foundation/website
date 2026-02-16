import heroSphere from "@/assets/hero-sphere.png";

const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden">
      <div className="container py-24 md:py-36">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="animate-fade-in-up">
            <p className="text-sm font-medium tracking-widest uppercase text-primary mb-6 font-body">
              Open Standard
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] tracking-tight text-foreground text-balance">
              The Universal Coordinate System for Information
            </h1>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-lg font-body">
              Open infrastructure for the semantic web, open science, and frontier research. Data referenced by what it <em className="not-italic text-foreground/70">is</em>, not where it lives.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
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

          <div className="flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <img
              src={heroSphere}
              alt="Universal coordinate system visualization — interconnected geometric nodes forming a crystalline sphere"
              className="w-full max-w-md opacity-90"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;