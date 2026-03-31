import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import { ArrowRight } from "lucide-react";

/**
 * Hero section — CSS Grid ensures all content fits within 100svh.
 * Three rows: navbar spacer (auto), galaxy (1fr bounded), copy+CTA (auto).
 * Golden-ratio proportions maintained via clamp() fluid spacing.
 */
const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden h-[100svh] min-h-[520px] grid grid-rows-[auto_minmax(0,1fr)_auto]">
      {/* Row 1: Navbar spacer */}
      <div className="h-[4.5rem] md:h-[5rem]" />

      {/* Row 2: Galaxy — bounded, clipped, centered */}
      <div className="flex items-center justify-center overflow-hidden min-h-0 py-[clamp(1.5rem,5vh,4rem)]">
        <div
          className="w-[min(46svh,65vw)] h-[min(46svh,65vw)] relative rounded-full overflow-hidden animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <GalaxyAnimation />
        </div>
      </div>

      {/* Row 3: Copy + CTA */}
      <div className="flex flex-col items-center px-4 pb-[clamp(1.5rem,4vh,3rem)]">
        <p
          className="text-sm font-body font-medium tracking-[0.2em] uppercase text-muted-foreground/50 mb-[clamp(0.25rem,0.6vh,0.5rem)] animate-fade-in-up opacity-0"
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
          className="mt-[clamp(0.4rem,1vh,1rem)] text-[clamp(0.875rem,1.1vw,1.25rem)] text-muted-foreground leading-[1.68] max-w-2xl text-center font-body animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.45s" }}
        >
          The UOR Foundation is the neutral custodian of the universal open standard for information addressing. We exist to support the projects building on it.
        </p>
        <div
          className="mt-[clamp(0.5rem,1.2vh,1.5rem)] flex flex-col sm:flex-row flex-wrap justify-center gap-3 animate-fade-in-up opacity-0"
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
