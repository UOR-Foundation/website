import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import { ArrowRight } from "lucide-react";
import lobsterIcon from "@/assets/lobster-icon.png";

const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden">
      <div className="container pt-[7.5rem] md:pt-52 pb-8 md:pb-24 lg:pb-28">
        <div
          className="mt-4 md:mt-10 mb-10 md:mb-16 lg:mb-20 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <GalaxyAnimation />
        </div>
        <div className="max-w-4xl mx-auto text-center">
          <p
            className="text-[0.6875rem] md:text-base font-body font-medium tracking-[0.2em] uppercase text-muted-foreground/60 mb-3 md:mb-5 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.2s" }}
          >
            open data standard.
          </p>
          <h1
            className="font-display text-[1.625rem] sm:text-[1.75rem] md:text-[3rem] lg:text-[3.75rem] font-bold leading-[1.12] tracking-tight text-foreground animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            <span className="block">One Address for Every</span>
            <span className="block">Piece of Content.</span>
          </h1>
          <p
            className="mt-5 md:mt-10 text-base md:text-xl text-muted-foreground leading-[1.68] max-w-2xl mx-auto font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.45s" }}
          >
            The UOR Foundation develops a universal data standard for science, software, and the next generation of intelligent systems.
          </p>
          <div
            className="mt-8 md:mt-14 flex flex-col sm:flex-row flex-wrap justify-center gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.6s" }}
          >
            <a href="/projects" className="btn-primary inline-flex items-center gap-2">
              Explore Projects
              <ArrowRight size={16} />
            </a>
            <a
              href="/standard"
              className="btn-outline inline-flex items-center gap-2"
            >
              Read the Standard
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
