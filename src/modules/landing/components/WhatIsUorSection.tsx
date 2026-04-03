import { ArrowRight } from "lucide-react";

const WhatIsUorSection = () => {
  return (
    <section id="intro" className="py-section-md bg-background scroll-mt-16">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="flex items-center gap-3 mb-golden-md">
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead">
            What is UOR
          </p>
        </div>
        <div className="rule-prime" />

        <div className="py-golden-lg max-w-4xl animate-fade-in-up opacity-0" style={{ animationDelay: "0.11s" }}>
          <p className="font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
            <span className="text-foreground/90 font-medium">Today, the same data gets different IDs in different systems. Move it, copy it, or federate it — the IDs break.</span>{" "}
            <span className="text-foreground/70 font-normal">UOR fixes this with one rule: the address comes from the content itself. Same data, same address, everywhere.</span>
          </p>
          <p className="mt-golden-md text-foreground/70 font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
            Move data anywhere — the address stays the same. No central authority required, no single point of failure.
          </p>
          <div className="mt-golden-lg">
            <a
              href="/docs"
              className="inline-flex items-center gap-3 text-fluid-body font-semibold uppercase tracking-[0.18em] text-primary/80 hover:text-primary transition-colors duration-150 ease-out"
            >
              Read the Docs
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhatIsUorSection;
