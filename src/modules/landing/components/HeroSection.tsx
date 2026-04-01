import GalaxyAnimation from "@/modules/landing/components/GalaxyAnimation";
import { ArrowRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden h-[100svh] min-h-[520px] grid grid-cols-1 md:grid-cols-2">
      {/* Left — Copy + CTA, vertically centered */}
      <div className="relative z-10 flex flex-col justify-end md:justify-center px-6 md:px-16 lg:px-24 pb-12 md:pb-0 order-last md:order-first">
        <h1
          className="font-display text-[clamp(2rem,8vw,3.5rem)] md:text-[clamp(2.5rem,4vw,4.5rem)] font-bold leading-[1.1] tracking-[0.04em] text-foreground animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.25s" }}
        >
          Your Universal<br />
          Coordinate System<br />
          for Information
        </h1>
        <p
          className="mt-5 md:mt-6 text-base md:text-lg text-white/50 max-w-md leading-relaxed animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.45s" }}
        >
          A universal mathematical framework for representing and transforming information across all domains.
        </p>
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

      {/* Right — Galaxy animation, filling the column */}
      <div className="relative flex items-center justify-center order-first md:order-last">
        <div
          className="w-[70vw] h-[70vw] max-w-[45svh] max-h-[45svh] md:w-full md:h-full md:max-w-none md:max-h-none relative rounded-full md:rounded-none overflow-hidden animate-fade-in opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <GalaxyAnimation />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
