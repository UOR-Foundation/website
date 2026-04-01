import { ArrowRight } from "lucide-react";
import highlightKnowledgeGraph from "@/assets/blog-knowledge-graph.png";
import highlightFrameworkLaunch from "@/assets/blog-uor-framework-launch.png";
import highlightSemanticWeb from "@/assets/highlight-semantic-web.jpg";
import { highlights } from "@/data/highlights";

const imageMap: Record<string, string> = {
  knowledgeGraph: highlightKnowledgeGraph,
  frameworkLaunch: highlightFrameworkLaunch,
  semanticWeb: highlightSemanticWeb,
};

const HighlightsSection = () => {
  return (
    <section className="py-section-md bg-background">
      <div className="container max-w-[1600px]">
        <div className="flex items-center gap-3 mb-golden-lg">
          <span className="font-mono text-fluid-caption tracking-[0.05em] text-foreground/30">§11</span>
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-label">
            Community Highlights
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-0">
          {highlights.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              className="group flex flex-col overflow-hidden border-t border-foreground/8 transition-all duration-300 animate-fade-in-up opacity-0"
              style={{ animationDelay: `${0.11 + index * 0.11}s` }}
            >
              <div className="relative aspect-[5/3] overflow-hidden">
                <img
                  src={imageMap[item.imageKey]}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col flex-1 py-golden-md pr-4">
                <span className="self-start font-semibold font-body text-foreground/50 uppercase tracking-[0.15em] mb-3 text-fluid-label">
                  {item.tag}
                </span>
                <h3 className="font-display font-semibold text-foreground leading-snug flex-1 text-fluid-card-title">
                  {item.title}
                </h3>
                <p className="mt-3 text-foreground/50 font-body text-fluid-label">
                  {item.date}
                </p>
                <span className="inline-flex items-center gap-1.5 mt-golden-sm font-semibold uppercase tracking-[0.15em] text-foreground/60 font-body group-hover:text-foreground group-hover:gap-2.5 transition-all duration-300 text-fluid-label">
                  Learn more <ArrowRight size={12} />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HighlightsSection;
