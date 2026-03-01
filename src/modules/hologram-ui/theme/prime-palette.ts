/**
 * Hologram Prime — Design Palette (Theme-Aware)
 * ══════════════════════════════════════════════
 *
 * Inspired by Aman resorts:
 *   Dark  → Evening: warm, deep, glass-like
 *   Light → Daytime: cream, sand, airy linen
 *
 * `P` is a Proxy that reads from the active theme.
 * Every consumer sees the correct values without any code changes.
 *
 * @module hologram-prime/compat/palette
 */

export type PrimeTheme = "dark" | "light";

interface PaletteTokens {
  surface: string;
  surfaceLight: string;
  surfaceGlass: string;
  border: string;
  borderLight: string;
  accent: string;
  accentMuted: string;
  accentGlow: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  live: string;
  liveGlow: string;
  font: string;
  fontDisplay: string;
  // Page-level backgrounds
  bgGradientTop: string;
  bgGradientBottom: string;
  bgSolid: string;
}

const DARK: PaletteTokens = {
  // Surfaces — frosted glass, warm tint
  surface: "hsla(30, 8%, 12%, 0.65)",
  surfaceLight: "hsla(30, 6%, 18%, 0.45)",
  surfaceGlass: "hsla(30, 5%, 15%, 0.35)",

  // Borders — barely visible, like breath on glass
  border: "hsla(30, 8%, 40%, 0.1)",
  borderLight: "hsla(30, 8%, 50%, 0.08)",

  // Accent — warm sand/gold, gentle
  accent: "hsl(38, 45%, 62%)",
  accentMuted: "hsl(38, 30%, 50%)",
  accentGlow: "hsla(38, 45%, 55%, 0.12)",

  // Text — warm, readable, breathing
  text: "hsl(35, 15%, 88%)",
  textSecondary: "hsl(30, 8%, 62%)",
  textTertiary: "hsl(30, 6%, 45%)",

  // Status
  live: "hsl(152, 40%, 58%)",
  liveGlow: "hsla(152, 40%, 55%, 0.25)",

  // Typography
  font: "'DM Sans', system-ui, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",

  // Backgrounds
  bgGradientTop: "hsl(28, 8%, 8%)",
  bgGradientBottom: "hsl(25, 10%, 5%)",
  bgSolid: "hsl(25, 10%, 4%)",
};

const LIGHT: PaletteTokens = {
  // Surfaces — linen, warm cream, sunlit
  surface: "hsla(35, 25%, 95%, 0.75)",
  surfaceLight: "hsla(35, 20%, 90%, 0.55)",
  surfaceGlass: "hsla(35, 18%, 92%, 0.45)",

  // Borders — soft shadow on warm paper
  border: "hsla(30, 15%, 70%, 0.18)",
  borderLight: "hsla(30, 12%, 75%, 0.12)",

  // Accent — terracotta/sienna, grounded
  accent: "hsl(28, 55%, 42%)",
  accentMuted: "hsl(28, 35%, 52%)",
  accentGlow: "hsla(28, 50%, 45%, 0.1)",

  // Text — warm espresso tones
  text: "hsl(25, 20%, 16%)",
  textSecondary: "hsl(25, 10%, 42%)",
  textTertiary: "hsl(25, 8%, 58%)",

  // Status
  live: "hsl(152, 45%, 38%)",
  liveGlow: "hsla(152, 40%, 40%, 0.2)",

  // Typography (same fonts)
  font: "'DM Sans', system-ui, sans-serif",
  fontDisplay: "'Playfair Display', Georgia, serif",

  // Backgrounds — warm sand/cream
  bgGradientTop: "hsl(38, 30%, 95%)",
  bgGradientBottom: "hsl(35, 25%, 92%)",
  bgSolid: "hsl(36, 28%, 94%)",
};

// ── Global Theme State ────────────────────────────────────────────────────

const THEME_KEY = "hologram-prime-theme";

let _currentTheme: PrimeTheme = (() => {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {}
  return "dark";
})();

let _listeners: Array<(theme: PrimeTheme) => void> = [];

export function getPrimeTheme(): PrimeTheme {
  return _currentTheme;
}

export function setPrimeTheme(theme: PrimeTheme): void {
  _currentTheme = theme;
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
  _listeners.forEach(fn => fn(theme));
}

export function onThemeChange(fn: (theme: PrimeTheme) => void): () => void {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

function getTokens(): PaletteTokens {
  return _currentTheme === "light" ? LIGHT : DARK;
}

// ── Proxy-based Palette ──────────────────────────────────────────────────
// Every property access reads from the current theme — zero changes needed
// in consuming components. `P.text` always returns the active theme's value.

export const P = new Proxy({} as PaletteTokens, {
  get(_target, prop: string) {
    return getTokens()[prop as keyof PaletteTokens];
  },
});
