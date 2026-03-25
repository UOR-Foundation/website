import { Globe, Users, Rocket, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { pillars } from "@/data/pillars";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = { Globe, Users, Rocket };

const PillarsSection = () => {
  return (
    <section id="pillars" className="pt-12 md:pt-24 pb-8 md:pb-16 bg-background">
      <div className="container max-w-6xl">
        <p className="text-[0.6875rem] md:text-base font-body font-medium tracking-[0.2em] uppercase text-muted-foreground/60 mb-5 md:mb-6">
          What We Do
        </p>
        <div className="rule" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:divide-x md:divide-border divide-y divide-border md:divide-y-0">
          {pillars.map((pillar, index) => {
            const Icon = iconMap[pillar.iconKey];
            return (
              <div
                key={pillar.title}
                className="group flex flex-col animate-fade-in-up opacity-0 py-8 md:py-14 md:px-8 first:md:pl-0 last:md:pr-0"
                style={{ animationDelay: `${0.15 + index * 0.12}s` }}
              >
                <div className="flex items-center gap-3 mb-3 md:mb-4">
                  <Icon
                    className="w-[1.125rem] h-[1.125rem] md:w-5 md:h-5 text-primary transition-transform duration-300 group-hover:scale-110"
                    strokeWidth={1.5}
                  />
                  <h3 className="font-display text-lg md:text-2xl font-semibold text-foreground">
                    {pillar.title}
                  </h3>
                </div>
                <p className="text-muted-foreground font-body text-[0.9375rem] md:text-base leading-[1.68] flex-1">
                  {pillar.description}
                </p>
                <Link
                  to={pillar.href}
                  className="inline-flex items-center gap-1.5 text-[0.9375rem] md:text-base font-medium text-primary font-body transition-all duration-300 group-hover:gap-2.5 mt-5 md:mt-6"
                >
                  {pillar.cta}
                  <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </div>
            );
          })}
        </div>
        <div className="rule" />
      </div>
    </section>
  );
};

export default PillarsSection;
