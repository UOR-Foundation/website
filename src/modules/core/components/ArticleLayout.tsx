import { ReactNode, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import Layout from "@/modules/core/components/Layout";
import { ArrowLeft, ArrowRight, Clock, Facebook, Linkedin, Link2, Mail, Twitter } from "lucide-react";
import { toast } from "sonner";

export interface ArticleRelated {
  title: string;
  href: string;
  meta?: string;
}

export interface ArticleLayoutProps {
  /** Top meta: category or tag chip */
  kicker: string;
  /** Date string already formatted, e.g. "April 21, 2026" */
  date?: string;
  /** Optional override; otherwise estimated from children text */
  readTime?: string;
  /** Headline */
  title: string;
  /** Standfirst / deck — single muted paragraph below headline */
  deck?: string;
  /** Byline author name */
  author?: string;
  /** Hero image src */
  heroImage?: string;
  /** Italic caption under hero */
  heroCaption?: string;
  /** Hide cover (e.g. for video-led posts) */
  hideHero?: boolean;
  /** Optional content rendered above hero, e.g. a YouTube embed */
  heroOverride?: ReactNode;
  /** Back-link config */
  backHref?: string;
  backLabel?: string;
  /** Optional source/repo link shown in footer */
  sourceUrl?: string;
  sourceLabel?: string;
  /** Related items shown at the foot */
  related?: ArticleRelated[];
  relatedLabel?: string;
  /** Optional sidebar block rendered after children, before related strip */
  afterBody?: ReactNode;
  /** Body content — already wrapped paragraphs / sections */
  children: ReactNode;
}

/**
 * Estimate reading time from a React subtree by walking children for strings.
 * ~200 wpm. Falls back to "3 min read".
 */
function estimateReadTime(node: ReactNode): string {
  let words = 0;
  const visit = (n: ReactNode) => {
    if (n == null || typeof n === "boolean") return;
    if (typeof n === "string" || typeof n === "number") {
      words += String(n).trim().split(/\s+/).filter(Boolean).length;
      return;
    }
    if (Array.isArray(n)) { n.forEach(visit); return; }
    if (typeof n === "object" && n !== null) {
      const maybeEl = n as unknown as { props?: { children?: ReactNode } };
      if (maybeEl.props && "children" in maybeEl.props) {
        visit(maybeEl.props.children);
      }
    }
  };
  try { visit(node); } catch { /* ignore */ }
  if (words < 50) return "3 min read";
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

/**
 * ArticleLayout — shared TechCrunch-style editorial shell.
 * Used by project detail pages and blog post pages so both surfaces
 * read like one publication.
 */
const ArticleLayout = ({
  kicker,
  date,
  readTime,
  title,
  deck,
  heroImage,
  heroCaption,
  hideHero,
  heroOverride,
  backHref = "/",
  backLabel = "Back",
  sourceUrl,
  sourceLabel,
  related,
  relatedLabel = "Related reading",
  afterBody,
  children,
}: ArticleLayoutProps) => {
  const computedReadTime = useMemo(
    () => readTime ?? estimateReadTime(children),
    [readTime, children],
  );

  return (
    <Layout>
      <article className="pt-32 md:pt-36 pb-16 md:pb-24 bg-background">
        {/* Split hero: image left, headline block right (stacks on mobile) */}
        <header className="container px-6 md:px-8 lg:px-10">
          {!hideHero && (heroOverride || heroImage) ? (
            <div className="mx-auto max-w-[1180px] grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              {/* Image column */}
              <div className="lg:col-span-6 order-1 animate-fade-in-up" style={{ animationDelay: "0.04s" }}>
                {heroOverride ? (
                  heroOverride
                ) : (
                  <figure>
                    <div className="rounded-2xl overflow-hidden border border-border bg-muted/40 aspect-[16/10] lg:aspect-[4/5] shadow-[0_20px_60px_-30px_hsl(var(--foreground)/0.35)]">
                      <img
                        src={heroImage}
                        alt={title}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>
                    {heroCaption && (
                      <figcaption className="mt-3 text-sm italic text-muted-foreground font-body">
                        {heroCaption}
                      </figcaption>
                    )}
                  </figure>
                )}
              </div>

              {/* Text column */}
              <div className="lg:col-span-6 order-2 flex flex-col">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] uppercase tracking-[0.14em] font-semibold text-muted-foreground font-body mb-5 animate-fade-in-up">
                  <span className="inline-flex items-center gap-1.5 text-primary">
                    <TagIcon size={12} strokeWidth={2.5} />
                    {kicker}
                  </span>
                  {date && (
                    <>
                      <span aria-hidden className="text-muted-foreground/50">·</span>
                      <span className="inline-flex items-center gap-1.5 normal-case tracking-normal font-medium text-muted-foreground/80">
                        <Calendar size={12} />
                        {date}
                      </span>
                    </>
                  )}
                  <span aria-hidden className="text-muted-foreground/50">·</span>
                  <span className="inline-flex items-center gap-1.5 normal-case tracking-normal font-medium text-muted-foreground/80">
                    <Clock size={12} />
                    {computedReadTime}
                  </span>
                </div>

                <h1
                  className="font-display font-bold tracking-tight text-foreground text-balance animate-fade-in-up"
                  style={{ fontSize: "clamp(2.25rem, 4.4vw, 3.5rem)", lineHeight: 1.08, animationDelay: "0.04s" }}
                >
                  {title}
                </h1>

                {deck && (
                  <p
                    className="mt-6 text-[1.25rem] text-muted-foreground font-body text-balance animate-fade-in-up"
                    style={{ lineHeight: 1.55, animationDelay: "0.08s" }}
                  >
                    {deck}
                  </p>
                )}

                <Link
                  to={backHref}
                  className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors font-body self-start"
                >
                  <ArrowLeft size={14} />
                  {backLabel}
                </Link>
              </div>
            </div>
          ) : (
            // No hero: centered single-column header
            <div className="mx-auto max-w-[820px]">
              <Link
                to={backHref}
                className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors font-body mb-8"
              >
                <ArrowLeft size={14} />
                {backLabel}
              </Link>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] uppercase tracking-[0.14em] font-semibold text-muted-foreground font-body mb-5">
                <span className="inline-flex items-center gap-1.5 text-primary">
                  <TagIcon size={12} strokeWidth={2.5} />
                  {kicker}
                </span>
                {date && (
                  <>
                    <span aria-hidden className="text-muted-foreground/50">·</span>
                    <span className="inline-flex items-center gap-1.5 normal-case tracking-normal font-medium text-muted-foreground/80">
                      <Calendar size={12} />
                      {date}
                    </span>
                  </>
                )}
                <span aria-hidden className="text-muted-foreground/50">·</span>
                <span className="inline-flex items-center gap-1.5 normal-case tracking-normal font-medium text-muted-foreground/80">
                  <Clock size={12} />
                  {computedReadTime}
                </span>
              </div>
              <h1
                className="font-display font-bold tracking-tight text-foreground text-balance"
                style={{ fontSize: "clamp(2.25rem, 5vw, 3.75rem)", lineHeight: 1.08 }}
              >
                {title}
              </h1>
              {deck && (
                <p
                  className="mt-6 text-[1.375rem] text-muted-foreground font-body text-balance"
                  style={{ lineHeight: 1.55 }}
                >
                  {deck}
                </p>
              )}
            </div>
          )}

          {/* Hairline divider under the hero */}
          <div className="mx-auto max-w-[1180px] mt-12 md:mt-16 border-t border-border" />
        </header>

        {/* Body — single 820px reading column */}
        <div className="container px-6 md:px-8 lg:px-10 mt-12 md:mt-16">
          <div className="mx-auto max-w-[820px] prose-article">
            {children}
          </div>

          {afterBody && (
            <div className="mx-auto max-w-[820px] mt-12">
              {afterBody}
            </div>
          )}

          {/* Footer: source + related strip */}
          {(sourceUrl || (related && related.length > 0)) && (
            <footer className="mx-auto max-w-[820px] mt-16 pt-8 border-t border-border">
              {sourceUrl && (
                <p className="text-sm text-muted-foreground font-body mb-8">
                  Source:{" "}
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground hover:text-primary underline underline-offset-4"
                  >
                    {sourceLabel || sourceUrl}
                  </a>
                </p>
              )}

              {related && related.length > 0 && (
                <div>
                  <p className="text-[12px] uppercase tracking-[0.18em] font-semibold text-muted-foreground font-body mb-5">
                    {relatedLabel}
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {related.slice(0, 4).map((item) => (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          className="group block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
                        >
                          {item.meta && (
                            <p className="text-[11px] uppercase tracking-[0.16em] font-semibold text-muted-foreground/80 mb-2">
                              {item.meta}
                            </p>
                          )}
                          <p className="font-display text-base font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                            {item.title}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground group-hover:text-primary transition-colors">
                            Read <ArrowRight size={13} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </footer>
          )}
        </div>
      </article>
    </Layout>
  );
};

export default ArticleLayout;