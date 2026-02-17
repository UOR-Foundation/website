import { ArrowRight } from "lucide-react";
import highlightResearch from "@/assets/highlight-research.jpg";
import highlightAnnouncement from "@/assets/highlight-announcement.jpg";
import highlightEvent from "@/assets/highlight-event.jpg";

type TagType = "Research" | "Announcement" | "Event";

const tagStyles: Record<TagType, string> = {
  Research: "bg-primary/10 text-primary",
  Announcement: "bg-accent/10 text-accent",
  Event: "bg-foreground/8 text-foreground/70",
};

const highlights = [
  {
    tag: "Research" as TagType,
    title: "Formal Verification of Content-Addressed Data Primitives",
    date: "February 14, 2026",
    image: highlightResearch,
    href: "/research",
  },
  {
    tag: "Announcement" as TagType,
    title: "UOR Standard v2.0 Now Open for Community Review",
    date: "February 10, 2026",
    image: highlightAnnouncement,
    href: "/about",
  },
  {
    tag: "Event" as TagType,
    title: "Open Data Infrastructure Workshop at Stanford",
    date: "February 7, 2026",
    image: highlightEvent,
    href: "/about",
  },
];

const HighlightsSection = () => {
  return (
    <section className="py-10 md:py-16 bg-background">
      <div className="container max-w-5xl">
        <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-8">
          Highlights
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {highlights.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              className="group flex flex-col bg-card rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:border-border/60 transition-all duration-300 animate-fade-in-up opacity-0"
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <div className="relative aspect-[5/3] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col flex-1 p-6">
                <span
                  className={`self-start px-3 py-1 rounded-full text-xs font-medium font-body mb-4 ${tagStyles[item.tag]}`}
                >
                  {item.tag}
                </span>
                <h3 className="font-display text-lg md:text-xl font-semibold text-foreground leading-snug flex-1">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm text-muted-foreground font-body">
                  {item.date}
                </p>
              </div>
            </a>
          ))}
        </div>

      </div>
    </section>
  );
};

export default HighlightsSection;
