const IntroSection = () => {
  return (
    <section id="intro" className="section-dark py-8 md:py-14 scroll-mt-16">
      <div className="container max-w-6xl">
        <p className="text-base font-body font-semibold tracking-[0.2em] uppercase text-section-dark-foreground/60 mb-4">
          How It Works
        </p>
        <div className="h-px w-full bg-section-dark-foreground/8" />
        <div
          className="py-6 md:py-8 max-w-3xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <p className="text-section-dark-foreground font-medium font-body text-base leading-[1.75] md:leading-[1.85]">
            The UOR Foundation maintains the open specification for content-addressed data identity. We exist to support the open-source projects building on it.
          </p>
          <p className="mt-4 text-section-dark-foreground/75 font-body text-base leading-[1.75] md:leading-[1.85]">
            UOR gives every piece of data a permanent address derived from its content. The same input always produces the same address, on any machine, in any system. You can verify data without trusting the source, because the address itself is the proof.
          </p>
          <p className="mt-4 text-section-dark-foreground/75 font-body text-base leading-[1.75] md:leading-[1.85]">
            This means references that survive migration, replication, and federation. No central registry, no coordination protocol, no single point of failure.
          </p>
        </div>
        <div className="h-px w-full bg-section-dark-foreground/8" />
      </div>
    </section>
  );
};

export default IntroSection;
