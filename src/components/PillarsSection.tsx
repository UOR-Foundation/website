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
    title: "Our Community",
    description:
      "Open governance and collaboration driving adoption of the standard.",
  },
  {
    icon: Rocket,
    title: "Your Projects",
    description:
      "Discovery, licensing, and monetization of research products.",
  },
];

const PillarsSection = () => {
  return (
    <section id="pillars" className="py-20 md:py-32 bg-background">
      <div className="container max-w-5xl">
        <div className="rule" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x md:divide-border">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="animate-fade-in-up py-10 md:py-14 md:px-8 first:md:pl-0 last:md:pr-0"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <pillar.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                <h3 className="font-display text-xl font-semibold text-foreground">
                  {pillar.title}
                </h3>
              </div>
              <p className="text-muted-foreground font-body text-sm leading-relaxed">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
        <div className="rule" />
      </div>
    </section>
  );
};

export default PillarsSection;
