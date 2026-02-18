import { Globe, Users, Rocket, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const pillars = [
  {
    icon: Globe,
    title: "UOR Framework",
    description:
      "Content-addressed identity for every data object, bridging open science and frontier research.",
    href: "/standard",
    cta: "Learn",
  },
  {
    icon: Users,
    title: "Our Community",
    description:
      "Open governance and collaboration driving adoption of the standard.",
    href: "/research",
    cta: "Connect",
  },
  {
    icon: Rocket,
    title: "Your Projects",
    description:
      "Discovery, licensing, and monetization of research products.",
    href: "/projects",
    cta: "Build",
  },
];

const PillarsSection = () => {
  return (
    <section id="pillars" className="pt-16 md:pt-24 pb-10 md:pb-16 bg-background">
      <div className="container max-w-5xl">
        <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-6">
          Our Three Pillars
        </p>
        <div className="rule" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x md:divide-border divide-y divide-border md:divide-y-0">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.title}
              className="group flex flex-col animate-fade-in-up opacity-0 py-10 md:py-14 md:px-8 first:md:pl-0 last:md:pr-0"
              style={{ animationDelay: `${0.15 + index * 0.12}s` }}
            >
              <div className="flex items-center gap-3 mb-4">
                <pillar.icon
                  className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110"
                  strokeWidth={1.5}
                />
                <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground">
                  {pillar.title}
                </h3>
              </div>
              <p className="text-muted-foreground font-body text-base leading-relaxed flex-1">
                {pillar.description}
              </p>
              <Link
                to={pillar.href}
                className="inline-flex items-center gap-1.5 text-base font-medium text-primary font-body transition-all duration-300 group-hover:gap-2.5 mt-6"
              >
                {pillar.cta}
                <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          ))}
        </div>
        <div className="rule" />
      </div>
    </section>
  );
};

export default PillarsSection;
