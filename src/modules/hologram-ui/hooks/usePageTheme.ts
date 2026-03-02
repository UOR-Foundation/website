/**
 * usePageTheme — Complete page-level theming derived from the active desktop frame
 * ═══════════════════════════════════════════════════════════════════════════════════
 *
 * Every page/panel opened from the sidebar MUST use this hook for visual consistency.
 * The desktop frame mode is the single source of truth:
 *
 *   • "image" frame → warm dark palette (the signature Hologram look)
 *   • "white" frame → clean light palette (high-contrast, professional)
 *   • "dark"  frame → deep dark palette (reduced luminance, immersive)
 *
 * Returns a `PagePalette` with ready-to-use CSS values for backgrounds, text,
 * cards, borders, accents, and interactive elements. No component should ever
 * hardcode colors — always derive from this palette.
 *
 * @module hologram-ui/hooks/usePageTheme
 */

import { useMemo } from "react";
import { useScreenTheme, type ScreenTheme } from "./useScreenTheme";

export interface PagePalette {
  /** Effective mode: "light" or "dark" */
  mode: ScreenTheme;
  /** Whether user can locally toggle (only in image mode) */
  canToggle: boolean;
  /** Toggle function */
  toggle: () => void;

  // ── Surfaces ──
  /** Page background */
  bg: string;
  /** Elevated card/panel background */
  cardBg: string;
  /** Subtle card background (lower emphasis) */
  cardBgSubtle: string;
  /** Glass overlay background */
  glassBg: string;

  // ── Borders ──
  /** Standard border */
  border: string;
  /** Subtle border (lower emphasis) */
  borderSubtle: string;
  /** Card border */
  cardBorder: string;

  // ── Typography ──
  /** Primary text */
  text: string;
  /** Secondary text (labels, descriptions) */
  textMuted: string;
  /** Tertiary text (hints, timestamps) */
  textDim: string;
  /** Placeholder text */
  textPlaceholder: string;

  // ── Accents ──
  /** Primary accent (gold/amber in dark, deeper gold in light) */
  accent: string;
  /** Accent background for badges/pills */
  accentBg: string;
  /** Success color */
  green: string;
  /** Error color */
  red: string;
  /** Purple accent */
  purple: string;

  // ── Interactive ──
  /** Primary button background */
  btnPrimary: string;
  /** Primary button text */
  btnPrimaryText: string;
  /** Primary button shadow */
  btnPrimaryShadow: string;
  /** Input field background */
  inputBg: string;
  /** Input field border */
  inputBorder: string;
  /** Input focus ring */
  inputFocus: string;

  // ── Gradients ──
  /** Hero/header gradient overlay */
  headerGradient: string;
  /** Ambient glow */
  ambientGlow: string;
  /** Section highlight gradient */
  sectionHighlight: string;

  // ── Misc ──
  /** Scrollbar track */
  scrollTrack: string;
  /** Scrollbar thumb */
  scrollThumb: string;
  /** Backdrop for the projection shell */
  shellBackdrop: string;
  /** Beam gradient for projection edge */
  shellBeam: string;

  // ── Fonts ──
  font: string;
  serif: string;
}

function buildPalette(mode: ScreenTheme): Omit<PagePalette, "mode" | "canToggle" | "toggle"> {
  if (mode === "light") {
    return {
      // Surfaces
      bg: "hsl(0, 0%, 98%)",
      cardBg: "hsla(0, 0%, 100%, 0.85)",
      cardBgSubtle: "hsla(0, 0%, 96%, 0.7)",
      glassBg: "hsla(0, 0%, 100%, 0.6)",

      // Borders
      border: "hsla(0, 0%, 0%, 0.08)",
      borderSubtle: "hsla(0, 0%, 0%, 0.05)",
      cardBorder: "hsla(0, 0%, 0%, 0.07)",

      // Typography
      text: "hsl(0, 0%, 8%)",
      textMuted: "hsl(0, 0%, 30%)",
      textDim: "hsl(0, 0%, 50%)",
      textPlaceholder: "hsl(0, 0%, 60%)",

      // Accents
      accent: "hsl(32, 60%, 42%)",
      accentBg: "hsla(32, 60%, 42%, 0.1)",
      green: "hsl(152, 50%, 38%)",
      red: "hsl(0, 55%, 50%)",
      purple: "hsl(260, 40%, 50%)",

      // Interactive
      btnPrimary: "linear-gradient(135deg, hsl(32, 55%, 42%), hsl(28, 50%, 36%))",
      btnPrimaryText: "hsl(0, 0%, 100%)",
      btnPrimaryShadow: "0 4px 16px hsla(32, 55%, 40%, 0.2)",
      inputBg: "hsla(0, 0%, 100%, 0.8)",
      inputBorder: "hsla(0, 0%, 0%, 0.1)",
      inputFocus: "hsla(32, 60%, 50%, 0.3)",

      // Gradients
      headerGradient: "linear-gradient(180deg, hsl(0, 0%, 96%) 0%, hsla(0, 0%, 98%, 0) 100%)",
      ambientGlow: "radial-gradient(ellipse, hsla(32, 50%, 50%, 0.04), transparent 70%)",
      sectionHighlight: "linear-gradient(135deg, hsla(32, 30%, 50%, 0.04), hsla(260, 20%, 50%, 0.02))",

      // Misc
      scrollTrack: "hsla(0, 0%, 0%, 0.03)",
      scrollThumb: "hsla(0, 0%, 0%, 0.12)",
      shellBackdrop: "hsla(0, 0%, 100%, 0.6)",
      shellBeam: "linear-gradient(to bottom, hsla(32, 40%, 50%, 0.0), hsla(32, 40%, 50%, 0.1), hsla(32, 40%, 50%, 0.0))",

      // Fonts
      font: "'DM Sans', system-ui, sans-serif",
      serif: "'Playfair Display', serif",
    };
  }

  // Dark mode (used for both "dark" frame and "image" frame fallback)
  return {
    // Surfaces
    bg: "hsl(25, 8%, 7%)",
    cardBg: "hsla(25, 8%, 10%, 0.5)",
    cardBgSubtle: "hsla(25, 8%, 9%, 0.4)",
    glassBg: "hsla(25, 8%, 12%, 0.5)",

    // Borders
    border: "hsla(38, 12%, 70%, 0.1)",
    borderSubtle: "hsla(38, 12%, 70%, 0.06)",
    cardBorder: "hsla(38, 12%, 70%, 0.08)",

    // Typography
    text: "hsl(30, 8%, 92%)",
    textMuted: "hsl(30, 8%, 65%)",
    textDim: "hsl(30, 8%, 35%)",
    textPlaceholder: "hsl(30, 8%, 30%)",

    // Accents
    accent: "hsl(38, 50%, 55%)",
    accentBg: "hsla(38, 50%, 55%, 0.1)",
    green: "hsl(152, 44%, 50%)",
    red: "hsl(0, 55%, 55%)",
    purple: "hsl(260, 40%, 60%)",

    // Interactive
    btnPrimary: "linear-gradient(135deg, hsl(38, 50%, 50%), hsl(32, 55%, 42%))",
    btnPrimaryText: "hsl(30, 20%, 95%)",
    btnPrimaryShadow: "0 4px 16px hsla(38, 50%, 40%, 0.2)",
    inputBg: "hsla(25, 8%, 8%, 0.6)",
    inputBorder: "hsla(38, 12%, 70%, 0.1)",
    inputFocus: "hsla(38, 50%, 55%, 0.3)",

    // Gradients
    headerGradient: "linear-gradient(180deg, hsla(25, 12%, 8%, 1) 0%, hsla(25, 8%, 6%, 0) 100%)",
    ambientGlow: "radial-gradient(ellipse, hsla(38, 50%, 50%, 0.06), transparent 70%)",
    sectionHighlight: "linear-gradient(135deg, hsla(38, 30%, 50%, 0.06), hsla(260, 20%, 50%, 0.03))",

    // Misc
    scrollTrack: "hsla(38, 12%, 70%, 0.03)",
    scrollThumb: "hsla(38, 12%, 70%, 0.12)",
    shellBackdrop: "hsla(25, 8%, 4%, 0.25)",
    shellBeam: "linear-gradient(to bottom, hsla(38, 40%, 65%, 0.0), hsla(38, 40%, 65%, 0.15), hsla(38, 40%, 65%, 0.0))",

    // Fonts
    font: "'DM Sans', system-ui, sans-serif",
    serif: "'Playfair Display', serif",
  };
}

/**
 * Hook for page-level theming that cascades from the active desktop frame.
 *
 * @param screenId - Unique identifier for this page/panel (e.g., "ai-lab", "browser")
 * @param fallback - Default theme when in "image" mode (default: "dark")
 */
export function usePageTheme(screenId: string, fallback: ScreenTheme = "dark"): PagePalette {
  const { mode, toggle, canToggle } = useScreenTheme({ screenId, fallback });
  const palette = useMemo(() => buildPalette(mode), [mode]);
  return useMemo(() => ({ mode, canToggle, toggle, ...palette }), [mode, canToggle, toggle, palette]);
}
