import { ArrowRight } from "lucide-react";
import { highlights } from "@/data/highlights";
import { getBlogCover } from "@/data/blog-covers";

const HighlightsSection = () => {
  return (
    <section className="py-14 md:py-20 bg-background">
      <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%] px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
        <div className="mb-golden-lg">
          <p className="font-body font-semibold tracking-[0.2em] uppercase text-primary/70 text-fluid-lead mb-golden-sm">
            Updates
          </p>
          <h2 className="font-display font-bold text-foreground text-fluid-heading">
            Latest research and releases.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-golden-lg gap-y-golden-xl">
          {highlights.map((item, index) => (
            <a
              key={item.title}
              href={item.href}
              {...(item.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="highlight-card group animate-fade-in-up opacity-0"
              style={{ animationDelay: `${0.11 + index * 0.11}s` }}
            >
              <div className="relative aspect-phi overflow-hidden">
                <img
                  src={getBlogCover(item.imageKey)}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-col flex-1 p-golden-md">
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
                  Read <ArrowRight size={14} />
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
