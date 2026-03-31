import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import { ArrowRight } from "lucide-react";

/**
 * Hero section — fits exactly within the viewport on any desktop.
 * Uses dvh (dynamic viewport height) with flex layout so the galaxy
 * and copy share space proportionally via the golden ratio (≈ 1.618).
 * Galaxy gets ~61.8% of available space, copy gets ~38.2%.
 */
const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden h-[100dvh] min-h-[520px] flex flex-col">
      {/* Spacer for navbar */}
      <div className="h-[4.5rem] md:h-[5rem] shrink-0" />

      {/* Galaxy — flexes to fill ~61.8% of remaining space */}
      <div
        className="flex-[1.618] flex items-center justify-center min-h-0 animate-fade-in-up opacity-0"
        style={{ animationDelay: "0.1s" }}
      >
        <GalaxyAnimation />
      </div>

      {/* Copy block — centered */}
      <div className="flex-[1] flex flex-col items-center justify-center min-h-0 px-4 pb-[clamp(1rem,3vh,2.5rem)]">
        <p
          className="text-[0.6875rem] md:text-sm font-body font-medium tracking-[0.2em] uppercase text-muted-foreground/50 mb-[clamp(0.375rem,1vh,1.25rem)] animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.2s" }}
        >
          Universal Data Layer.
        </p>
        <h1
          className="font-display text-[clamp(1.5rem,3.6vw,3.75rem)] font-bold leading-[1.12] tracking-tight text-foreground text-center animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.25s" }}
        >
          <span className="block">One Address for Every</span>
          <span className="block">Piece of Content.</span>
        </h1>
        <p
          className="mt-[clamp(0.75rem,1.5vh,2.5rem)] text-[clamp(0.875rem,1.1vw,1.25rem)] text-muted-foreground leading-[1.68] max-w-2xl text-center font-body animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.45s" }}
        >
          The UOR Foundation stewards a universal content addressed framework.
          <br className="hidden md:block" />
          Data is assigned a stable identifier from its content, not its location.
        </p>
        <div
          className="mt-[clamp(0.75rem,2vh,3.5rem)] flex flex-col sm:flex-row flex-wrap justify-center gap-3 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.6s" }}
        >
          <a href="/projects" className="btn-primary inline-flex items-center gap-2">
            Explore Projects
            <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
