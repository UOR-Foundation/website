import { Globe, Users, Rocket } from "lucide-react";

const pillars = [
  {
    icon: Users,
    title: "The Community",
    subtitle: "Collaboration & Governance",
    description:
      "A vibrant ecosystem of researchers, developers, and visionaries working together to shape the future of open data infrastructure. The community drives governance, contribution, and adoption of the standard.",
    tags: ["Open Source", "Governance", "Collaboration"],
  },
  {
    icon: Globe,
    title: "The Standard",
    subtitle: "Universal Coordinate System",
    description:
      "An open standard creating true interoperability across systems. UOR enables the semantic web by giving every data object a universal, content-addressed identity — bridging science, frontier technology, and beyond.",
    tags: ["Interoperability", "Semantic Web", "Frontier Tech"],
  },
  {
    icon: Rocket,
    title: "Distribution",
    subtitle: "Research Products & Monetization",
    description:
      "A sustainable path for researchers and builders. The distribution platform enables discovery, licensing, and monetization of research products — creating viable economic models for open science.",
    tags: ["Monetization", "Licensing", "Discovery"],
  },
];

const PillarsSection = () => {
  return (
    <section id="pillars" className="py-20 md:py-28 bg-background">
      <div className="container">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
            Three Pillars of the Foundation
          </h2>
          <p className="mt-4 text-muted-foreground text-lg font-body">
            Our mission rests on three interconnected pillars that together create a complete ecosystem for open infrastructure.
          </p>
        </div>

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
              <h3 className="font-display text-xl font-semibold text-foreground">
                {pillar.title}
              </h3>
              <p className="text-sm text-primary font-body font-medium mt-1">
                {pillar.subtitle}
              </p>
              <p className="mt-4 text-muted-foreground font-body text-sm leading-relaxed">
                {pillar.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {pillar.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-xs font-medium rounded-full bg-secondary text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PillarsSection;
