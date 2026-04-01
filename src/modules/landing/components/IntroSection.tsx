const IntroSection = () => {
  return (
    <section id="intro" className="py-section-md bg-background scroll-mt-16">
      <div className="container max-w-[1400px]">
        <div className="flex items-center gap-3 mb-golden-md">
          <span className="font-mono text-[0.6875rem] tracking-[0.05em] text-foreground/[0.12]">§2</span>
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-label">
            What is UOR
          </p>
        </div>
        <div className="rule-prime" />
        <div
          className="py-golden-lg max-w-5xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.11s" }}
        >
          <p className="text-foreground/90 font-medium font-body leading-[1.75] md:leading-[1.85] text-fluid-lead">
            The UOR Foundation maintains the open specification for content-addressed data identity. We exist to support the open-source projects building on it.
          </p>
          <p className="mt-golden-md text-foreground/70 font-body leading-[1.75] md:leading-[1.85] text-fluid-body">
            UOR gives every piece of data a permanent address derived from its content. The same input always produces the same address, on any machine, in any system. You can verify data without trusting the source, because the address itself is the proof.
          </p>
          <p className="mt-golden-sm text-foreground/70 font-body leading-[1.75] md:leading-[1.85] text-fluid-body">
            This means references that survive migration, replication, and federation. No central registry, no coordination protocol, no single point of failure.
          </p>
        </div>
        <div className="rule-prime" />
      </div>
    </section>
  );
};

export default IntroSection;
