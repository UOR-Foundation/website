import { useEffect, useMemo, useState } from "react";
import Layout from "@/modules/core/components/Layout";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, LayoutGrid, List, Rss } from "lucide-react";
import { newsItems, type NewsCategory, type NewsItem } from "@/data/news-items";
import { getBlogCover } from "@/data/blog-covers";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const rssUrl = (category: "All" | NewsCategory) =>
  `${SUPABASE_URL ?? ""}/functions/v1/news-rss?category=${encodeURIComponent(category)}`;

const CATEGORIES: ("All" | NewsCategory)[] = [
  "All",
  "Engineering",
  "Research",
  "Foundation",
  "Community",
];

type ViewMode = "list" | "grid";

const formatShortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const NewsPage = () => {
  const [filter, setFilter] = useState<"All" | NewsCategory>("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [view, setView] = useState<ViewMode>("list");

  // RSS autodiscovery: expose two <link rel="alternate"> tags so feed
  // readers and browsers can find the All and Engineering feeds.
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    const add = (title: string, href: string) => {
      const el = document.createElement("link");
      el.rel = "alternate";
      el.type = "application/rss+xml";
      el.title = title;
      el.href = href;
      document.head.appendChild(el);
      links.push(el);
    };
    add("UOR Foundation, all news (RSS)", rssUrl("All"));
    add("UOR Foundation, Engineering (RSS)", rssUrl("Engineering"));
    return () => links.forEach((l) => l.remove());
  }, []);

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

  // Featured = most recent overall. Only shown when not filtered/sorted into a
  // different ordering so the highlight always reflects the true latest post.
  const featured = useMemo(
    () =>
      [...newsItems].sort((a, b) => b.isoDate.localeCompare(a.isoDate))[0],
    [],
  );
  const showFeatured = filter === "All" && sort === "newest";
  const listItems = showFeatured
    ? items.filter((i) => i.href !== featured?.href)
    : items;

  return (
    <Layout>
      {/* Hero */}
      <section className="hero-gradient pt-44 md:pt-56 pb-8 md:pb-10">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <p className="font-semibold tracking-[0.2em] uppercase text-primary/70 font-body text-fluid-lead mb-golden-md">
            News
          </p>
          <h1 className="font-display text-fluid-page-title font-bold text-foreground text-balance animate-fade-in-up">
            Latest Announcements
          </h1>
          <p
            className="mt-10 text-fluid-body text-foreground/75 font-body leading-relaxed animate-fade-in-up max-w-3xl"
            style={{ animationDelay: "0.15s" }}
          >
            Releases, research, and milestones from the UOR Foundation,
            updated as the work ships.
          </p>
        </div>
      </section>

      {/* Newsroom */}
      <section className="pt-10 md:pt-14 pb-section-sm bg-background border-b border-border/40">
        <div className="container px-6 md:px-[5%] lg:px-[6%] xl:px-[7%]">
          <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-10 lg:gap-16">
            {/* Sidebar */}
            <aside className="lg:sticky lg:top-28 self-start">
              <p className="font-semibold tracking-[0.18em] uppercase text-foreground/55 font-body text-[13px] mb-3">
                Filter
              </p>
              <ul className="flex lg:flex-col flex-wrap gap-0.5">
                {CATEGORIES.map((cat) => {
                  const active = filter === cat;
                  return (
                    <li key={cat}>
                      <button
                        onClick={() => setFilter(cat)}
                        className={`group w-full flex items-center justify-between gap-3 pl-3 pr-2 py-2.5 rounded-md text-[16px] font-body transition-colors border-l-2 ${
                          active
                            ? "border-primary text-primary bg-primary/[0.06]"
                            : "border-transparent text-foreground/65 hover:text-foreground hover:bg-foreground/[0.03]"
                        }`}
                      >
                        <span>{cat}</span>
                        <span
                          className={`text-[14px] tabular-nums min-w-[20px] text-right ${
                            active ? "text-primary/80" : "text-foreground/35"
                          }`}
                        >
                          {counts[cat] ?? 0}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              <p className="font-semibold tracking-[0.18em] uppercase text-foreground/55 font-body text-[13px] mt-7 mb-2.5">
                Subscribe
              </p>
              <a
                href={rssUrl(filter)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border/70 bg-card text-[14px] font-body text-foreground/75 hover:text-primary hover:border-primary/40 transition-colors"
                aria-label={`RSS feed for ${filter} news`}
              >
                <Rss size={15} /> RSS · {filter}
              </a>

              <p className="font-semibold tracking-[0.18em] uppercase text-foreground/55 font-body text-[13px] mt-7 mb-2.5">
                Sort by
              </p>
              <div className="inline-flex rounded-md border border-border/70 bg-card p-0.5">
                {(["newest", "oldest"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSort(s)}
                    className={`px-3.5 py-2 rounded text-[14px] font-body transition-colors ${
                      sort === s
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {s === "newest" ? "Newest" : "Oldest"}
                  </button>
                ))}
              </div>

              <p className="font-semibold tracking-[0.18em] uppercase text-foreground/55 font-body text-[13px] mt-7 mb-2.5">
                View
              </p>
              <div className="inline-flex rounded-md border border-border/70 bg-card p-0.5">
                <button
                  onClick={() => setView("list")}
                  aria-label="List view"
                  aria-pressed={view === "list"}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-[14px] font-body transition-colors ${
                    view === "list"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <List size={15} /> List
                </button>
                <button
                  onClick={() => setView("grid")}
                  aria-label="Grid view"
                  aria-pressed={view === "grid"}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded text-[14px] font-body transition-colors ${
                    view === "grid"
                      ? "bg-primary/10 text-primary"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <LayoutGrid size={15} /> Grid
                </button>
              </div>
            </aside>

            {/* Content */}
            <div className="w-full min-w-0">
              {showFeatured && featured && (
                <FeaturedNews item={featured} />
              )}
              {/* Toolbar */}
              <div className="flex items-end justify-between gap-4 mb-3">
                <p className="text-[11px] uppercase tracking-[0.14em] text-foreground/45 font-body tabular-nums">
                  {showFeatured ? "More stories" : `${items.length} ${items.length === 1 ? "item" : "items"}`}
                  {filter !== "All" && (
                    <>
                      {" "}in <span className="text-foreground/70">{filter}</span>
                    </>
                  )}
                </p>
              </div>

              {listItems.length === 0 ? (
                <p className="text-foreground/60 font-body py-12">
                  {showFeatured ? "No additional stories yet." : "No items in this category yet."}
                </p>
              ) : view === "list" ? (
                <ul className="divide-y divide-border/40 border-t border-border/40">
                  {listItems.map((item) => (
                    <li key={item.href}>
                      <NewsRow item={item} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {listItems.map((item) => (
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

/* ─── Featured (highlighted hero post) ────────────────────────────── */
const FeaturedNews = ({ item }: { item: NewsItem }) => {
  const Wrapper: React.ElementType = item.external ? "a" : Link;
  const wrapperProps: Record<string, unknown> = item.external
    ? { href: item.href, target: "_blank", rel: "noopener noreferrer" }
    : { to: item.href };

  return (
    <Wrapper
      {...wrapperProps}
      className="group block mb-[1.618rem] md:mb-[2.618rem] rounded-xl overflow-hidden border border-border/60 bg-card transition-all duration-300 hover:border-primary/40 hover:shadow-lg"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1.618fr_1fr]">
        {item.coverKey && (
          <div className="overflow-hidden bg-background/40 aspect-[1.618/1] md:aspect-[1.618/1]">
            <img
              src={getBlogCover(item.coverKey)}
              alt=""
              aria-hidden="true"
              loading="eager"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />
          </div>
        )}
        <div className="flex flex-col justify-center p-[1.618rem] md:p-[2.618rem] gap-[1rem]">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold font-body uppercase tracking-[0.18em] text-primary px-2 py-1 rounded bg-primary/10">
              Featured
            </span>
            <span className="text-[11px] font-semibold font-body uppercase tracking-[0.16em] text-primary/75">
              {item.category}
            </span>
            <time
              dateTime={item.isoDate}
              className="text-[11px] uppercase tracking-[0.14em] font-body text-foreground/45 tabular-nums"
            >
              {formatShortDate(item.isoDate)}
            </time>
          </div>
          <h2 className="font-display text-fluid-card-title font-bold text-foreground leading-[1.15] tracking-tight transition-colors duration-200 group-hover:text-primary">
            {item.title}
          </h2>
          <p className="text-[14px] md:text-[15px] text-foreground/70 font-body leading-[1.618] line-clamp-2 max-w-2xl">
            {item.excerpt}
          </p>
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary font-body">
            Read story
            <span className="transition-transform duration-200 group-hover:translate-x-0.5">
              {item.external ? <ArrowUpRight size={14} /> : <ArrowRight size={14} />}
            </span>
          </span>
        </div>
      </div>
    </Wrapper>
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
      className="group grid grid-cols-[1fr_auto] md:grid-cols-[280px_1fr_140px] items-start gap-5 md:gap-10 py-6 md:py-7 px-3 -mx-3 rounded-md transition-colors hover:bg-foreground/[0.02]"
    >
      {/* Cover thumbnail */}
      <div className="hidden md:block overflow-hidden rounded-lg bg-card border border-border/50 aspect-phi">
        {item.coverKey ? (
          <img
            src={getBlogCover(item.coverKey)}
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
      </div>

      {/* Title + excerpt */}
      <div className="min-w-0 pt-1">
        <p className="text-[10px] font-semibold font-body uppercase tracking-[0.16em] text-primary/75 mb-1.5">
          {item.category}
        </p>
        <h2 className="font-display text-fluid-card-title font-semibold text-foreground leading-[1.2] tracking-tight transition-colors duration-200 group-hover:text-primary">
          {item.title}
        </h2>
        <p className="mt-2 text-[14px] md:text-[15px] text-foreground/60 font-body leading-relaxed line-clamp-2 max-w-3xl">
          {item.excerpt}
        </p>
      </div>

      {/* Date + affordance (right rail) */}
      <div className="hidden md:flex items-center justify-end gap-3 pt-2 whitespace-nowrap">
        <time
          dateTime={item.isoDate}
          className="text-[11px] uppercase tracking-[0.14em] font-body text-foreground/45 tabular-nums"
        >
          {formatShortDate(item.isoDate)}
        </time>
        <span className="text-foreground/25 transition-all duration-200 group-hover:text-primary group-hover:translate-x-0.5">
          {item.external ? <ArrowUpRight size={16} /> : <ArrowRight size={16} />}
        </span>
      </div>

      {/* Mobile date */}
      <time
        dateTime={item.isoDate}
        className="md:hidden text-[11px] uppercase tracking-[0.14em] font-body text-foreground/45 tabular-nums pt-1.5 self-start"
      >
        {formatShortDate(item.isoDate)}
      </time>
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
      className="group flex flex-col rounded-lg border border-border/70 bg-card overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      {item.coverKey && (
        <div className="overflow-hidden bg-card aspect-phi">
          <img
            src={getBlogCover(item.coverKey)}
            alt={item.title}
            className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-semibold font-body uppercase tracking-[0.16em] text-primary/75">
            {item.category}
          </span>
          <span className="text-[11px] text-foreground/45 font-body tabular-nums uppercase tracking-[0.12em]">
            {formatShortDate(item.isoDate)}
          </span>
        </div>
        <h2 className="font-display text-fluid-card-title font-semibold text-foreground mb-2 leading-[1.2] tracking-tight transition-colors duration-300 group-hover:text-primary">
          {item.title}
        </h2>
        <p className="text-[14px] md:text-[15px] text-foreground/65 font-body leading-relaxed line-clamp-3">
          {item.excerpt}
        </p>
        <span className="inline-flex items-center gap-1.5 mt-4 text-[12px] font-medium text-foreground/50 group-hover:text-primary transition-colors duration-200 font-body">
          Read more {item.external ? <ArrowUpRight size={12} /> : <ArrowRight size={12} />}
        </span>
      </div>
    </Wrapper>
  );
};

export default NewsPage;
