import { useMemo, useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, LayoutGrid, List } from "lucide-react";
import { newsItems, type NewsCategory, type NewsItem } from "@/data/news-items";
import { getBlogCover } from "@/data/blog-covers";

const CATEGORIES: ("All" | NewsCategory)[] = [
  "All",
  "Engineering",
  "Research",
  "Company",
  "Community",
];

type ViewMode = "list" | "grid";

const NewsPage = () => {
  const [filter, setFilter] = useState<"All" | NewsCategory>("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [view, setView] = useState<ViewMode>("list");

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
              <ul className="flex lg:flex-col flex-wrap gap-1">
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
                          className={`text-fluid-caption tabular-nums ${
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

              <p className="font-semibold tracking-[0.2em] uppercase text-foreground/55 font-body text-fluid-caption mt-8 mb-3">
                Sort by
              </p>
              <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
                {(["newest", "oldest"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-3 py-1.5 rounded-md text-fluid-caption font-body transition-colors ${
                      sort === s
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {s === "newest" ? "Newest" : "Oldest"}
                  </button>
                ))}
              </div>

              <p className="font-semibold tracking-[0.2em] uppercase text-foreground/55 font-body text-fluid-caption mt-8 mb-3">
                View
              </p>
              <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
                <button
                  onClick={() => setView("list")}
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-fluid-caption font-body transition-colors ${
                    view === "list"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <List size={14} /> List
                </button>
                <button
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-fluid-caption font-body transition-colors ${
                    view === "grid"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <LayoutGrid size={14} /> Grid
                </button>
              </div>
            </aside>

            {/* Content */}
            <div>
              {/* Toolbar */}
              <div className="flex items-end justify-between gap-4 mb-6 pb-4 border-b border-border/60">
                <p className="text-fluid-caption text-foreground/55 font-body tabular-nums">
                  {items.length} {items.length === 1 ? "item" : "items"}
                  {filter !== "All" && (
                    <>
                      {" "}in <span className="text-foreground/80">{filter}</span>
                    </>
                  )}
                </p>
              </div>

              {items.length === 0 ? (
                <p className="text-foreground/60 font-body py-12">
                  No items in this category yet.
                </p>
              ) : view === "list" ? (
                <ul className="divide-y divide-border/60">
                  {items.map((item) => (
                    <li key={item.href}>
                      <NewsRow item={item} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {items.map((item) => (
                    <NewsCard key={item.href} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

/* ─── Row (list view) ─────────────────────────────────────────────── */
const NewsRow = ({ item }: { item: NewsItem }) => {
  const Wrapper: React.ElementType = item.external ? "a" : Link;
  const wrapperProps: Record<string, unknown> = item.external
    ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
    : { to: item.href };

  return (
    <Wrapper
      {...wrapperProps}
      className="group grid grid-cols-[110px_1fr_auto] md:grid-cols-[140px_1fr_auto] items-baseline gap-5 md:gap-8 py-6 md:py-7 transition-colors"
    >
      {/* Date */}
      <time
        dateTime={item.isoDate}
        className="text-fluid-caption font-body text-foreground/50 tabular-nums tracking-wide whitespace-nowrap pt-0.5"
      >
        {item.date}
      </time>

      {/* Title + excerpt */}
      <div className="min-w-0">
        <div className="flex items-center gap-3 mb-1.5">
          <span className="text-fluid-caption font-medium font-body uppercase tracking-[0.14em] text-primary/80">
            {item.category}
          </span>
        </div>
        <h2 className="font-display text-fluid-card-title font-semibold text-foreground leading-snug transition-colors duration-200 group-hover:text-primary">
          {item.title}
        </h2>
        <p className="mt-2 text-fluid-body text-foreground/65 font-body leading-relaxed line-clamp-2 max-w-3xl">
          {item.excerpt}
        </p>
      </div>

      {/* Affordance */}
      <span className="hidden md:inline-flex self-center text-foreground/30 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5">
        {item.external ? <ArrowUpRight size={18} /> : <ArrowRight size={18} />}
      </span>
    </Wrapper>
  );
};

/* ─── Card (grid view) ────────────────────────────────────────────── */
const NewsCard = ({ item }: { item: NewsItem }) => {
  const Wrapper: React.ElementType = item.external ? "a" : Link;
  const wrapperProps: Record<string, unknown> = item.external
    ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
    : { to: item.href };

  return (
    <Wrapper
      {...wrapperProps}
      className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20"
    >
      {item.coverKey && (
        <div className="overflow-hidden bg-card aspect-video">
          <img
            src={getBlogCover(item.coverKey)}
            alt={item.title}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-fluid-caption font-medium font-body uppercase tracking-[0.14em] text-primary/80">
            {item.category}
          </span>
          <span className="text-fluid-caption text-foreground/50 font-body tabular-nums">
            {item.date}
          </span>
        </div>
        <h2 className="font-display text-fluid-card-title font-semibold text-foreground mb-2 transition-colors duration-300 group-hover:text-primary">
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
