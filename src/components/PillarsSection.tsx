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
    <section id="pillars" className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="rule-accent mb-16" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden border border-border">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="bg-card p-8 md:p-10 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.12}s` }}
            >
              <pillar.icon className="w-5 h-5 text-primary mb-6" strokeWidth={1.5} />
              <h3 className="font-display text-xl font-semibold text-foreground mb-3">
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