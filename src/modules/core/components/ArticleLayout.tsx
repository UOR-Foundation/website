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
  const railItemClass =
    "p-2 rounded-full text-muted-foreground/80 hover:bg-background/60 hover:text-foreground transition-colors";

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
      className={`hidden lg:flex fixed left-4 xl:left-6 top-1/2 z-40 flex-col items-center gap-1 p-2 rounded-full bg-background/60 backdrop-blur border border-border/30 transition-all duration-500 ease-out ${
        railVisible
          ? "opacity-100 -translate-y-1/2 pointer-events-auto"
          : "opacity-0 -translate-y-[40%] pointer-events-none"
      }`}
    >
      <a aria-label="Share on Facebook" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className={railItemClass}>
        <Facebook size={16} />
      </a>
      <a aria-label="Share on X" href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`} target="_blank" rel="noopener noreferrer" className={railItemClass}>
        <Twitter size={16} />
      </a>
      <a aria-label="Share on LinkedIn" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" className={railItemClass}>
        <Linkedin size={16} />
      </a>
      <a aria-label="Share via Email" href={`mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`} className={railItemClass}>
        <Mail size={16} />
      </a>
      <button aria-label="Copy link" onClick={copyLink} className={railItemClass}>
        <Link2 size={16} />
      </button>
    </aside>
  );

  return (
    <Layout>
      <FloatingShareRail />
      <article className="pt-24 md:pt-28 pb-16 md:pb-24 bg-background">
        {/* Aman-inspired stacked masthead — one element per row, generous air */}
        <header className="mx-auto w-full max-w-[1280px] px-6 md:px-10 lg:px-14">
          <div className="flex flex-col items-center text-center py-10 md:py-14 lg:py-16 animate-fade-in-up" style={{ animationDelay: "0.04s" }}>
            {/* Centered kicker — Aman-style micro label */}
            <span className="text-[11px] md:text-[12px] uppercase tracking-[0.32em] font-medium text-primary/70 font-body mb-8 md:mb-10">
              {kicker}
            </span>

            {/* Cinematic 21:9 image, breathes alone */}
            {!hideHero && (heroOverride || heroImage) && (
              <figure className="w-full mb-6 md:mb-8">
                {heroOverride ? (
                  heroOverride
                ) : (
                  <>
                    <div className="bg-muted/40 w-full overflow-hidden aspect-[21/9] max-h-[52vh]">
                      <img
                        src={heroImage}
                        alt={title}
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>
                    {heroCaption && (
                      <figcaption className="mt-4 text-[12px] italic font-display text-muted-foreground/60 text-center">
                        Image credits: {heroCaption}
                      </figcaption>
                    )}
                  </>
                )}
              </figure>
            )}

            {/* Title — quiet authority */}
            <h1
              className="font-display text-foreground text-balance mt-6 md:mt-10"
              style={{
                fontSize: "clamp(2rem, 3.6vw, 4rem)",
                lineHeight: 1.1,
                letterSpacing: "0.01em",
                fontWeight: 400,
                maxWidth: "clamp(680px, 60vw, 980px)",
              }}
            >
              {title}
            </h1>

            {/* Single hairline meta line */}
            <div className="mt-6 md:mt-8 text-[13px] text-muted-foreground font-body">
              <span className="text-foreground/80">{author}</span>
              {date && <> <span className="mx-2 text-muted-foreground/40">·</span> <span>{date}</span></>}
            </div>

            {/* Inline share row — small, muted, sits below meta */}
            <div className="mt-6 opacity-70">
              <ShareRow />
            </div>
          </div>
        </header>

        {/* Body — narrow, Aman-grade reading column */}
        <div className="px-4 sm:px-6 md:px-10 lg:px-14 xl:px-20 mt-12 md:mt-16 lg:mt-20">
          <div className="mx-auto prose-article" style={{ maxWidth: "clamp(620px, 58vw, 760px)" }}>
            {deck && <p>{deck}</p>}
            {children}
          </div>

          {afterBody && (
            <div className="mx-auto mt-12" style={{ maxWidth: "clamp(620px, 58vw, 760px)" }}>
              {afterBody}
            </div>
          )}

          {/* Footer: source + related strip */}
          {(sourceUrl || (related && related.length > 0)) && (
            <footer className="mx-auto mt-20 md:mt-24" style={{ maxWidth: "clamp(680px, 82vw, 1280px)" }}>
              <div className="rule-prime mb-10" />
              {sourceUrl && (
                <p className="text-sm xl:text-base text-muted-foreground font-body mb-8" style={{ maxWidth: "clamp(620px, 58vw, 760px)" }}>
                  <span className="uppercase tracking-[0.2em] font-semibold text-primary/70 text-[12.5px] xl:text-[13.5px] mr-2">Source:</span>
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
                  <p className="text-[12.5px] xl:text-[13.5px] uppercase tracking-[0.2em] font-semibold text-primary/70 font-body mb-6">
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
                  <div className="rule-prime mt-12" />
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