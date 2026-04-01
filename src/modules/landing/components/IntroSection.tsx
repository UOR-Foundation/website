import { ArrowRight } from "lucide-react";

const IntroSection = () => {
  return (
    <section id="intro" className="py-section-md bg-background scroll-mt-16">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="flex items-center gap-3 mb-golden-md">
          <span className="font-mono text-fluid-body tracking-[0.12em] text-foreground/25">§2</span>
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead">
            What is UOR
          </p>
        </div>
        <div className="rule-prime" />
        <div
          className="py-golden-lg max-w-6xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.11s" }}
        >
          <p className="font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
            <span className="text-foreground/90 font-medium">Universal Object Reference (UOR) gives every piece of data a permanent address derived from its content.</span>{" "}
            <span className="text-foreground/70 font-normal">The same input always produces the same address, on any machine, in any system. You can verify data without trusting the source, because the address itself is the proof.</span>
          </p>
          <p className="mt-golden-md text-foreground/70 font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
            This means references that survive migration, replication, and federation. No central registry, no coordination protocol, no single point of failure.
          </p>
          <div className="mt-golden-lg">
            <a
              href="/framework"
              className="inline-flex items-center gap-3 text-fluid-body font-semibold uppercase tracking-[0.18em] text-primary/80 hover:text-primary transition-colors duration-150 ease-out"
            >
              Read the Framework
              <ArrowRight size={15} />
            </a>
          </div>
        </div>
        <div className="rule-prime" />
      </div>
    </section>
  );
};

export default IntroSection;
