import { Globe, Users, Rocket, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { pillars } from "@/data/pillars";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = { Globe, Users, Rocket };

const PillarsSection = () => {
  return (
    <section id="pillars" className="pt-8 md:pt-14 pb-6 md:pb-10 bg-background">
      <div className="container max-w-6xl">
        <p className="text-base font-body font-semibold tracking-[0.2em] uppercase text-foreground/70 mb-5 md:mb-6">
          Get Involved
        </p>
        <div className="h-px w-full bg-border/60" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mt-8 md:mt-10">
          {pillars.map((pillar, index) => {
            const Icon = iconMap[pillar.iconKey];
            return (
              <Link
                key={pillar.title}
                to={pillar.href}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 md:p-8 transition-all duration-300 hover:border-primary/20 hover:shadow-lg animate-fade-in-up opacity-0"
                style={{ animationDelay: `${0.15 + index * 0.12}s` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon
                    className="w-5 h-5 text-primary transition-transform duration-300 group-hover:scale-110"
                    strokeWidth={1.5}
                  />
                  <h3 className="font-display text-lg md:text-2xl font-semibold text-foreground">
                    {pillar.title}
                  </h3>
                </div>
                <p className="text-muted-foreground font-body text-base leading-[1.68] flex-1">
                  {pillar.description}
                </p>
                <div className="h-px w-full bg-border/40 mt-6 md:mt-8" />
                <div className="flex justify-end mt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground font-body px-4 py-2 rounded-full border border-border group-hover:border-primary/30 transition-all duration-300">
                    {pillar.cta}
                    <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-0.5" />
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
