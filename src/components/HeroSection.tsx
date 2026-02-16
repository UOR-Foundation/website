import heroSphere from "@/assets/hero-sphere.png";

const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden">
      <div className="container py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground text-balance">
              The Open Standard for{" "}
              <span className="text-primary">Universal Coordinates</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl font-body">
              Building interoperable infrastructure for the semantic web, open science, and next-generation video technology — together.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://github.com/UOR-Foundation"
                target="_blank"
                rel="noopener noreferrer"
                className="px-7 py-3 rounded-full bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
              >
                Explore on GitHub
              </a>
              <a
                href="#pillars"
                className="px-7 py-3 rounded-full border border-pill text-foreground font-medium hover:border-foreground/30 transition-all"
              >
                Learn More
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-sm text-muted-foreground font-body">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Open Source
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Community Driven
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-glow-green" />
                Standards Based
              </span>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <img
              src={heroSphere}
              alt="Universal coordinate system visualization — interconnected geometric nodes forming a crystalline sphere"
              className="w-full max-w-lg drop-shadow-2xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
