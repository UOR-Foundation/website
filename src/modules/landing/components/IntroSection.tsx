const IntroSection = () => {
  return (
    <section id="intro" className="section-dark py-12 md:py-20 scroll-mt-16">
      <div className="container max-w-6xl">
        <p className="text-sm font-body font-medium tracking-[0.2em] uppercase text-section-dark-foreground/50 mb-5 md:mb-6">
          Introducing UOR
        </p>
        <div className="h-px w-full bg-section-dark-foreground/8" />
        <div
          className="py-8 md:py-14 max-w-3xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.15s" }}
        >
          <p className="text-section-dark-foreground/75 font-body text-base leading-[1.75] md:leading-[1.9]">
            <span className="text-section-dark-foreground font-medium">
              When data proves its own identity, everything changes.
            </span>{" "}
            Links never break. Copies stay in sync. Any system can verify what it received without calling home.
          </p>
          <p className="mt-5 md:mt-6 text-section-dark-foreground/75 font-body text-base leading-[1.75] md:leading-[1.9]">
            No middlemen, no gatekeepers. Scientists, developers, and institutions get infrastructure they can trust by default.
          </p>
          <a
            href="/about"
            className="inline-flex items-center mt-10 md:mt-14 text-sm font-body font-medium tracking-wide text-section-dark-foreground/60 hover:text-section-dark-foreground transition-colors duration-200 group"
          >
            About The Foundation
            <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
          </a>
        </div>
        <div className="h-px w-full bg-section-dark-foreground/8" />

        {/* Ecosystem anchoring */}
        <p
          className="mt-6 md:mt-8 text-section-dark-foreground/35 font-body text-sm tracking-wide uppercase animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.5s" }}
        >
          Open source · Vendor-neutral · 501(c)(3) nonprofit · All specifications on GitHub
        </p>
      </div>
    </section>
  );
};

export default IntroSection;
