import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import { ArrowRight } from "lucide-react";

/**
 * Hero section — fits exactly within the viewport on any screen.
 * Uses dvh with flex layout. Golden-ratio split: galaxy ~61.8%, copy ~38.2%.
 * Explicit gap ensures elements never overlap regardless of screen size.
 */
const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden h-[100dvh] min-h-[580px] flex flex-col">
      {/* Spacer for navbar */}
      <div className="h-[4.5rem] md:h-[5rem] shrink-0" />

      {/* Content area with guaranteed gap between galaxy and copy */}
      <div className="flex-1 flex flex-col items-center min-h-0 gap-[clamp(1.5rem,3vh,3rem)]">
        {/* Galaxy — takes ~61.8% of remaining space */}
        <div
          className="flex-[1.618] flex items-center justify-center min-h-0 w-full animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <GalaxyAnimation />
        </div>

        {/* Copy block — takes ~38.2%, centered with bottom breathing room */}
        <div className="flex-[1] flex flex-col items-center justify-start min-h-0 px-4 shrink-0">
          <p
            className="text-sm font-body font-medium tracking-[0.2em] uppercase text-muted-foreground/50 mb-[clamp(0.25rem,0.8vh,0.75rem)] animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.2s" }}
          >
            Universal Data Layer.
          </p>
          <h1
            className="font-display text-[clamp(1.75rem,3.6vw,3.75rem)] font-bold leading-[1.12] tracking-tight text-foreground text-center animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            <span className="block">One Address for Every</span>
            <span className="block">Piece of Content.</span>
          </h1>
          <p
            className="mt-[clamp(0.5rem,1.2vh,1.5rem)] text-[clamp(0.875rem,1.1vw,1.25rem)] text-muted-foreground leading-[1.68] max-w-2xl text-center font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.45s" }}
          >
            The UOR Foundation builds an open framework where every piece of data gets a single, permanent address based on what it contains, not where it lives.
          </p>
          <div
            className="mt-[clamp(0.75rem,1.5vh,2rem)] mb-[clamp(1.5rem,3vh,3rem)] flex flex-col sm:flex-row flex-wrap justify-center gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.6s" }}
          >
            <a href="/projects" className="btn-primary inline-flex items-center gap-2">
              Explore Projects
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
