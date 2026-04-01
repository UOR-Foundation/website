import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import PrimeGrid from "@/modules/landing/components/PrimeGrid";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden h-[100svh] min-h-[600px]">
      {/* Living prime number field — contained to hero */}
      <PrimeGrid />

      {/* Galaxy — viewport-scaled, vertically centered to align with text */}
      <div
        className="absolute inset-0 flex items-center justify-end animate-fade-in opacity-0"
        style={{ animationDelay: "0.13s" }}
      >
        <div className="relative w-[90%] h-[90%] md:w-[min(62vw,65vh*1.1)] md:h-[min(95vh,62vw*1.1)] lg:w-[min(58vw,62vh*1.1)] lg:h-[min(100vh,58vw*1.1)] md:mr-[1%] lg:mr-[3%]">
          <GalaxyAnimation />
        </div>
      </div>

      {/* Text — viewport-scaled typography for proportional confidence at any size */}
      <div className="relative z-10 h-full flex flex-col px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] pointer-events-none">
        {/* Vertically center the content block */}
        <div className="basis-[38%] shrink-0" />
        <div className="max-w-[55%]">
          <h1
            className="font-display text-[clamp(2.2rem,8vw,3rem)] md:text-[clamp(3rem,3.8vw,6.5rem)] font-bold leading-[1.08] tracking-[0.04em] uppercase text-foreground animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.29s" }}
          >
            Your Universal<br />
            Coordinate System<br />
            for Information
          </h1>
          <p
            className="mt-[clamp(1.25rem,2vw,2.5rem)] text-[clamp(0.95rem,1.1vw,1.35rem)] text-foreground/60 max-w-[min(620px,85%)] leading-[1.75] font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.47s" }}
          >
            The UOR Foundation maintains the open specification for content-addressed data identity. We exist to support the open-source projects building on it.
          </p>
          <div
            className="mt-[clamp(1.5rem,2.5vw,3rem)] animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.59s" }}
          >
            <a
              href="/projects"
              className="pointer-events-auto inline-flex items-center gap-3 px-[clamp(1.5rem,1.8vw,2.5rem)] py-[clamp(0.75rem,1vw,1.25rem)] text-[clamp(0.7rem,0.8vw,0.95rem)] font-semibold uppercase tracking-[0.2em] border border-foreground/20 text-foreground/60 hover:border-foreground/60 hover:text-foreground active:scale-[0.97] transition-all duration-150 ease-out"
            >
              Explore Projects
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
        <div className="flex-1" />
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
