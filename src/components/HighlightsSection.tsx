import { FileText, Megaphone, CalendarDays, ArrowRight } from "lucide-react";

const highlights = [
  {
    icon: FileText,
    title: "Research",
    description:
      "Latest findings and publications from the UOR research community.",
    cta: "View research",
    href: "/research",
  },
  {
    icon: Megaphone,
    title: "Announcements",
    description:
      "Updates on the standard, governance, and foundation milestones.",
    cta: "Read updates",
    href: "/about",
  },
  {
    icon: CalendarDays,
    title: "Events",
    description:
      "Upcoming workshops, talks, and community gatherings.",
    cta: "See events",
    href: "/about",
  },
];

const HighlightsSection = () => {
  return (
    <section className="py-14 md:py-20 bg-background">
      <div className="container max-w-5xl">
        <p className="text-sm md:text-base font-body font-medium tracking-widest uppercase text-muted-foreground/60 mb-3">
          Highlights
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {highlights.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              className="group flex flex-col bg-card rounded-2xl border border-border p-7 md:p-9 hover:shadow-lg hover:border-primary/20 transition-all duration-300 animate-fade-in-up opacity-0"
              style={{ animationDelay: `${0.1 + index * 0.1}s` }}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105">
                <item.icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-3">
                {item.title}
              </h3>
              <p className="text-muted-foreground font-body text-base leading-relaxed flex-1">
                {item.description}
              </p>
              <span className="inline-flex items-center gap-1.5 text-base font-medium text-primary font-body transition-all duration-300 group-hover:gap-2.5 mt-6">
                {item.cta}
                <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HighlightsSection;
