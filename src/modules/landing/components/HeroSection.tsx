import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import PrimeGrid from "@/modules/landing/components/PrimeGrid";
import PhysicalTitle from "@/modules/landing/components/PhysicalTitle";
import { ArrowRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const HeroSection = () => {
  const isMobile = useIsMobile();
  return (
    <section className="relative overflow-hidden h-[100svh] min-h-[600px]">
      {/* Living prime number field. desktop only */}
      {!isMobile && <PrimeGrid />}

      {/* Mobile: fill the viewport, golden-ratio vertical distribution */}
      <div className="md:hidden relative z-10 h-full flex flex-col items-center px-6 pointer-events-none">
        {/* Top spacer — matches the orb→text gap via same flex ratio */}
        <div className="flex-[1.7] min-h-[5.5rem]" />

        {/* Galaxy orb */}
        <div
          className="w-[min(72vw,300px)] h-[min(72vw,300px)] rounded-full overflow-hidden animate-fade-in opacity-0 shrink-0"
          style={{ animationDelay: "0.13s" }}
        >
          <GalaxyAnimation />
        </div>

        {/* Spacer orb → text — same flex as top for balance */}
        <div className="flex-[0.9] min-h-[1rem]" />

        <PhysicalTitle
          wrapperClass="font-display font-bold leading-[1.05] tracking-[0.05em] uppercase text-foreground text-center animate-fade-in-up opacity-0 px-2 inline-block shrink-0"
          lineOneClass="text-[clamp(1.45rem,6.05vw,2.25rem)] block whitespace-nowrap w-full text-center"
          lineTwoClass="text-[clamp(2.85rem,11.9vw,4.4rem)] flex justify-between w-full mt-1"
          delay="0.29s"
        />

        <div
          className="mt-[clamp(2.5rem,6vw,3.5rem)] flex flex-col items-center gap-3 animate-fade-in-up opacity-0 shrink-0"
          style={{ animationDelay: "0.47s" }}
        >
          <a
            href="/projects"
            className="pointer-events-auto inline-flex items-center gap-3 px-8 py-3.5 text-[12px] font-semibold uppercase tracking-[0.2em] border border-foreground/30 text-foreground hover:bg-foreground hover:text-background active:scale-[0.97] transition-all duration-200 ease-out"
          >
            Explore Projects
            <ArrowRight size={14} />
          </a>
        </div>

        {/* Flexible spacer — golden major proportion */}
        <div className="flex-[1] min-h-[1.5rem]" />

        {/* Stats bar */}
        <div className="w-2/5 mx-auto h-px bg-gradient-to-r from-transparent via-foreground/12 to-transparent mb-4 animate-fade-in-up opacity-0 shrink-0" style={{ animationDelay: "0.6s" }} />
        <div
          className="w-full grid grid-cols-3 gap-2 px-6 pb-[max(1.75rem,calc(env(safe-area-inset-bottom,1rem)+1rem))] animate-fade-in-up opacity-0 pointer-events-none shrink-0"
          style={{ animationDelay: "0.65s" }}
        >
          {[
            { value: "1", label: "Standard" },
            { value: "150+", label: "Contributors" },
            { value: "Open", label: "Governance" },
          ].map((stat) => (
            <div key={stat.label} className="text-center min-w-0 px-1">
              <p className="font-display font-bold text-foreground text-[clamp(1.4rem,5.5vw,2rem)] leading-none">{stat.value}</p>
              <p className="font-mono text-foreground/55 text-[10px] uppercase tracking-[0.08em] mt-2 leading-tight">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop: galaxy with volumetric amber glow behind it */}
      <div
        className="hidden md:flex absolute inset-0 items-center justify-end animate-fade-in opacity-0 pointer-events-none"
        style={{ animationDelay: "0.13s" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 50% 50% at 75% 50%, hsla(38, 50%, 45%, 0.04), transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "linear-gradient(to bottom, transparent 42%, hsla(38, 40%, 50%, 0.015) 49%, hsla(38, 40%, 50%, 0.02) 51%, hsla(38, 40%, 50%, 0.015) 53%, transparent 60%)",
          }}
        />
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2"
          style={{
            // Fluid scaling: aggressively grows on large screens while staying
            // proportional to the shorter viewport axis so it never overflows.
            width: "clamp(460px, min(82vw, 108vh), 2100px)",
            height: "clamp(460px, min(82vw, 108vh), 2100px)",
            marginRight: "clamp(-12%, -3vw, -1%)",
          }}
        >
          <GalaxyAnimation />
        </div>
      </div>

      <div className="hidden md:flex relative z-10 h-full flex-col px-[5%] lg:px-[6%] xl:px-[7%] pointer-events-none">
        <div className="basis-[34%] shrink-0" />
        {/* Title column: wider on md (orb is smaller), narrower on xl+ to leave breathing room */}
        <div className="max-w-[58%] lg:max-w-[50%] xl:max-w-[46%] 2xl:max-w-[42%]">
          <PhysicalTitle
            wrapperClass="font-display font-bold leading-[1.04] tracking-[0.06em] uppercase text-foreground animate-fade-in-up opacity-0 inline-block"
            lineOneClass="text-[clamp(2.25rem,3.8vw,6.5rem)] block whitespace-nowrap"
            lineTwoClass="text-[clamp(2.75rem,5vw,8.75rem)] flex justify-between w-full mt-1"
            delay="0.29s"
          />
          <p
            className="mt-[clamp(1.25rem,2.2vw,2.75rem)] text-foreground/60 max-w-[min(960px,92%)] leading-[1.65] font-body animate-fade-in-up opacity-0 text-[clamp(1.05rem,1.2vw,1.6rem)]"
            style={{ animationDelay: "0.47s" }}
          >
            UOR (Universal Object Reference) is an open-source, vendor-neutral standard for content-addressed decentralized identity of digital objects, enabling universal and sustainable interoperability.
          </p>
          <div
            className="mt-[clamp(1.25rem,2.5vw,3rem)] flex flex-wrap gap-3 animate-fade-in-up opacity-0"
            style={{ animationDelay: "0.59s" }}
          >
            <a
              href="/projects"
              className="pointer-events-auto inline-flex items-center gap-3 px-[clamp(1.5rem,1.7vw,2.25rem)] py-[clamp(0.7rem,0.9vw,1.1rem)] text-[clamp(13px,0.95vw,17px)] font-semibold uppercase tracking-[0.2em] border border-foreground/60 text-foreground hover:bg-foreground hover:text-background active:scale-[0.97] transition-all duration-200 ease-out"
            >
              Explore Projects
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
        <div className="flex-1" />

        {/* Stats bar. desktop */}
        <div className="w-3/5 mx-auto h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent mb-6 animate-fade-in-up opacity-0" style={{ animationDelay: "0.7s" }} />
        <div
          className="w-full flex justify-center gap-10 lg:gap-14 pb-[clamp(2rem,3vh,3.5rem)] animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.75s" }}
        >
          {[
            { value: "1", label: "Standard" },
            { value: "11", label: "Projects" },
            { value: "150+", label: "Contributors" },
            { value: "Open", label: "Governance" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display font-bold text-foreground text-[clamp(1.75rem,2.5vw,3rem)] leading-none">{stat.value}</p>
              <p className="font-body text-foreground/40 text-fluid-label uppercase tracking-[0.15em] mt-1.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

    </section>
  );
};

export default HeroSection;
