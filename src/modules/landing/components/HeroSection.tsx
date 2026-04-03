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
        <div className="flex-[1]" />

        {/* Galaxy orb — circular */}
        <div
          className="w-[min(62vw,270px)] h-[min(62vw,270px)] rounded-full overflow-hidden animate-fade-in opacity-0 shrink-0"
          style={{ animationDelay: "0.13s" }}
        >
          <GalaxyAnimation />
        </div>

        <div className="h-[clamp(2.5rem,7vw,4rem)] shrink-0" />

        <h1
          className="font-display font-bold leading-[1.15] tracking-[0.05em] uppercase text-foreground text-center animate-fade-in-up opacity-0 px-2"
          style={{ animationDelay: "0.29s" }}
        >
           <span className="text-[clamp(1.5rem,6vw,2.25rem)]">Make Data Identity</span>
           <br />
           <span className="text-[clamp(2.25rem,10vw,3.5rem)] tracking-[0.2em]">Universal</span>
        </h1>

        <div
          className="mt-[clamp(1.75rem,5vw,3rem)] flex flex-col items-center gap-3 animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.47s" }}
        >
          <a
            href="/projects"
            className="pointer-events-auto inline-flex items-center gap-3 px-8 py-3.5 text-[13px] font-semibold uppercase tracking-[0.2em] border border-foreground/60 text-foreground hover:bg-foreground hover:text-background active:scale-[0.97] transition-all duration-200 ease-out"
          >
            Explore Projects
            <ArrowRight size={15} />
          </a>
        </div>

        <div className="flex-[0.618]" />
      </div>

      {/* Desktop: galaxy with volumetric amber glow behind it */}
      <div
        className="hidden md:flex absolute inset-0 items-center justify-end animate-fade-in opacity-0 pointer-events-none"
        style={{ animationDelay: "0.13s" }}
      >
        {/* Volumetric glow — warm amber radiance from galaxy */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 70% 50%, hsla(38, 50%, 45%, 0.04), transparent 70%)",
          }}
        />
        {/* Galactic plane — faint horizontal light band */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 42%, hsla(38, 40%, 50%, 0.015) 49%, hsla(38, 40%, 50%, 0.02) 51%, hsla(38, 40%, 50%, 0.015) 53%, transparent 60%)",
          }}
        />
        <div className="relative w-[min(120vw,125vh*1.1)] h-[min(150vh,120vw*1.1)] lg:w-[min(115vw,120vh*1.1)] lg:h-[min(155vh,115vw*1.1)] mr-[-8%] lg:mr-[-6%]">
          <GalaxyAnimation />
        </div>
      </div>

      <div className="hidden md:flex relative z-10 h-full flex-col px-[5%] lg:px-[6%] xl:px-[7%] pointer-events-none">
        <div className="basis-[38%] shrink-0" />
        <div className="max-w-[55%]">
          <h1
            className="font-display font-bold leading-[1.08] tracking-[0.06em] uppercase text-foreground animate-fade-in-up opacity-0 inline-block"
            style={{ animationDelay: "0.29s" }}
          >
             <span className="text-[clamp(2.5rem,3.2vw,5.5rem)] block">Make Data Identity</span>
             <span className="text-[clamp(3rem,4.2vw,7rem)] flex justify-between w-full" aria-label="Universal">
               {'UNIVERSAL'.split('').map((char, i) => <span key={i} aria-hidden="true">{char}</span>)}
             </span>
          </h1>
          <p
            className="mt-[clamp(1rem,2vw,2.5rem)] text-fluid-lead text-foreground/60 max-w-[min(920px,90%)] leading-[1.75] font-body animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.47s" }}
          >
            The UOR Foundation is the open-source, vendor-neutral home for content-addressed data infrastructure, hosting projects like Hologram and Atlas Embeddings to make data identity universal and verifiable.
          </p>
          <div
            className="mt-[clamp(1.25rem,2.5vw,3rem)] flex flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.59s" }}
          >
            <a
              href="/projects"
              className="pointer-events-auto inline-flex items-center gap-3 px-[clamp(1.5rem,1.8vw,2.5rem)] py-[clamp(0.75rem,1vw,1.25rem)] text-[clamp(0.7rem,0.8vw,0.95rem)] font-semibold uppercase tracking-[0.2em] border border-foreground/60 text-foreground hover:bg-foreground hover:text-background active:scale-[0.97] transition-all duration-200 ease-out"
            >
              Explore Projects
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
        <div className="flex-1" />
      </div>

    </section>
  );
};

export default HeroSection;
