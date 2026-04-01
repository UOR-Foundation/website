import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import PrimeGrid from "@/modules/landing/components/PrimeGrid";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden h-[100svh] min-h-[600px]">
      {/* Living prime number field — contained to hero */}
      <PrimeGrid />


      {/* Galaxy — full-bleed background, SpaceX-style dramatic positioning */}
      <div
        className="absolute inset-0 flex items-center justify-end animate-fade-in opacity-0"
        style={{ animationDelay: "0.13s" }}
      >
        <div className="relative w-[85%] h-[85%] md:w-[58%] md:h-[90%] lg:w-[55%] lg:h-[95%] mr-[-8%] md:mr-[-2%]">
          <GalaxyAnimation />
        </div>
      </div>

      {/* Text — SpaceX-style: lower-left, generous padding, full-width utilization */}
      <div className="relative z-10 h-full flex flex-col px-6 md:px-10 lg:px-[5%] xl:px-[6%]">
        {/* Golden ratio spacer — 38.2% from top */}
        <div className="basis-[38.2%] shrink-0" />
        <div>
          <h1
            className="font-display text-[clamp(2.2rem,8vw,3rem)] md:text-[clamp(2.5rem,4vw,4.5rem)] font-bold leading-[1.12] tracking-[0.04em] uppercase text-foreground animate-fade-in-up opacity-0 max-w-[800px]"
            style={{ animationDelay: "0.29s" }}
          >
            Your Universal<br />
            Coordinate System<br />
            for Information
          </h1>
          <p
            className="mt-[1.618rem] text-[clamp(13px,1vw,17px)] text-foreground/60 max-w-[620px] leading-[1.75] font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.47s" }}
          >
            The UOR Foundation maintains the open specification for content-addressed data identity. We exist to support the open-source projects building on it.
          </p>
          <div
            className="mt-[2.618rem] animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.59s" }}
          >
            <a
              href="/projects"
              className="inline-flex items-center gap-3 px-7 py-3.5 text-[clamp(10px,0.7vw,12px)] font-semibold uppercase tracking-[0.2em] border border-foreground/20 text-foreground/60 hover:border-foreground/60 hover:text-foreground transition-all duration-300"
            >
              Explore Projects
              <ArrowRight size={13} />
            </a>
          </div>
        </div>
        {/* Remaining 61.8% fills naturally */}
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
