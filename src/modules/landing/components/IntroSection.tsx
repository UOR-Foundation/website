const IntroSection = () => {
  return (
    <section id="intro" className="py-24 md:py-32 bg-background scroll-mt-16">
      <div className="container max-w-7xl">
        <div className="flex items-center gap-3 mb-6">
          <span className="font-mono text-[0.6875rem] tracking-[0.05em] text-foreground/[0.12]">§2</span>
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70" style={{ fontSize: 'clamp(12px, 0.8vw, 14px)' }}>
            What is UOR
          </p>
        </div>
        <div className="rule-prime" />
        <div
          className="py-10 md:py-14 max-w-4xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.11s" }}
        >
          <p className="text-foreground/90 font-medium font-body leading-[1.75] md:leading-[1.85]" style={{ fontSize: 'clamp(18px, 1.3vw, 24px)' }}>
            The UOR Foundation maintains the open specification for content-addressed data identity. We exist to support the open-source projects building on it.
          </p>
          <p className="mt-6 text-foreground/50 font-body leading-[1.75] md:leading-[1.85]" style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>
            UOR gives every piece of data a permanent address derived from its content. The same input always produces the same address, on any machine, in any system. You can verify data without trusting the source, because the address itself is the proof.
          </p>
          <p className="mt-4 text-foreground/50 font-body leading-[1.75] md:leading-[1.85]" style={{ fontSize: 'clamp(16px, 1.1vw, 20px)' }}>
            This means references that survive migration, replication, and federation. No central registry, no coordination protocol, no single point of failure.
          </p>
        </div>
        <div className="rule-prime" />
      </div>
    </section>
  );
};

export default IntroSection;
