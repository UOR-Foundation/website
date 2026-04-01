import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import PrimeSequenceCanvas from "@/modules/landing/components/PrimeSequenceCanvas";
import { ArrowRight } from "lucide-react";



const HeroSection = () => {
  return (
    <section className="relative overflow-hidden h-[100svh] min-h-[600px]">
      {/* Prime sequence — canvas-rendered drifting stream */}
      <PrimeSequenceCanvas />

      {/* Galaxy — full-bleed background */}
      <div
        className="absolute inset-0 flex items-center justify-end animate-fade-in opacity-0"
        style={{ animationDelay: "0.13s" }}
      >
        <div className="relative w-[85%] h-[85%] md:w-[62%] md:h-[90%] mr-[-8%] md:mr-[-2%]">
          <GalaxyAnimation />
        </div>
      </div>

      {/* Text — positioned at golden ratio vertical */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-[23.6vh] md:pb-0 md:justify-center px-6 md:px-16 lg:px-24 xl:px-32">
        <div className="md:mt-[10vh]">
          <h1
            className="font-display text-[clamp(2.25rem,8vw,3.5rem)] md:text-[clamp(2.5rem,3.8vw,4.25rem)] font-bold leading-[1.08] tracking-[0.03em] text-foreground animate-fade-in-up opacity-0 max-w-[520px]"
            style={{ animationDelay: "0.29s" }}
          >
            Your Universal<br />
            Coordinate System<br />
            for Information
          </h1>
          <p
            className="mt-5 md:mt-7 text-[15px] md:text-base text-foreground/40 max-w-[480px] leading-[1.7] animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.47s" }}
          >
            Deterministic identity. Content-addressed structure. Indexed by prime decomposition.
          </p>
          {/* Gold accent rule — console readout aesthetic */}
          <div
            className="mt-5 w-[61px] h-px bg-primary/20 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.53s" }}
          />
          <div
            className="mt-8 md:mt-10 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.59s" }}
          >
            <a
              href="/projects"
              className="inline-flex items-center gap-3 px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] border border-foreground/30 text-foreground/80 hover:border-foreground hover:text-foreground transition-all duration-300"
            >
              Explore
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      </div>

      {/* Origin coordinate marker */}
      <span
        className="absolute bottom-6 left-6 font-mono text-[10px] text-foreground/[0.04] tracking-[0.2em] select-none pointer-events-none"
        aria-hidden="true"
      >
        [ 0, 0 ]
      </span>
    </section>
  );
};

export default HeroSection;
