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
    <section className="py-24 md:py-32 bg-background">
      <div className="container max-w-6xl">
         <p className="text-xs font-body font-semibold tracking-[0.2em] uppercase text-primary/70 mb-10 md:mb-14">
           Community Highlights
         </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-0">
          {highlights.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              className="group flex flex-col overflow-hidden border-t border-foreground/8 transition-all duration-300 animate-fade-in-up opacity-0"
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <div className="relative aspect-[5/3] overflow-hidden">
                <img
                  src={imageMap[item.imageKey]}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col flex-1 py-6 md:py-8 pr-4">
                <span className="self-start text-xs font-semibold font-body text-foreground/30 uppercase tracking-[0.15em] mb-3">
                  {item.tag}
                </span>
                <h3 className="font-display text-base md:text-lg font-semibold text-foreground leading-snug flex-1">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm text-foreground/30 font-body">
                  {item.date}
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-foreground/50 font-body group-hover:text-foreground group-hover:gap-2.5 transition-all duration-300">
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
