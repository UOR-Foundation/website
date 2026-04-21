import { ReactNode, useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/modules/core/components/Layout";
import { ArrowLeft, ArrowRight, Facebook, Linkedin, Link2, Mail, Twitter } from "lucide-react";
import { toast } from "sonner";

export interface ArticleRelated {
  title: string;
  href: string;
  meta?: string;
  image?: string;
}

export interface ArticleLayoutProps {
  /** Top meta: category or tag chip */
  kicker: string;
  /** Date string already formatted, e.g. "April 21, 2026" */
  date?: string;
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
 * ArticleLayout — shared TechCrunch-style editorial shell.
 * Used by project detail pages and blog post pages so both surfaces
 * read like one publication.
 */
const ArticleLayout = ({
  kicker,
  date,
  title,
  deck,
  author = "UOR Foundation",
  heroImage,
  heroCaption,
  hideHero,
  heroOverride,
  backHref = "/",
  backLabel = "Back",
  sourceUrl,
  sourceLabel,
  related,
  relatedLabel = "Read next",
  afterBody,
  children,
}: ArticleLayoutProps) => {
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = title;
  const copyLink = useCallback(() => {
    if (typeof window === "undefined") return;
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  }, []);

  const shareItemClass =
    "p-2 rounded-full text-muted-foreground hover:bg-background/60 hover:text-foreground transition-colors";

  const ShareRow = ({ size = 15 }: { size?: number }) => (
    <div className="flex items-center gap-1">
      <a aria-label="Share on Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className={shareItemClass}>
        <Facebook size={size} />
      </a>
      <a aria-label="Share on X" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`} target="_blank" rel="noopener noreferrer" className={shareItemClass}>
        <Twitter size={size} />
      </a>
      <a aria-label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className={shareItemClass}>
        <Linkedin size={size} />
      </a>
      <a aria-label="Share via Email" href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`} className={shareItemClass}>
        <Mail size={size} />
      </a>
      <button aria-label="Copy link" onClick={copyLink} className={shareItemClass}>
        <Link2 size={size} />
      </button>
    </div>
  );

  const [railVisible, setRailVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setRailVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // TechCrunch-style vertical floating share rail (left edge, sticky)
  const FloatingShareRail = () => (
    <aside
      aria-label="Share this article"
      aria-hidden={!railVisible}
      className={`hidden lg:flex fixed left-4 xl:left-6 top-1/2 z-40 flex-col items-center gap-1 p-2 rounded-full bg-card/85 backdrop-blur border border-border/60 shadow-sm transition-all duration-500 ease-out ${
        railVisible
          ? "opacity-100 -translate-y-1/2 pointer-events-auto"
          : "opacity-0 -translate-y-[40%] pointer-events-none"
      }`}
    >
      <a aria-label="Share on Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className={shareItemClass}>
        <Facebook size={15} />
      </a>
      <a aria-label="Share on X" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`} target="_blank" rel="noopener noreferrer" className={shareItemClass}>
        <Twitter size={15} />
      </a>
      <a aria-label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className={shareItemClass}>
        <Linkedin size={15} />
      </a>
      <a aria-label="Share via Email" href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`} className={shareItemClass}>
        <Mail size={15} />
      </a>
      <button aria-label="Copy link" onClick={copyLink} className={shareItemClass}>
        <Link2 size={15} />
      </button>
    </aside>
  );

  return (
    <Layout>
      <FloatingShareRail />
      <article className="pt-24 md:pt-28 pb-16 md:pb-24 bg-background">
        {/* TechCrunch-style edge-to-edge masthead */}
        <header className="mx-auto w-full max-w-[1920px] 2xl:border-x 2xl:border-border/60">
          {!hideHero && (heroOverride || heroImage) ? (
            <div className="grid grid-cols-1 lg:grid-cols-[58%_42%] items-stretch">
              {/* Image — full bleed left */}
              <div className="order-1 animate-fade-in-up" style={{ animationDelay: "0.04s" }}>
                {heroOverride ? (
                  heroOverride
                ) : (
                  <figure className="h-full">
                    <div className="bg-muted/40 aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[560px] xl:min-h-[680px] 2xl:min-h-[780px] w-full overflow-hidden">
                      <img
                        src={heroImage}
                        alt={title}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>
                    {heroCaption && (
                      <figcaption className="px-6 md:px-8 lg:px-10 mt-3 mb-2 text-[10.5px] uppercase tracking-[0.22em] font-mono text-muted-foreground/80">
                        Image credits: {heroCaption}
                      </figcaption>
                    )}
                  </figure>
                )}
              </div>

              {/* Right panel */}
              <div
                className="order-2 bg-card flex flex-col justify-between lg:min-h-[560px] xl:min-h-[680px] 2xl:min-h-[780px] animate-fade-in-up"
                style={{ animationDelay: "0.04s", padding: "clamp(2rem, 3.6vw, 5rem)" }}
              >
                <div className="flex items-start justify-between gap-6">
                  <span className="text-[11.5px] uppercase tracking-[0.22em] font-semibold text-foreground/80 font-body">
                    {kicker}
                  </span>
                  <ShareRow />
                </div>

                <h1
                  className="font-display font-bold tracking-tight text-foreground text-balance normal-case my-10 max-w-[14ch] xl:max-w-[16ch] 2xl:max-w-[18ch]"
                  style={{ fontSize: "clamp(2rem, 3.6vw, 5.5rem)", lineHeight: 1.05, letterSpacing: "-0.02em", textTransform: "none" }}
                >
                  {title}
                </h1>

                <div className="text-sm xl:text-base 2xl:text-lg text-muted-foreground font-body">
                  <span className="text-foreground font-semibold">{author}</span>
                  {date && <> <span className="mx-2 text-muted-foreground/50">—</span> <span>{date}</span></>}
                </div>
              </div>
            </div>
          ) : (
            // No hero: solid panel only
            <div className="bg-card px-6 md:px-10 lg:px-16 xl:px-20 py-12 md:py-16 xl:py-20">
              <div className="mx-auto max-w-[1180px]">
                <div className="flex items-start justify-between gap-6 mb-10">
                  <span className="text-[11.5px] uppercase tracking-[0.22em] font-semibold text-foreground/80 font-body">
                    {kicker}
                  </span>
                  <ShareRow />
                </div>
                <h1
                  className="font-display font-bold tracking-tight text-foreground text-balance max-w-[900px] normal-case"
                  style={{ fontSize: "clamp(2rem, 4vw, 4rem)", lineHeight: 1.05, letterSpacing: "-0.02em", textTransform: "none" }}
                >
                  {title}
                </h1>
                <div className="mt-10 text-sm text-muted-foreground font-body">
                  <span className="text-foreground font-semibold">{author}</span>
                  {date && <> <span className="mx-2 text-muted-foreground/50">—</span> <span>{date}</span></>}
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Body — generous reading column that scales with viewport */}
        <div className="px-4 sm:px-6 md:px-10 lg:px-16 xl:px-24 2xl:px-32 mt-10 md:mt-14 xl:mt-20">
          <div className="mx-auto prose-article" style={{ maxWidth: "clamp(680px, 62vw, 1280px)" }}>
            {deck && <p>{deck}</p>}
            {children}
          </div>

          {afterBody && (
            <div className="mx-auto mt-12" style={{ maxWidth: "clamp(680px, 62vw, 1280px)" }}>
              {afterBody}
            </div>
          )}

          {/* Footer: source + related strip */}
          {(sourceUrl || (related && related.length > 0)) && (
            <footer className="mx-auto mt-16 pt-8 border-t border-border" style={{ maxWidth: "clamp(680px, 70vw, 1480px)" }}>
              {sourceUrl && (
                <p className="text-sm xl:text-base text-muted-foreground font-body mb-8" style={{ maxWidth: "clamp(680px, 62vw, 1280px)" }}>
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
                  <p className="text-[12px] uppercase tracking-[0.18em] font-semibold text-muted-foreground font-body mb-6">
                    {relatedLabel}
                  </p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {related.slice(0, 3).map((item) => (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
                        >
                          {item.image && (
                            <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                              <img
                                src={item.image}
                                alt={item.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              />
                            </div>
                          )}
                          <div className="flex flex-1 flex-col p-6">
                            {item.meta && (
                              <p className="text-[12px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/80 mb-4">
                                {item.meta}
                              </p>
                            )}
                            <p className="font-display text-[20px] md:text-[22px] font-semibold text-foreground leading-snug group-hover:text-primary transition-colors text-pretty">
                              {item.title}
                            </p>
                            <span className="mt-auto pt-6 inline-flex items-center gap-1.5 text-[16px] text-muted-foreground group-hover:text-primary transition-colors">
                              Read <ArrowRight size={16} />
                            </span>
                          </div>
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