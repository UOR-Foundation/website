/**
 * Kernel Palette — Single source of truth for all Hologram UI colors.
 * ═══════════════════════════════════════════════════════════════════
 *
 * Every widget MUST import from here. No inline palette objects.
 * Values derive from the CSS custom properties in index.css which
 * are themselves rooted in the kernel config registers.
 *
 * @module hologram-os/kernel-palette
 */

/** Core palette derived from kernel config registers */
export const KP = {
  // Surfaces
  bg:          "hsl(var(--hologram-bg))",
  surface:     "hsl(var(--hologram-surface))",
  glass:       "var(--hologram-glass)",
  glassBorder: "var(--hologram-glass-border)",

  // Typography
  text:        "hsl(var(--hologram-text))",
  muted:       "hsl(var(--hologram-text-muted))",
  dim:         "hsl(30, 8%, 35%)",
  dimmer:      "hsl(30, 8%, 28%)",

  // Accents
  gold:        "hsl(var(--hologram-gold))",
  green:       "hsl(152, 44%, 50%)",
  red:         "hsl(0, 55%, 55%)",
  purple:      "hsl(var(--hologram-purple-warm))",

  // Semantic
  card:        "hsla(25, 8%, 12%, 0.6)",
  cardBorder:  "hsla(38, 12%, 70%, 0.08)",
  border:      "hsla(38, 12%, 70%, 0.1)",
  borderLight: "hsla(38, 18%, 28%, 0.14)",

  // Fonts
  font:        "'DM Sans', system-ui, sans-serif",
  serif:       "'Playfair Display', serif",
} as const;

/** Status colors for system health indicators */
export const STATUS_COLORS: Record<string, string> = {
  ready:    KP.green,
  degraded: KP.gold,
  offline:  KP.dim,
  error:    KP.red,
  synced:   KP.green,
  syncing:  "hsl(45, 70%, 55%)",
  pending:  "hsl(30, 80%, 55%)",
};

export type KernelPalette = typeof KP;
