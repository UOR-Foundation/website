import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { featuredProjects } from "@/data/featured-projects";
import type { MaturityLevel } from "@/data/featured-projects";

const maturityDotColors: Record<MaturityLevel, string> = {
  Graduated: "bg-primary",
  Incubating: "bg-accent",
  Sandbox: "bg-muted-foreground/50",
};

const IntroSection = () => {
  const counts: Record<MaturityLevel, number> = {
    Graduated: featuredProjects.filter((p) => p.maturity === "Graduated").length,
    Incubating: featuredProjects.filter((p) => p.maturity === "Incubating").length,
    Sandbox: featuredProjects.filter((p) => p.maturity === "Sandbox").length,
  };

  const total = featuredProjects.length;

  return (
    <section id="intro" className="py-10 md:py-16 bg-background scroll-mt-16">
      <div className="container max-w-5xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
          <div className="flex items-center gap-6 md:gap-10">
            {(["Graduated", "Incubating", "Sandbox"] as MaturityLevel[]).map((level) => (
              <div key={level} className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${maturityDotColors[level]}`} />
                <div>
                  <p className="font-display text-2xl md:text-3xl font-bold text-foreground leading-none">
                    {counts[level]}
                  </p>
                  <p className="text-sm text-muted-foreground font-body mt-0.5">
                    {level}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <p className="text-muted-foreground font-body text-base">
              {total} open source {total === 1 ? "project" : "projects"} in the UOR ecosystem
            </p>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 text-primary font-medium font-body text-sm hover:gap-2.5 transition-all duration-200 whitespace-nowrap"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default IntroSection;
