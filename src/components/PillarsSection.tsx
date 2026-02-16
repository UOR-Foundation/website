import { Globe, Users, Rocket } from "lucide-react";

const pillars = [
  {
    icon: Globe,
    title: "Standard",
    description:
      "Content-addressed identity. Composable primitives. No central authority.",
  },
  {
    icon: Users,
    title: "Community",
    description:
      "Open governance. Shared stewardship. Collective adoption.",
  },
  {
    icon: Rocket,
    title: "Distribution",
    description:
      "Discovery, licensing, and reproducibility for research products.",
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