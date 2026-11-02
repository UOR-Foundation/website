/**
 * Shared typography roles.
 *
 * Each constant pairs one size token from index.css with the weight, tracking
 * and colour that role always uses. New sections should apply one of these
 * instead of writing text-[Npx] sizes, so every heading keeps the same size on
 * phone and desktop layouts. Adjust the scale itself in index.css (:root).
 */

/** Home banner headline. */
export const FD_HERO = "fd-head text-fd-hero font-medium tracking-[-0.035em]";

/** Section heading, used by every section on every page. */
export const FD_SECTION = "fd-head text-fd-section font-bold tracking-[-0.02em]";

/** Full article title on its own page. */
export const FD_ARTICLE = "fd-head text-fd-article font-bold tracking-[-0.02em]";

/** Featured card title. */
export const FD_CARD_LG = "fd-head text-fd-card-lg font-medium break-words";

/** Card title. */
export const FD_CARD = "fd-head text-fd-card font-medium break-words";

/** Title above a short column of points. */
export const FD_COLUMN = "fd-head text-fd-column font-medium";

/** Intro paragraph under the home banner headline. */
export const FD_LEAD = "text-fd-lead text-[hsl(var(--fd-dim))]";

/** Section body copy. */
export const FD_BODY = "text-fd-body text-[hsl(var(--fd-dim))]";

/** "// SECTION" eyebrow above a section heading. */
export const FD_EYEBROW =
  "fd-mono text-fd-eyebrow uppercase tracking-[0.2em] text-[hsl(var(--fd-accent))]";

/** Small mono label, such as a post category. */
export const FD_CATEGORY =
  "fd-mono text-fd-label uppercase tracking-[0.2em] text-[hsl(var(--fd-accent))]";

/** Small mono label in the muted colour, such as "In production at". */
export const FD_LABEL =
  "fd-mono text-fd-label uppercase tracking-[0.2em] text-[hsl(var(--fd-dim))]";
