import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden h-[100svh] min-h-[520px] grid grid-rows-[auto_minmax(0,1fr)_auto]">
      {/* Row 1: Navbar spacer */}
      <div className="h-[4.5rem] md:h-[5rem]" />

      {/* Row 2: Galaxy — bounded, clipped, centered */}
      <div className="flex items-center justify-center overflow-hidden min-h-0 py-[clamp(0.5rem,2vh,2rem)] md:py-[clamp(1.5rem,4vh,4rem)]">
        <div
          className="w-[min(38svh,75vw)] h-[min(38svh,75vw)] md:w-[min(40svh,58vw)] md:h-[min(40svh,58vw)] relative rounded-full overflow-hidden animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <GalaxyAnimation />
        </div>
      </div>

      {/* Row 3: Copy + CTA */}
      <div className="flex flex-col items-center px-5 pt-[clamp(1rem,3vh,3.5rem)] md:pt-[clamp(1.5rem,4vh,3.5rem)] pb-[clamp(2rem,5vh,5rem)] md:pb-[clamp(3rem,7vh,5rem)]">
        <h1
          className="font-display text-[clamp(1.5rem,5.5vw,3.25rem)] font-bold leading-[1.18] tracking-tight text-foreground text-center animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.25s" }}
        >
          <span className="block">Your Universal Coordinate</span>
          <span className="block">System for Information.</span>
        </h1>
        <div
          className="mt-[clamp(1.25rem,3vh,3rem)] md:mt-[clamp(2rem,4.5vh,4rem)] flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.6s" }}
        >
          <a href="/standard" className="btn-primary inline-flex items-center gap-2">
            Read the Spec
            <ArrowRight size={16} />
          </a>
          <a href="/projects" className="btn-outline inline-flex items-center gap-2">
            Explore Projects
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
