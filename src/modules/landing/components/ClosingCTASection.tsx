import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Globe, Users, Rocket } from "lucide-react";
import { pillars } from "@/data/pillars";
import { DISCORD_URL, GITHUB_ORG_URL, GITHUB_FRAMEWORK_DOCS_URL } from "@/data/external-links";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = { Globe, Users, Rocket };

const ClosingCTASection = () => {
  return (
    <section className="py-section-md bg-section-dark section-depth">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mb-golden-lg">
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
                  <Icon className="w-5 h-5 text-primary/60 transition-colors duration-300 group-hover:text-primary" strokeWidth={1.5} />
                  <h3 className="font-display font-semibold text-foreground text-fluid-card-title">{pillar.title}</h3>
                </div>
                <p className="text-foreground/65 font-body leading-[1.68] flex-1 text-fluid-lead">{pillar.description}</p>
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

        {/* CTA */}
        <div className="relative text-center pt-golden-lg border-t border-foreground/8">
          <h2 className="font-display font-bold text-foreground text-fluid-heading">
            Join the Mission
          </h2>
          <div className="mt-golden-lg flex flex-col sm:flex-row flex-wrap justify-center gap-3 sm:gap-4">
            <a
              href={GITHUB_FRAMEWORK_DOCS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2"
            >
              Getting Started Guide
              <ArrowRight size={14} />
            </a>
            <a
              href={DISCORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-flex items-center gap-2"
            >
              Join Discord
            </a>
            <a
              href={GITHUB_ORG_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline inline-flex items-center gap-2"
            >
              GitHub Organization
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClosingCTASection;
