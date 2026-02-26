/**
 * Hologram OS — Shared Palette Constants
 * ═══════════════════════════════════════
 *
 * Single source of truth for the Hologram UI color palette.
 * All components import from here instead of defining inline.
 *
 * @module hologram-ui/theme/palette
 */

export const P = {
  surface: "hsla(25, 10%, 10%, 0.88)",
  surfaceLight: "hsla(30, 8%, 22%, 0.8)",
  border: "hsla(38, 15%, 30%, 0.25)",
  goldLight: "hsl(38, 60%, 60%)",
  goldMuted: "hsl(38, 40%, 45%)",
  goldBg: "hsla(38, 50%, 40%, 0.15)",
  text: "hsl(38, 20%, 85%)",
  textMuted: "hsl(30, 10%, 60%)",
  textDim: "hsl(30, 10%, 50%)",
  font: "'DM Sans', sans-serif",
  fontDisplay: "'Playfair Display', serif",
} as const;
