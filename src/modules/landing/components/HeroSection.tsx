import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import PrimeGrid from "@/modules/landing/components/PrimeGrid";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden h-[100svh] min-h-[600px]">
      {/* Living prime number field — contained to hero */}
      <PrimeGrid />

      {/* Galaxy — desktop: right-aligned overlay; mobile: centered above text */}
      <div
        className="absolute inset-0 flex items-center justify-center md:justify-end animate-fade-in opacity-0 pointer-events-none"
        style={{ animationDelay: "0.13s" }}
      >
        {/* Mobile: constrained centered orb · Desktop: large right-aligned galaxy */}
        <div className="relative w-[min(65vw,280px)] h-[min(65vw,280px)] md:w-[min(66vw,70vh*1.1)] md:h-[min(100vh,66vw*1.1)] lg:w-[min(62vw,68vh*1.1)] lg:h-[min(105vh,62vw*1.1)] md:mr-[1%] lg:mr-[3%] mt-[14svh] md:mt-0">
          <GalaxyAnimation />
        </div>
      </div>

      {/* Text — mobile: centered below galaxy · desktop: left-aligned */}
      <div className="relative z-10 h-full flex flex-col px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] pointer-events-none">
        {/* Mobile: push text below galaxy · Desktop: golden ratio spacer */}
        <div className="basis-[55%] md:basis-[38%] shrink-0" />
        <div className="max-w-full md:max-w-[55%] text-center md:text-left">
          <h1
            className="font-display text-[clamp(2.25rem,9vw,3.75rem)] md:text-[clamp(3rem,3.8vw,6.5rem)] font-bold leading-[1.08] tracking-[0.04em] uppercase text-foreground animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.29s" }}
          >
            Your Universal<br />
            Coordinate System<br />
            for Information
          </h1>
          <p
            className="mt-[clamp(1rem,2vw,2.5rem)] text-[clamp(0.875rem,1.1vw,1.35rem)] text-foreground/60 max-w-[min(780px,90%)] md:max-w-[min(780px,90%)] mx-auto md:mx-0 leading-[1.75] font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.47s" }}
          >
            The open specification for content-addressed data identity. Built by the community, for the community.
          </p>
          <div
            className="mt-[clamp(1.25rem,2.5vw,3rem)] animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.59s" }}
          >
            <a
              href="/projects"
              className="pointer-events-auto inline-flex items-center gap-3 px-8 md:px-[clamp(1.5rem,1.8vw,2.5rem)] py-3.5 md:py-[clamp(0.75rem,1vw,1.25rem)] text-[13px] md:text-[clamp(0.7rem,0.8vw,0.95rem)] font-semibold uppercase tracking-[0.2em] border border-foreground/20 text-foreground/60 hover:border-foreground/60 hover:text-foreground active:scale-[0.97] transition-all duration-150 ease-out"
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
        className="absolute bottom-6 right-6 md:right-10 font-mono text-[9px] text-foreground/[0.06] tracking-[0.25em] uppercase select-none pointer-events-none"
        aria-hidden="true"
      >
        §0 · Origin
      </span>
    </section>
  );
};

export default HeroSection;
