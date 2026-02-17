const IntroSection = () => {
  return (
    <section className="section-dark py-10 md:py-16">
      <div className="container max-w-5xl">
        <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-section-dark-foreground/80 mb-6">
          Introducing UOR
        </p>
        <div className="h-px w-full bg-section-dark-foreground/10" />
        <div className="py-10 md:py-14 max-w-3xl animate-fade-in-up opacity-0" style={{ animationDelay: "0.15s" }}>
          <p className="text-section-dark-foreground/55 font-body text-base md:text-lg leading-relaxed">
            Universal Object Reference (UOR) is a universal, lossless coordinate system for information that assigns every piece of digital content a unique and permanent identifier based on what it contains, not where it is stored. When two systems hold the same content, they resolve to the same identifier, enabling direct verification and reliable reuse without broken references or translation layers. By replacing fragmented, location based systems with shared, content based identity, UOR reduces integration overhead and strengthens trust between systems. The UOR Foundation is developing this universal data standard to support the semantic web, open science, and frontier technologies.
          </p>
        </div>
        <div className="h-px w-full bg-section-dark-foreground/10" />
      </div>
    </section>
  );
};

export default IntroSection;
