import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden h-[100svh] min-h-[520px] grid grid-rows-[auto_minmax(0,1fr)_auto]">
      {/* Row 1: Navbar spacer */}
      <div className="h-[5rem] md:h-[5rem]" />

      {/* Row 2: Galaxy — bounded, clipped, centered (φ upper section) */}
      <div className="flex items-center justify-center overflow-hidden min-h-0 py-0 md:py-[clamp(1.5rem,4vh,4rem)]">
        <div
          className="w-[min(34svh,68vw)] h-[min(34svh,68vw)] md:w-[min(40svh,58vw)] md:h-[min(40svh,58vw)] relative rounded-full overflow-hidden animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <GalaxyAnimation />
        </div>
      </div>

      {/* Row 3: Copy + CTA — φ lower section */}
      <div className="flex flex-col items-center px-6 pt-0 md:pt-[clamp(1.5rem,4vh,3.5rem)] pb-[clamp(2.5rem,6vh,5rem)] md:pb-[clamp(3rem,7vh,5rem)]">
        <h1
          className="font-display text-[clamp(2rem,8vw,3.5rem)] md:text-[clamp(1.5rem,5.5vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-foreground text-center animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.25s" }}
        >
          <span className="block sm:hidden">Your Universal</span>
          <span className="block sm:hidden">Coordinate System</span>
          <span className="block sm:hidden">for Information.</span>
          <span className="hidden sm:block">Your Universal Coordinate</span>
          <span className="hidden sm:block">System for Information.</span>
        </h1>
        <div
          className="mt-[clamp(1.5rem,4vh,3rem)] md:mt-[clamp(2rem,4.5vh,4rem)] flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.6s" }}
        >
          <a href="/standard" className="btn-primary hidden sm:inline-flex items-center gap-2">
            Read the Spec
            <ArrowRight size={16} />
          </a>
          <a
            href="/projects"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-foreground text-background font-semibold text-base tracking-tight shadow-[0_2px_20px_-4px_hsl(var(--foreground)/0.35)] hover:shadow-[0_4px_28px_-4px_hsl(var(--foreground)/0.5)] hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 sm:hidden"
          >
            Explore Projects
          </a>
          <a href="/projects" className="btn-outline hidden sm:inline-flex items-center gap-2">
            Explore Projects
          </a>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
