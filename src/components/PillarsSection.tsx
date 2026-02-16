import { Globe, Users, Rocket } from "lucide-react";

const pillars = [
  {
    icon: Globe,
    title: "The Standard",
    description:
      "Content-addressed identity for every data object — bridging open science and frontier research.",
  },
  {
    icon: Users,
    title: "Your Community",
    description:
      "Open governance and collaboration driving adoption of the standard.",
  },
  {
    icon: Rocket,
    title: "Our Distribution",
    description:
      "Discovery, licensing, and monetization of research products.",
  },
];

const PillarsSection = () => {
  return (
    <section id="pillars" className="py-20 md:py-32 bg-background">
      <div className="container max-w-5xl">
        <div className="space-y-0">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {index === 0 && <div className="rule" />}
              <div className="py-10 md:py-14 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-12 items-start">
                <div className="flex items-center gap-3">
                  <pillar.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    {pillar.title}
                  </h3>
                </div>
                <p className="text-muted-foreground font-body text-base leading-relaxed">
                  {pillar.description}
                </p>
              </div>
              <div className="rule" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PillarsSection;
