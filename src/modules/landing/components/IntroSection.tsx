const IntroSection = () => {
  return (
    <section id="intro" className="section-dark py-12 md:py-20 scroll-mt-16">
      <div className="container max-w-5xl">
        <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-section-dark-foreground/80 mb-6">
          Introducing UOR
        </p>
        <div className="h-px w-full bg-section-dark-foreground/10" />
        <div
          className="py-12 md:py-16 max-w-3xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.15s" }}
        >
          <p className="text-section-dark-foreground/75 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9]">
            <span className="text-section-dark-foreground font-medium">
              Universal Object Reference (UOR) gives every piece of digital content a single, permanent address based on what it contains, not where it is stored.
            </span>
          </p>
          <p className="mt-6 text-section-dark-foreground/75 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9]">
            This means data can be found, verified, and reused across any system without broken links, translation layers, or manual integration. The same content always resolves to the same address, no matter who holds it.
          </p>
          <p className="mt-6 text-section-dark-foreground/75 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9]">
            Instead of every system inventing its own way to name and find data, UOR provides one shared method. This removes duplication, reduces cost, and makes it possible to trust data across organizational boundaries.
          </p>
          <p className="mt-8 text-section-dark-foreground/90 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9] font-medium">
            The UOR Foundation is building this open standard to make reliable, verifiable data the default for science, software, and emerging technologies.
          </p>
          <a
            href="/about"
            className="inline-flex items-center mt-10 md:mt-12 text-sm md:text-base font-body font-medium tracking-wide text-section-dark-foreground/70 hover:text-section-dark-foreground transition-colors duration-200 group"
          >
            About The Foundation
            <span className="ml-2 group-hover:translate-x-1 transition-transform duration-200">→</span>
          </a>
        </div>
        <div className="h-px w-full bg-section-dark-foreground/10" />
      </div>
    </section>
  );
};

export default IntroSection;
