import { Globe, Users, Rocket } from "lucide-react";

const pillars = [
  {
    icon: Users,
    title: "Your Community",
    description:
      "Open governance and collaboration driving adoption of the standard.",
  },
  {
    icon: Globe,
    title: "The Standard",
    description:
      "Content-addressed identity for every data object — bridging open science and frontier technology and research.",
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="group bg-card rounded-2xl border border-border p-8 hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5">
                <pillar.icon className="w-6 h-6 text-primary" />
              </div>
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
