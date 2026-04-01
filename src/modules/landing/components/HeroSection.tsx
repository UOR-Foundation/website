import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import PrimeSequenceCanvas from "@/modules/landing/components/PrimeSequenceCanvas";
import PrimeGrid from "@/modules/landing/components/PrimeGrid";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden h-[100svh] min-h-[600px]">
      {/* Living prime number field — contained to hero */}
      <PrimeGrid />

      {/* Prime sequence — canvas-rendered drifting stream */}
      <PrimeSequenceCanvas />

      {/* Galaxy — full-bleed background, SpaceX-style dramatic positioning */}
      <div
        className="absolute inset-0 flex items-center justify-end animate-fade-in opacity-0"
        style={{ animationDelay: "0.13s" }}
      >
        <div className="relative w-[85%] h-[85%] md:w-[58%] md:h-[90%] lg:w-[55%] lg:h-[95%] mr-[-8%] md:mr-[-4%]">
          <GalaxyAnimation />
        </div>
      </div>

      {/* Text — SpaceX-style: lower-left, generous padding, full-width utilization */}
      <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-10 lg:px-14">
        <div className="pb-[18vh] md:pb-[16vh]">
          <h1
            className="font-display text-[clamp(2rem,7.5vw,3rem)] md:text-[clamp(2.2rem,3.2vw,3.5rem)] font-bold leading-[1.12] tracking-[0.04em] uppercase text-foreground animate-fade-in-up opacity-0 max-w-[560px]"
            style={{ animationDelay: "0.29s" }}
          >
            Your Universal<br />
            Coordinate System<br />
            for Information
          </h1>
          <p
            className="mt-5 md:mt-6 text-[13px] md:text-[14px] text-foreground/40 max-w-[440px] leading-[1.75] font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.47s" }}
          >
            Deterministic identity. Content-addressed structure.
            Indexed by prime decomposition.
          </p>
          <div
            className="mt-8 md:mt-10 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.59s" }}
          >
            <a
              href="/projects"
              className="inline-flex items-center gap-3 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.2em] border border-foreground/20 text-foreground/60 hover:border-foreground/60 hover:text-foreground transition-all duration-300"
            >
              Explore
              <ArrowRight size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Origin coordinate marker */}
      <span
        className="absolute bottom-6 right-10 font-mono text-[9px] text-foreground/[0.06] tracking-[0.25em] uppercase select-none pointer-events-none"
        aria-hidden="true"
      >
        §0 · Origin
      </span>
    </section>
  );
};

export default HeroSection;
