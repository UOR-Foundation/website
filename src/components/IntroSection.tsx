const IntroSection = () => {
  return (
    <section className="section-dark py-20 md:py-32">
      <div className="container max-w-5xl">
        <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-primary mb-6">
          Introducing UOR
        </p>
        <div className="h-px w-full bg-section-dark-foreground/10" />
        <div className="py-10 md:py-14 max-w-3xl animate-fade-in-up opacity-0" style={{ animationDelay: "0.15s" }}>
          <h2 className="font-display text-2xl md:text-3xl font-semibold mb-4">
            Your Universal Coordinate System for Information
          </h2>
          <p className="text-section-dark-foreground/55 font-body text-base md:text-lg leading-relaxed">
            UOR is an open-source standard that assigns a unique, content-addressed identity to every piece of data—enabling seamless interoperability across the semantic web, open science, and frontier technology and research. It provides a shared coordinate system so that information can be discovered, referenced, and composed regardless of where it lives.
          </p>
        </div>
        <div className="h-px w-full bg-section-dark-foreground/10" />
      </div>
    </section>
  );
};

export default IntroSection;
