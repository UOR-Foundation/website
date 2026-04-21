import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Layout from "@/modules/core/components/Layout";
import { DISCORD_URL } from "@/data/external-links";

/**
 * ArticleLayout — the single canonical foundation post format.
 * Modeled on IBM Research blog: tight masthead (eyebrow / headline /
 * standfirst / meta), full-column hero with caption, and a 760px body
 * measure with generous H2 breathing room.
 */
export interface ArticleLayoutProps {
  eyebrow: string;
  title: string;
  standfirst?: string;
  date: string;
  authors?: string[];
  readTime?: string;
  heroImage?: string;
  heroAlt?: string;
  heroCaption?: string;
  heroNode?: ReactNode;
  backTo?: string;
  children: ReactNode;
}

const ArticleLayout = ({
  eyebrow,
  title,
  standfirst,
  date,
  authors = ["UOR Foundation Research"],
  readTime,
  heroImage,
  heroAlt,
  heroCaption,
  heroNode,
  backTo = "/research#blog",
  children,
}: ArticleLayoutProps) => {
  const metaParts = [date, ...(authors ?? []), ...(readTime ? [readTime] : [])];

  return (
    <Layout>
      <article className="pt-32 md:pt-40 pb-20 md:pb-28">
        <div className="container max-w-[1120px] px-6 lg:px-10">
          {/* Back link */}
          <Link
            to={backTo}
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors font-body mb-12"
          >
            <ArrowLeft size={15} />
            Back to Community
          </Link>

          {/* Masthead */}
          <header className="mb-10 md:mb-14 animate-fade-in-up">
            <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-primary font-body mb-5">
              {eyebrow}
            </p>
            <h1
              className="font-display font-bold text-foreground leading-[1.08] tracking-[-0.015em] mb-6"
              style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}
            >
              {title}
            </h1>
            {standfirst && (
              <p className="font-body text-muted-foreground leading-snug max-w-[760px] mb-7" style={{ fontSize: "1.25rem" }}>
                {standfirst}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground font-body">
              {metaParts.map((part, i) => (
                <span key={i} className="inline-flex items-center gap-3">
                  {i > 0 && <span aria-hidden className="opacity-40">·</span>}
                  <span>{part}</span>
                </span>
              ))}
            </div>
          </header>

          {/* Hero */}
          {(heroNode || heroImage) && (
            <figure
              className="mb-14 md:mb-16 animate-fade-in-up"
              style={{ animationDelay: "0.1s" }}
            >
              <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border border-border bg-card">
                {heroNode ? (
                  heroNode
                ) : (
                  <img
                    src={heroImage}
                    alt={heroAlt ?? title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                  />
                )}
              </div>
              {heroCaption && (
                <figcaption className="mt-3 text-[13px] italic text-muted-foreground leading-relaxed">
                  {heroCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Body */}
          <div className="max-w-[760px] mx-auto">
            <div className="prose-uor-wide">{children}</div>

            {/* CTA footer */}
            <div className="mt-20 pt-10 border-t border-border">
              <p className="text-muted-foreground font-body mb-5">
                Join our community of researchers, developers, and visionaries
                building the future of universal data representation.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Join Our Discord
                </a>
                <Link to="/community" className="btn-outline">
                  Back to Community
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>
    </Layout>
  );
};

export default ArticleLayout;