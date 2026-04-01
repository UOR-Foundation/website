import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import PrimeGrid from "@/modules/landing/components/PrimeGrid";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const HeroSection = () => {
  const isMobile = useIsMobile();

  return (
    <section className="relative overflow-hidden h-[100svh] min-h-[600px]">
      {/* Living prime number field — desktop only */}
      {!isMobile && <PrimeGrid />}

      {/* Mobile: stacked layout with galaxy circle + headline + CTA */}
      <div className="md:hidden relative z-10 h-full flex flex-col items-center px-6 pointer-events-none">
        {/* Top spacer — φ ratio: content sits in lower golden zone */}
        <div className="flex-[1]" />

        {/* Galaxy orb — circular */}
        <div
          className="w-[min(62vw,270px)] h-[min(62vw,270px)] rounded-full overflow-hidden animate-fade-in opacity-0 shrink-0"
          style={{ animationDelay: "0.13s" }}
        >
          <GalaxyAnimation />
        </div>

        {/* Spacer between galaxy and text — generous */}
        <div className="h-[clamp(2.5rem,7vw,4rem)] shrink-0" />

        {/* Headline — centered, clean */}
        <h1
          className="font-display text-[clamp(1.75rem,7.5vw,2.75rem)] font-bold leading-[1.15] tracking-[0.05em] uppercase text-foreground text-center animate-fade-in-up opacity-0 px-2"
          style={{ animationDelay: "0.29s" }}
        >
          Your Universal<br />
          Coordinate<br />
          System for Information
        </h1>

        {/* CTA */}
        <div
          className="mt-[clamp(1.75rem,5vw,3rem)] animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.47s" }}
        >
          <a
            href="/projects"
            className="pointer-events-auto inline-flex items-center gap-3 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.2em] border border-foreground/20 text-foreground/60 hover:border-foreground/60 hover:text-foreground active:scale-[0.97] transition-all duration-150 ease-out"
          >
            Explore Projects
            <ArrowRight size={15} />
          </a>
        </div>

        {/* Bottom spacer — φ proportion */}
        <div className="flex-[0.618]" />
      </div>

      {/* Desktop: original layout with galaxy right-aligned */}
      <div
        className="hidden md:flex absolute inset-0 items-center justify-end animate-fade-in opacity-0 pointer-events-none"
        style={{ animationDelay: "0.13s" }}
      >
        <div className="relative w-[min(90vw,95vh*1.1)] h-[min(120vh,90vw*1.1)] lg:w-[min(85vw,92vh*1.1)] lg:h-[min(125vh,85vw*1.1)] mr-[0%] lg:mr-[1%]">
          <GalaxyAnimation />
        </div>
      </div>

      <div className="hidden md:flex relative z-10 h-full flex-col px-[5%] lg:px-[6%] xl:px-[7%] pointer-events-none">
        <div className="basis-[38%] shrink-0" />
        <div className="max-w-[55%]">
          <h1
            className="font-display text-[clamp(3rem,3.8vw,6.5rem)] font-bold leading-[1.08] tracking-[0.04em] uppercase text-foreground animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.29s" }}
          >
            Your Universal<br />
            Coordinate System<br />
            for Information
          </h1>
          <p
            className="mt-[clamp(1rem,2vw,2.5rem)] text-fluid-lead text-foreground/60 max-w-[min(780px,90%)] leading-[1.75] font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.47s" }}
          >
            The UOR Foundation maintains the open specification for content-addressed data identity. We exist to support the open-source projects building on it.
          </p>
          <div
            className="mt-[clamp(1.25rem,2.5vw,3rem)] animate-fade-in-up opacity-0"
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
        className="absolute bottom-6 right-6 md:right-10 font-mono text-[9px] text-foreground/[0.06] tracking-[0.25em] uppercase select-none pointer-events-none"
        aria-hidden="true"
      >
        §0 · Origin
      </span>
    </section>
  );
};

export default HeroSection;
