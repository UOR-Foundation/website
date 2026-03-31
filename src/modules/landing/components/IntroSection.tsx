const IntroSection = () => {
  return (
    <section id="intro" className="py-8 md:py-14 bg-background scroll-mt-16">
      <div className="container max-w-6xl">
        <p className="text-sm font-body font-medium tracking-[0.2em] uppercase text-muted-foreground/50 mb-4">
          How It Works
        </p>
        <div className="h-px w-full bg-border/40" />
        <div
          className="py-6 md:py-8 max-w-3xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.15s" }}
        >
          <p className="text-foreground/75 font-body text-base leading-[1.75] md:leading-[1.85]">
            <span className="text-foreground font-medium">
              UOR gives every piece of data a permanent address derived from its content.
            </span>{" "}
            The same input always produces the same address, on any machine, in any system. You can verify data without trusting the source, because the address itself is the proof.
          </p>
          <p className="mt-4 text-foreground/75 font-body text-base leading-[1.75] md:leading-[1.85]">
            This means references that survive migration, replication, and federation. No central registry, no coordination protocol, no single point of failure. The projects you see below are built on this foundation.
          </p>
          <a
            href="/about"
            className="inline-flex items-center mt-6 md:mt-8 text-sm font-body font-medium tracking-wide text-muted-foreground hover:text-foreground transition-colors duration-200 group"
          >
            About The Foundation
            <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
          </a>
        </div>
        <div className="h-px w-full bg-border/40" />

        {/* Ecosystem anchoring */}
        <p
          className="mt-4 md:mt-5 text-muted-foreground/35 font-body text-sm tracking-wide uppercase animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.5s" }}
        >
          Open source · Vendor-neutral · 501(c)(3) nonprofit · All specifications on GitHub
        </p>
      </div>
    </section>
  );
};

export default IntroSection;
