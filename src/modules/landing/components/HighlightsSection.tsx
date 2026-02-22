import { ArrowRight } from "lucide-react";
import highlightKnowledgeGraph from "@/assets/blog-knowledge-graph.png";
import highlightFrameworkLaunch from "@/assets/blog-uor-framework-launch.png";
import highlightSemanticWeb from "@/assets/highlight-semantic-web.jpg";
import { highlights, type TagType } from "@/data/highlights";

const tagStyles: Record<TagType, string> = {
  Research: "bg-primary/10 text-primary",
  Announcement: "bg-accent/10 text-accent",
};

const imageMap: Record<string, string> = {
  knowledgeGraph: highlightKnowledgeGraph,
  frameworkLaunch: highlightFrameworkLaunch,
  semanticWeb: highlightSemanticWeb,
};

const HighlightsSection = () => {
  return (
    <section className="pt-6 md:pt-10 pb-10 md:pb-16 bg-background">
      <div className="container max-w-5xl">
        <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-8">
          Community Highlights
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {highlights.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              className="group flex flex-col bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-border/60 transition-all duration-300 animate-fade-in-up opacity-0"
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
              <div className="flex flex-col flex-1 p-6">
                <span
                  className={`self-start px-3 py-1 rounded-full text-sm font-medium font-body mb-4 ${tagStyles[item.tag]}`}
                >
                  {item.tag}
                </span>
                <h3 className="font-display text-lg md:text-xl font-semibold text-foreground leading-snug flex-1">
                  {item.title}
                </h3>
                <p className="mt-4 text-base text-muted-foreground font-body">
                  {item.date}
                </p>
                <span className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary font-body group-hover:gap-2.5 transition-all duration-200">
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
