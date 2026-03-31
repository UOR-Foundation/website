import { ArrowRight } from "lucide-react";
import highlightKnowledgeGraph from "@/assets/blog-knowledge-graph.png";
import highlightFrameworkLaunch from "@/assets/blog-uor-framework-launch.png";
import highlightSemanticWeb from "@/assets/highlight-semantic-web.jpg";
import { highlights, type TagType } from "@/data/highlights";

const imageMap: Record<string, string> = {
  knowledgeGraph: highlightKnowledgeGraph,
  frameworkLaunch: highlightFrameworkLaunch,
  semanticWeb: highlightSemanticWeb,
};

const HighlightsSection = () => {
  return (
    <section className="pt-8 md:pt-16 pb-12 md:pb-24 bg-background">
      <div className="container max-w-6xl">
        <p className="text-sm font-body font-medium tracking-[0.2em] uppercase text-muted-foreground/50 mb-8 md:mb-10">
          Community Highlights
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {highlights.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              className="group flex flex-col bg-card rounded-2xl border border-border/30 overflow-hidden hover:border-border/50 transition-all duration-300 animate-fade-in-up opacity-0"
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <div className="relative aspect-[5/3] overflow-hidden">
                <img
                  src={imageMap[item.imageKey]}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col flex-1 p-5 md:p-6">
                <span className="self-start text-sm font-medium font-body text-muted-foreground/60 uppercase tracking-wider mb-3 md:mb-4">
                  {item.tag}
                </span>
                <h3 className="font-display text-base md:text-xl font-semibold text-foreground leading-snug flex-1">
                  {item.title}
                </h3>
                <p className="mt-3 md:mt-4 text-base text-muted-foreground font-body">
                  {item.date}
                </p>
                <span className="inline-flex items-center gap-1.5 mt-3 md:mt-4 text-sm font-medium text-primary font-body group-hover:gap-2.5 transition-all duration-200">
                  Learn more <ArrowRight size={14} />
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
