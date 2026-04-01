import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="hero-gradient relative overflow-hidden h-[100svh] min-h-[520px] flex flex-col">
      {/* Galaxy — fills the viewport as cinematic backdrop */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-[min(50svh,80vw)] h-[min(50svh,80vw)] md:w-[min(55svh,50vw)] md:h-[min(55svh,50vw)] relative rounded-full overflow-hidden animate-fade-in opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <GalaxyAnimation />
        </div>
      </div>

      {/* Copy + CTA — bottom-left aligned, SpaceX style */}
      <div className="relative z-10 mt-auto px-6 md:px-0 pb-[clamp(3rem,8vh,6rem)] md:pb-[clamp(4rem,10vh,8rem)]">
        <div className="container max-w-6xl">
          <h1
            className="font-display text-[clamp(2rem,8vw,3.5rem)] md:text-[clamp(2.5rem,5vw,4.5rem)] font-bold leading-[1.1] tracking-[0.04em] text-foreground animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.25s" }}
          >
            Your Universal<br />
            Coordinate System<br />
            for Information
          </h1>
          <div
            className="mt-8 md:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.6s" }}
          >
            <a href="/standard" className="btn-primary inline-flex items-center gap-2">
              Read the Spec
              <ArrowRight size={14} />
            </a>
            <a href="/projects" className="btn-outline inline-flex items-center gap-2">
              Explore Projects
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
