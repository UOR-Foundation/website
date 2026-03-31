const IntroSection = () => {
  return (
    <section id="intro" className="section-dark py-8 md:py-14 scroll-mt-16">
      <div className="container max-w-6xl">
        <p className="text-sm font-body font-medium tracking-[0.2em] uppercase text-section-dark-foreground/50 mb-4">
          Introducing UOR
        </p>
        <div className="h-px w-full bg-section-dark-foreground/8" />
        <div
          className="py-6 md:py-8 max-w-3xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.15s" }}
        >
          <p className="text-section-dark-foreground/75 font-body text-base leading-[1.75] md:leading-[1.85]">
            <span className="text-section-dark-foreground font-medium">
              Every piece of data gets a permanent address derived from its content, not its location.
            </span>{" "}
            Identical content always resolves to the same identifier. References don't break when data moves. Any node can verify what it received independently — no round-trip, no central authority.
          </p>
          <p className="mt-4 text-section-dark-foreground/75 font-body text-base leading-[1.75] md:leading-[1.85]">
            The result is infrastructure where integrity is structural, not bolted on. Scientists, developers, and institutions can build on a shared addressing layer that is open, auditable, and mathematically grounded.
          </p>
          <a
            href="/about"
            className="inline-flex items-center mt-6 md:mt-8 text-sm font-body font-medium tracking-wide text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-200 group"
          >
            About The Foundation
            <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
          </a>
        </div>
        <div className="h-px w-full bg-section-dark-foreground/8" />

        {/* Ecosystem anchoring */}
        <p
          className="mt-4 md:mt-5 text-section-dark-foreground/35 font-body text-sm tracking-wide uppercase animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.5s" }}
        >
          Open source · Vendor-neutral · 501(c)(3) nonprofit · All specifications on GitHub
        </p>
      </div>
    </section>
  );
};

export default IntroSection;
