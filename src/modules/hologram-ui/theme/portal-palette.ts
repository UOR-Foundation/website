/**
 * Portal Palette — Theme-aware design tokens for the mobile portal
 * ═══════════════════════════════════════════════════════════════════
 *
 * Dark mode:  The canonical void. Deep, warm darkness. Luminous projections.
 * Light mode: Crisp daylight. Clean white canvas. Sharp, high-contrast typography.
 *
 * All spacing follows the Golden Ratio (φ = 1.618).
 */

import { getPrimeTheme, onThemeChange, type PrimeTheme } from "./prime-palette";

// ── Golden Ratio Constants ──────────────────────────────────────────────
export const PHI = 1.618;
export const PHI_INV = 0.618;

/** Golden ratio spacing scale (base 8px) */
export const GR = {
  xs: 5,       // 8 / φ
  sm: 8,       // base
  md: 13,      // 8 × φ
  lg: 21,      // 13 × φ
  xl: 34,      // 21 × φ
  xxl: 55,     // 34 × φ
  xxxl: 89,    // 55 × φ
} as const;

// ── Token Interfaces ────────────────────────────────────────────────────

interface PortalTokens {
  // Canvas
  canvas: string;
  canvasSubtle: string;

  // Text
  text: string;
  textSecondary: string;
  textWhisper: string;

  // Orb
  orbGlow: string;
  orbRing: string;
  orbCenter: string;
  orbBreathRing: string;

  // Bloom
  bloomCardBg: string;
  bloomCardBorder: string;
  bloomCardShadow: string;

  // Accents
  accent: string;
  accentMuted: string;

  // Glyph
  glyphColor: string;
  glyphGlow: string;

  // Drawer / overlays
  drawerBg: string;
  drawerBorder: string;
  backdropColor: string;

  // Narrative (new user)
  narrativeText: string;
  narrativeFade: string;

  // Typography
  font: string;
  fontDisplay: string;
}

const DARK: PortalTokens = {
  canvas: "hsl(25, 10%, 4%)",
  canvasSubtle: "hsl(25, 8%, 7%)",

  text: "hsl(38, 15%, 90%)",
  textSecondary: "hsl(38, 10%, 65%)",
  textWhisper: "hsl(38, 12%, 58%)",

  orbGlow: "hsla(38, 40%, 55%, 0.12)",
  orbRing: "hsla(38, 25%, 65%, 0.2)",
  orbCenter: "hsl(38, 40%, 65%)",
  orbBreathRing: "hsla(38, 25%, 65%, 0.08)",

  bloomCardBg: "hsla(25, 10%, 12%, 0.92)",
  bloomCardBorder: "hsla(38, 15%, 30%, 0.15)",
  bloomCardShadow: "0 12px 48px hsla(0, 0%, 0%, 0.5)",

  accent: "hsl(38, 40%, 65%)",
  accentMuted: "hsl(38, 25%, 48%)",

  glyphColor: "hsla(38, 20%, 70%, 0.12)",
  glyphGlow: "hsla(38, 30%, 55%, 0.04)",

  drawerBg: "hsla(25, 10%, 10%, 0.96)",
  drawerBorder: "hsla(38, 12%, 25%, 0.15)",
  backdropColor: "hsla(25, 10%, 4%, 0.7)",

  narrativeText: "hsl(38, 15%, 85%)",
  narrativeFade: "hsla(38, 15%, 85%, 0.4)",

  font: "'DM Sans', system-ui, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",
};

const LIGHT: PortalTokens = {
  canvas: "hsl(0, 0%, 100%)",
  canvasSubtle: "hsl(40, 15%, 97%)",

  text: "hsl(25, 25%, 12%)",
  textSecondary: "hsl(25, 12%, 40%)",
  textWhisper: "hsl(25, 10%, 50%)",

  orbGlow: "hsla(38, 45%, 50%, 0.1)",
  orbRing: "hsla(25, 20%, 40%, 0.15)",
  orbCenter: "hsl(28, 55%, 42%)",
  orbBreathRing: "hsla(25, 15%, 50%, 0.08)",

  bloomCardBg: "hsla(0, 0%, 100%, 0.95)",
  bloomCardBorder: "hsla(25, 15%, 75%, 0.2)",
  bloomCardShadow: "0 12px 48px hsla(25, 15%, 30%, 0.12)",

  accent: "hsl(28, 55%, 42%)",
  accentMuted: "hsl(28, 35%, 52%)",

  glyphColor: "hsla(25, 15%, 40%, 0.06)",
  glyphGlow: "hsla(28, 30%, 50%, 0.03)",

  drawerBg: "hsla(0, 0%, 100%, 0.97)",
  drawerBorder: "hsla(25, 12%, 80%, 0.3)",
  backdropColor: "hsla(25, 10%, 60%, 0.25)",

  narrativeText: "hsl(25, 25%, 15%)",
  narrativeFade: "hsla(25, 25%, 15%, 0.35)",

  font: "'DM Sans', system-ui, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",
};

function getTokens(): PortalTokens {
  return getPrimeTheme() === "light" ? LIGHT : DARK;
}

/** Proxy-based portal palette — reads active theme on every access */
export const PP = new Proxy({} as PortalTokens, {
  get(_target, prop: string) {
    return getTokens()[prop as keyof PortalTokens];
  },
});

/** Check if portal is in dark mode */
export function isPortalDark(): boolean {
  return getPrimeTheme() === "dark";
}
