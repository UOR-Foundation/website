import GalaxyAnimation from "./GalaxyAnimation";

const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden">
      <div className="container pt-20 md:pt-36 pb-16 md:pb-24 lg:pb-28">
        <div
          className="mt-1 md:mt-2 mb-5 md:mb-16 lg:mb-20 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <GalaxyAnimation />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <p
            className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-5 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.2s" }}
          >
            open data standard.
          </p>
          <h1
            className="font-display text-[1.75rem] sm:text-[2rem] md:text-[3rem] lg:text-[3.75rem] font-bold leading-[1.1] tracking-tight text-foreground animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            <span className="hidden md:block">Your Universal Coordinate</span>
            <span className="hidden md:block">System for Information.</span>
            <span className="block md:hidden">Your Universal</span>
            <span className="block md:hidden">Coordinate System</span>
            <span className="block md:hidden">for Information.</span>
          </h1>
          <p
            className="mt-6 md:mt-10 text-base md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.45s" }}
          >
            The UOR Foundation is dedicated to developing universal data standard for the semantic web, open science, and frontier technologies.
          </p>
          <div
            className="mt-8 md:mt-14 flex flex-col sm:flex-row flex-wrap justify-center gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.6s" }}
          >
            <a href="#pillars" className="btn-primary">
              Learn More
            </a>
            <a
              href="https://github.com/UOR-Foundation"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline"
            >
              Explore on GitHub
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
