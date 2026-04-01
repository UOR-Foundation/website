const IntroSection = () => {
  return (
    <section id="intro" className="py-24 md:py-32 bg-background scroll-mt-16">
      <div className="container max-w-6xl">
        <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-foreground/40 mb-6">
          What is UOR
        </p>
        <div className="h-px w-full bg-foreground/8" />
        <div
          className="py-10 md:py-14 max-w-3xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <p className="text-foreground/90 font-medium font-body text-lg md:text-xl leading-[1.75] md:leading-[1.85]">
            The UOR Foundation maintains the open specification for content-addressed data identity. We exist to support the open-source projects building on it.
          </p>
          <p className="mt-6 text-foreground/50 font-body text-base leading-[1.75] md:leading-[1.85]">
            UOR gives every piece of data a permanent address derived from its content. The same input always produces the same address, on any machine, in any system. You can verify data without trusting the source, because the address itself is the proof.
          </p>
          <p className="mt-4 text-foreground/50 font-body text-base leading-[1.75] md:leading-[1.85]">
            This means references that survive migration, replication, and federation. No central registry, no coordination protocol, no single point of failure.
          </p>
        </div>
        <div className="h-px w-full bg-foreground/8" />
      </div>
    </section>
  );
};

export default IntroSection;
