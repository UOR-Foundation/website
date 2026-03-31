const MissionSection = () => {
  return (
    <section className="section-dark py-8 md:py-14">
      <div className="container max-w-6xl">
        <p className="text-sm font-body font-medium tracking-[0.2em] uppercase text-section-dark-foreground/50 mb-4">
          Our Mission
        </p>
        <div className="h-px w-full bg-section-dark-foreground/8" />
        <p
          className="py-6 md:py-8 text-section-dark-foreground/75 font-body text-base leading-[1.75] md:leading-[1.85] max-w-3xl animate-fade-in-up opacity-0"
          style={{ animationDelay: "0.1s" }}
        >
          <span className="text-section-dark-foreground font-medium">
            The UOR Foundation maintains the open specification for content-addressed data identity.
          </span>{" "}
          We exist to support the open-source projects building on it.
        </p>
        <div className="h-px w-full bg-section-dark-foreground/8" />
      </div>
    </section>
  );
};

export default MissionSection;
