const pillars = [
  {
    title: "The Standard",
    description:
      "Universal algebra over Z/(2^bits)Z — content-addressed identity, triadic coordinates, and verified coherence from first principles.",
  },
  {
    title: "Your Community",
    description:
      "Open governance, peer-reviewed research, and transparent collaboration driving adoption of the standard.",
  },
  {
    title: "Our Distribution",
    description:
      "Discovery, licensing, and monetization of research products built on composable, verifiable infrastructure.",
  },
];

const PillarsSection = () => {
  return (
    <section id="pillars" className="py-20 md:py-28 bg-background">
      <div className="container max-w-4xl">
        <div className="rule-accent mb-16" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="bg-card p-8 md:p-10 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              <h3 className="font-display text-lg font-semibold text-foreground mb-3">
                {pillar.title}
              </h3>
              <p className="text-muted-foreground font-body text-sm leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PillarsSection;