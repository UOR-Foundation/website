import { Globe, Users, Rocket, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { pillars } from "@/data/pillars";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = { Globe, Users, Rocket };

const PillarsSection = () => {
  return (
    <section id="pillars" className="py-section-md bg-section-dark section-depth">
      <div className="container max-w-[1600px]">
        <div className="flex items-center gap-3 mb-golden-md">
          <span className="font-mono text-fluid-caption tracking-[0.05em] text-foreground/30">§13</span>
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-body">
            Get Involved
          </p>
        </div>
        <div className="rule-prime" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mt-0">
          {pillars.map((pillar, index) => {
            const Icon = iconMap[pillar.iconKey];
            return (
              <Link
                key={pillar.title}
                to={pillar.href}
                className="group flex flex-col p-8 md:p-10 lg:p-12 border-b md:border-b-0 md:border-r border-foreground/8 last:border-r-0 last:border-b-0 transition-all duration-300 animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.17 + index * 0.13}s` }}
              >
                <div className="flex items-center gap-3 mb-golden-md">
                  <Icon
                    className="w-5 h-5 text-primary/60 transition-colors duration-300 group-hover:text-primary"
                    strokeWidth={1.5}
                  />
                  <h3 className="font-display font-semibold text-foreground text-fluid-card-title">
                    {pillar.title}
                  </h3>
                </div>
                <p className="text-foreground/65 font-body leading-[1.68] flex-1 text-fluid-lead">
                  {pillar.description}
                </p>
                <div className="flex justify-start mt-golden-lg">
                  <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.15em] text-foreground/60 font-body group-hover:text-foreground transition-all duration-300 text-fluid-label">
                    {pillar.cta}
                    <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PillarsSection;
