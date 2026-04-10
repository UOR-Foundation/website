/**
 * Golden Ratio Constants — Single source of truth for φ-derived proportions.
 *
 * All spacing, typography, border-radius, and layout proportions across
 * the OS derive from φ (1.618) to create natural visual harmony.
 */

export const PHI = 1.618;
export const PHI_INV = 0.618;
export const PHI_SQ = PHI * PHI;       // 2.618
export const PHI_SQRT = Math.sqrt(PHI); // 1.272

/* ── Spacing scale (each step ≈ ×φ) ── */
export const SPACE = {
  xs:   4,
  sm:   6,   // 4 × φ ≈ 6.5 → 6
  md:  10,   // 6 × φ ≈ 9.7 → 10
  lg:  16,   // 10 × φ ≈ 16.2 → 16
  xl:  26,   // 16 × φ ≈ 25.9 → 26
  xxl: 42,   // 26 × φ ≈ 42.1 → 42
  xxxl: 68,  // 42 × φ ≈ 67.9 → 68
} as const;

/* ── Typography scale (body 17px, each step ×φ) ── */
export const TYPE = {
  caption: 11,   // 17 / φ ≈ 10.5 → 11
  small:   13,   // meta / labels
  body:    17,   // optimal reading size
  large:   21,   // 17 × φ^0.5 ≈ 21.6 → 21  (h3)
  h2:      28,   // 17 × φ ≈ 27.5 → 28
  h1:      44,   // 28 × φ ≈ 45.3 → 44
} as const;

/* ── Line height ratios ── */
export const LINE_HEIGHT = {
  tight:   1.2,
  heading: 1.3,
  body:    1.75,  // research optimal for extended reading (1.5–1.8)
  relaxed: 1.9,
  loose:   2.0,
} as const;

/* ── Border radius scale ── */
export const RADIUS = {
  xs:  4,
  sm:  6,
  md: 10,
  lg: 16,
  xl: 26,
} as const;

/* ── Content measure ── */
export const CONTENT = {
  bodyMaxWidth: 680,       // ≈ 65-75 chars at 17px — optimal line length
  wideMaxWidth: 1100,
  searchWidth: 618,        // φ-derived
  searchWidthVw: 61.8,     // viewport-relative φ
  opticalCenter: 38.2,     // φ⁻¹ as percentage — "optical center"
} as const;

/* ── Paragraph spacing (em-based, φ-proportioned) ── */
export const RHYTHM = {
  paragraphSpacing: '1.618em',
  sectionSpacingTop: '2.618em',  // φ²
  sectionSpacingBottom: '1em',
  pullQuoteMargin: '2.618em',
} as const;

/* ── Opacity hierarchy (φ-derived) ── */
export const OPACITY = {
  primary:   0.90,
  secondary: 0.56,  // 0.90 × φ⁻¹ ≈ 0.556
  tertiary:  0.34,  // 0.56 × φ⁻¹ ≈ 0.346
  ghost:     0.21,  // 0.34 × φ⁻¹ ≈ 0.210
} as const;

/* ── Shadow scale (φ-proportioned blur/spread) ── */
export const SHADOW = {
  windowActive:   '0 26px 42px -10px rgba(0,0,0,0.50), 0 10px 26px -6px rgba(0,0,0,0.30)',
  windowInactive: '0 16px 26px -10px rgba(0,0,0,0.35), 0 6px 16px -6px rgba(0,0,0,0.20)',
  panel:          '0 10px 26px -6px rgba(0,0,0,0.25)',
  subtle:         '0 4px 10px -4px rgba(0,0,0,0.12)',
} as const;

/* ── Image proportions ── */
export const MEDIA = {
  heroAspectRatio: '1.618 / 1',   // φ:1 — cinematic
  floatWidth: '38.2%',            // φ⁻¹ of container
  floatWidthPx: 0.382,            // multiplier
  imageRadius: RADIUS.md,         // 10px
  captionSpacing: RADIUS.md,      // 10px
} as const;

/* ── Transition timing ── */
export const TIMING = {
  instant: 120,   // below conscious perception
  fast: 150,      // feels instant (100-200ms research range)
  normal: 250,
  slow: 400,
} as const;
