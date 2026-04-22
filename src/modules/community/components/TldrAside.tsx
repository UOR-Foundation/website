import { ReactNode } from "react";

export interface TldrAsideProps {
  /** Main TL;DR paragraph (or richer content). */
  children: ReactNode;
  /** Optional content rendered below the main paragraph (code samples, quotes, follow-ups). */
  extra?: ReactNode;
  /** Override the eyebrow label. Defaults to "TL;DR". */
  label?: string;
  /** Optional className override on the aside wrapper. */
  className?: string;
}

/**
 * TldrAside — the canonical TL;DR card used at the top of every long-form
 * article (blog posts, framework deep-dives). Locks the same border, padding,
 * eyebrow, and prose scale used by `/blog/universal-data-fingerprint` so all
 * articles read as one publication.
 */
const TldrAside = ({ children, extra, label = "TL;DR", className }: TldrAsideProps) => (
  <aside
    aria-label={label}
    className={
      "not-prose mb-12 md:mb-14 rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm px-6 md:px-8 py-6 md:py-7" +
      (className ? ` ${className}` : "")
    }
  >
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[11px] uppercase tracking-[0.24em] font-semibold text-primary/80 font-mono">
        {label}
      </span>
      <span className="h-px flex-1 bg-border/60" />
    </div>
    <div className="font-body text-[15px] md:text-[16px] leading-[1.75] text-foreground/85 [&>p]:m-0 [&>p+p]:mt-4">
      {children}
    </div>
    {extra ? <div className="mt-5">{extra}</div> : null}
  </aside>
);

export default TldrAside;