const IntroSection = () => {
  return (
    <section id="intro" className="section-dark py-10 md:py-20 scroll-mt-16">
      <div className="container max-w-6xl">
        <p className="text-[0.6875rem] md:text-base font-body font-medium tracking-[0.2em] uppercase text-section-dark-foreground/80 mb-5 md:mb-6">
          Introducing UOR
        </p>
        <div className="h-px w-full bg-section-dark-foreground/10" />
        <div
          className="py-8 md:py-16 max-w-4xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.15s" }}
        >
          <p className="text-section-dark-foreground/75 font-body text-base md:text-lg leading-[1.75] md:leading-[1.9]">
            <span className="text-section-dark-foreground font-medium">
              Universal Object Reference (UOR) gives every piece of digital content a single, permanent address based on what it contains, not where it is stored.
            </span>
          </p>
          <p className="mt-5 md:mt-6 text-section-dark-foreground/75 font-body text-base md:text-lg leading-[1.75] md:leading-[1.9]">
            Data can be found, verified, and reused across any system. No broken links, no glue code, no gatekeepers.
          </p>
          <p className="mt-6 md:mt-8 text-section-dark-foreground/90 font-body text-base md:text-lg leading-[1.75] md:leading-[1.9] font-medium">
            The UOR Foundation builds this open framework to make reliable, verifiable data the default, from scientific research to production infrastructure.
          </p>
          <a
            href="/about"
            className="inline-flex items-center mt-8 md:mt-12 text-sm md:text-base font-body font-medium tracking-wide text-section-dark-foreground/70 hover:text-section-dark-foreground transition-colors duration-200 group"
          >
            About The Foundation
            <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
          </a>
        </div>
        <div className="h-px w-full bg-section-dark-foreground/10" />

        {/* Ecosystem anchoring */}
        <p
          className="mt-6 md:mt-8 text-section-dark-foreground/40 font-body text-xs md:text-sm tracking-wide uppercase animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.5s" }}
        >
          Open source · Vendor-neutral · 501(c)(3) nonprofit · All specifications on GitHub
        </p>
      </div>
    </section>
  );
};

export default IntroSection;
