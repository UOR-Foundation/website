import { ArrowRight } from "lucide-react";

const WhatIsUorSection = () => {
  return (
    <section id="intro" className="py-14 md:py-20 bg-background scroll-mt-16">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <h2 className="font-display font-bold text-foreground text-[clamp(2.25rem,4.6vw,4.5rem)] leading-[0.98] tracking-[-0.02em]">
          One address. Everywhere.
        </h2>
        <div className="rule-prime" />
        <p className="mt-golden-md max-w-[60ch] font-body text-fluid-lead leading-[1.75] text-foreground/70">
          Every system invents its own identifiers. UOR derives a permanent, verifiable address from the data itself — the same data has the same address, anywhere.
        </p>
        <div className="mt-golden-lg">
          <a
            href="/framework"
            className="inline-flex items-center gap-3 text-fluid-body font-semibold uppercase tracking-[0.18em] text-primary/80 hover:text-primary transition-colors duration-150 ease-out"
          >
            Explore the Framework
            <ArrowRight size={14} strokeWidth={2} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default WhatIsUorSection;
