const IntroSection = () => {
  return (
    <section className="section-dark py-12 md:py-20">
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
              Universal Object Reference (UOR) is a universal, lossless coordinate system for information
            </span>{" "}
            that assigns every piece of digital content a unique and permanent identifier based on what it contains, not where it is stored.
          </p>
          <p className="mt-6 text-section-dark-foreground/75 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9]">
            When two systems hold the same content, they resolve to the same identifier—enabling direct verification and reliable reuse without broken references or translation layers.
          </p>
          <p className="mt-6 text-section-dark-foreground/75 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9]">
            By replacing fragmented, location-based systems with shared, content-based identity, UOR reduces integration overhead and strengthens trust between systems.
          </p>
          <p className="mt-8 text-section-dark-foreground/90 font-body text-base md:text-lg leading-[1.85] md:leading-[1.9] font-medium">
            The UOR Foundation is developing this universal data standard to support the semantic web, open science, and frontier technologies.
          </p>
          <a
            href="/about"
            className="inline-flex items-center mt-10 md:mt-12 text-base md:text-lg font-display font-bold tracking-widest uppercase text-section-dark-foreground hover:text-primary transition-colors duration-300 group"
          >
            Read Our Manifesto
            <span className="ml-3 text-xl group-hover:translate-x-2 transition-transform duration-300">→</span>
          </a>
        </div>
        <div className="h-px w-full bg-section-dark-foreground/10" />
      </div>
    </section>
  );
};

export default IntroSection;
