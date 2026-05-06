import { useMemo, useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { newsItems, type NewsCategory } from "@/data/news-items";
import { getBlogCover } from "@/data/blog-covers";

const CATEGORIES: ("All" | NewsCategory)[] = [
  "All",
  "Engineering",
  "Research",
  "Company",
  "Community",
];

const NewsPage = () => {
  const [filter, setFilter] = useState<"All" | NewsCategory>("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: newsItems.length };
    for (const item of newsItems) {
      map[item.category] = (map[item.category] ?? 0) + 1;
    }
    return map;
  }, []);

  const items = useMemo(() => {
    const filtered =
      filter === "All" ? newsItems : newsItems.filter((i) => i.category === filter);
    return [...filtered].sort((a, b) =>
      sort === "newest"
        ? b.isoDate.localeCompare(a.isoDate)
        : a.isoDate.localeCompare(b.isoDate),
    );
  }, [filter, sort]);

  const [featured, ...rest] = items;

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-44 md:pt-56 pb-12 md:pb-20">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            News
          </p>
          <h1 className="font-display text-fluid-page-title font-bold text-foreground text-balance animate-fade-in-up">
            Latest Announcements
          </h1>
          <p
            className="mt-10 text-fluid-body text-foreground/70 font-body leading-relaxed animate-fade-in-up max-w-4xl"
            style={{ animationDelay: "0.15s" }}
          >
            Engineering updates, open research, and community milestones from the
            UOR Foundation.
          </p>
        </div>
      </section>

      {/* Newsroom */}
      <section className="py-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10 lg:gap-14">
            {/* Sidebar */}
            <aside className="lg:sticky lg:top-32 self-start">
              <p className="font-semibold tracking-[0.2em] uppercase text-foreground/55 font-body text-fluid-caption mb-4">
                Filter
              </p>
              <ul className="flex lg:flex-col flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const active = filter === cat;
                  return (
                    <li key={cat}>
                      <button
                        onClick={() => setFilter(cat)}
                        className={`group w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-fluid-label font-body transition-colors ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/70 hover:text-foreground hover:bg-card"
                        }`}
                      >
                        <span>{cat}</span>
                        <span
                          className={`text-fluid-caption ${
                            active ? "text-primary/80" : "text-foreground/40"
                          }`}
                        >
                          {counts[cat] ?? 0}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="font-semibold tracking-[0.2em] uppercase text-foreground/55 font-body text-fluid-caption mt-8 mb-4">
                Sort by
              </p>
              <div className="flex gap-2">
                {(["newest", "oldest"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-3 py-1.5 rounded-lg text-fluid-caption font-body transition-colors ${
                      sort === s
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/60 hover:text-foreground hover:bg-card"
                    }`}
                  >
                    {s === "newest" ? "Newest" : "Oldest"}
                  </button>
                ))}
              </div>
            </aside>

            {/* Content */}
            <div>
              {items.length === 0 ? (
                <p className="text-foreground/60 font-body">
                  No items in this category yet.
                </p>
              ) : (
                <>
                  {/* Featured */}
                  {featured && (
                    <NewsCard item={featured} featured />
                  )}

                  {/* Grid */}
                  {rest.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                      {rest.map((item) => (
                        <NewsCard key={item.href} item={item} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

const NewsCard = ({
  item,
  featured = false,
}: {
  item: (typeof newsItems)[number];
  featured?: boolean;
}) => {
  const Wrapper: React.ElementType = item.external ? "a" : Link;
  const wrapperProps: Record<string, unknown> = item.external
    ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
    : { to: item.href };

  return (
    <Wrapper
      {...wrapperProps}
      className={`group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20 ${
        featured ? "" : ""
      }`}
    >
      {item.coverKey && (
        <div
          className={`overflow-hidden bg-card ${
            featured ? "aspect-[16/8]" : "aspect-video"
          }`}
        >
          <img
            src={getBlogCover(item.coverKey)}
            alt={item.title}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
      )}
      <div className={`flex flex-col flex-1 ${featured ? "p-7 md:p-9" : "p-5"}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="px-3 py-1 rounded-full text-fluid-caption font-medium font-body bg-primary/10 text-primary">
            {item.category}
          </span>
          <span className="text-fluid-caption text-foreground/60 font-body">
            {item.date}
          </span>
        </div>
        <h2
          className={`font-display font-semibold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary ${
            featured ? "text-fluid-heading" : "text-fluid-card-title"
          }`}
        >
          {item.title}
        </h2>
        <p className="text-fluid-body text-foreground/70 font-body leading-relaxed">
          {item.excerpt}
        </p>
        <span className="inline-flex items-center gap-1.5 mt-auto pt-4 text-fluid-label font-medium text-foreground/45 group-hover:text-primary transition-colors duration-200 font-body">
          Read more {item.external ? <ArrowUpRight size={13} /> : <ArrowRight size={13} />}
        </span>
      </div>
    </Wrapper>
  );
};

export default NewsPage;
