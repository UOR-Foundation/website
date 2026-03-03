/**
 * Notebook Theme — Light/Dark palette for the Quantum Jupyter Workspace
 * ═════════════════════════════════════════════════════════════════════
 *
 * Provides a full color palette for both light and dark modes.
 * All notebook components read from this via React context.
 *
 * @module hologram/kernel/notebook/notebook-theme
 */

import { createContext, useContext } from "react";

export interface NbColors {
  // Surfaces
  bg: string;
  bgSoft: string;
  bgToolbar: string;
  bgCell: string;
  bgCellCode: string;
  bgCellCodeBorder: string;
  bgCellCodeBorderActive: string;
  bgHover: string;
  bgHoverStrong: string;
  bgSelected: string;
  bgOverlay: string;
  bgInput: string;

  // Text
  text: string;
  textStrong: string;
  textMuted: string;
  textDim: string;
  textCode: string;
  caret: string;

  // Borders
  border: string;
  borderStrong: string;
  borderCell: string;

  // Syntax highlighting
  synComment: string;
  synString: string;
  synNumber: string;
  synKeyword: string;
  synBuiltin: string;
  synOperator: string;
  synDecorator: string;
  synSelf: string;

  // Accents
  gold: string;
  goldBg: string;
  goldText: string;
  green: string;
  greenBg: string;
  greenText: string;
  blue: string;
  blueBg: string;
  blueText: string;
  red: string;
  redBg: string;
  redText: string;
  purple: string;
  purpleBg: string;

  // Semantic
  cellBorderEdit: string;
  cellBorderCommand: string;
  cellBorderSelected: string;

  // Mode indicator
  editModeBg: string;
  editModeText: string;
  commandModeBg: string;
  commandModeText: string;

  // Chart
  chartBg: string;
  chartGrid: string;
  chartLabel: string;

  // Shadows
  shadow: string;
  shadowStrong: string;
}

export function nbColors(dark: boolean): NbColors {
  if (dark) {
    return {
      bg: "hsl(222, 14%, 11%)",
      bgSoft: "hsl(222, 14%, 13%)",
      bgToolbar: "hsl(222, 14%, 15%)",
      bgCell: "hsl(222, 14%, 12%)",
      bgCellCode: "hsl(222, 16%, 16%)",
      bgCellCodeBorder: "hsla(220, 20%, 50%, 0.15)",
      bgCellCodeBorderActive: "hsla(220, 30%, 60%, 0.3)",
      bgHover: "hsla(0, 0%, 100%, 0.04)",
      bgHoverStrong: "hsla(0, 0%, 100%, 0.07)",
      bgSelected: "hsla(220, 50%, 50%, 0.08)",
      bgOverlay: "hsla(0, 0%, 0%, 0.55)",
      bgInput: "hsl(222, 14%, 18%)",

      text: "hsl(0, 0%, 85%)",
      textStrong: "hsl(0, 0%, 93%)",
      textMuted: "hsl(0, 0%, 55%)",
      textDim: "hsl(0, 0%, 45%)",
      textCode: "hsl(220, 10%, 88%)",
      caret: "hsl(38, 60%, 65%)",

      border: "hsla(220, 15%, 50%, 0.12)",
      borderStrong: "hsla(220, 15%, 50%, 0.2)",
      borderCell: "hsla(220, 15%, 50%, 0.15)",

      synComment: "hsl(120, 30%, 58%)",
      synString: "hsl(25, 75%, 68%)",
      synNumber: "hsl(200, 75%, 68%)",
      synKeyword: "hsl(300, 65%, 75%)",
      synBuiltin: "hsl(180, 55%, 65%)",
      synOperator: "hsl(0, 0%, 62%)",
      synDecorator: "hsl(40, 70%, 65%)",
      synSelf: "hsl(300, 55%, 72%)",

      gold: "hsl(38, 60%, 58%)",
      goldBg: "hsla(38, 50%, 50%, 0.12)",
      goldText: "hsl(38, 50%, 65%)",
      green: "hsl(152, 50%, 55%)",
      greenBg: "hsla(152, 45%, 50%, 0.1)",
      greenText: "hsl(152, 45%, 62%)",
      blue: "hsl(220, 60%, 65%)",
      blueBg: "hsla(220, 50%, 50%, 0.1)",
      blueText: "hsl(220, 50%, 68%)",
      red: "hsl(0, 60%, 62%)",
      redBg: "hsla(0, 50%, 50%, 0.1)",
      redText: "hsl(0, 55%, 65%)",
      purple: "hsl(280, 55%, 68%)",
      purpleBg: "hsla(280, 50%, 50%, 0.1)",

      cellBorderEdit: "hsl(152, 55%, 55%)",
      cellBorderCommand: "hsl(220, 70%, 62%)",
      cellBorderSelected: "hsl(220, 45%, 55%)",

      editModeBg: "hsla(152, 45%, 50%, 0.12)",
      editModeText: "hsl(152, 45%, 62%)",
      commandModeBg: "hsla(220, 45%, 50%, 0.12)",
      commandModeText: "hsl(220, 50%, 65%)",

      chartBg: "hsla(220, 15%, 50%, 0.04)",
      chartGrid: "hsla(220, 15%, 50%, 0.1)",
      chartLabel: "hsl(0, 0%, 55%)",

      shadow: "0 4px 16px hsla(0, 0%, 0%, 0.3)",
      shadowStrong: "0 8px 32px hsla(0, 0%, 0%, 0.4)",
    };
  }

  return {
    bg: "hsl(0, 0%, 100%)",
    bgSoft: "hsl(0, 0%, 98%)",
    bgToolbar: "hsl(220, 10%, 97%)",
    bgCell: "hsl(0, 0%, 100%)",
    bgCellCode: "hsl(0, 0%, 100%)",
    bgCellCodeBorder: "hsla(220, 10%, 50%, 0.12)",
    bgCellCodeBorderActive: "hsla(220, 30%, 50%, 0.25)",
    bgHover: "hsla(0, 0%, 0%, 0.03)",
    bgHoverStrong: "hsla(0, 0%, 0%, 0.05)",
    bgSelected: "hsla(220, 50%, 50%, 0.03)",
    bgOverlay: "hsla(0, 0%, 0%, 0.4)",
    bgInput: "hsl(0, 0%, 100%)",

    text: "hsl(0, 0%, 25%)",
    textStrong: "hsl(0, 0%, 12%)",
    textMuted: "hsl(0, 0%, 45%)",
    textDim: "hsl(0, 0%, 55%)",
    textCode: "hsl(220, 15%, 15%)",
    caret: "hsl(220, 15%, 15%)",

    border: "hsla(0, 0%, 50%, 0.1)",
    borderStrong: "hsla(0, 0%, 50%, 0.15)",
    borderCell: "hsla(220, 10%, 50%, 0.12)",

    synComment: "hsl(120, 15%, 55%)",
    synString: "hsl(25, 65%, 50%)",
    synNumber: "hsl(200, 60%, 50%)",
    synKeyword: "hsl(300, 50%, 45%)",
    synBuiltin: "hsl(200, 55%, 45%)",
    synOperator: "hsl(0, 0%, 45%)",
    synDecorator: "hsl(40, 65%, 50%)",
    synSelf: "hsl(300, 50%, 45%)",

    gold: "hsl(38, 50%, 48%)",
    goldBg: "hsla(38, 50%, 50%, 0.06)",
    goldText: "hsl(38, 45%, 38%)",
    green: "hsl(152, 45%, 40%)",
    greenBg: "hsla(152, 45%, 50%, 0.06)",
    greenText: "hsl(152, 40%, 38%)",
    blue: "hsl(220, 45%, 50%)",
    blueBg: "hsla(220, 40%, 50%, 0.04)",
    blueText: "hsl(220, 30%, 40%)",
    red: "hsl(0, 55%, 50%)",
    redBg: "hsla(0, 40%, 50%, 0.06)",
    redText: "hsl(0, 55%, 50%)",
    purple: "hsl(280, 35%, 45%)",
    purpleBg: "hsla(280, 40%, 50%, 0.08)",

    cellBorderEdit: "hsl(152, 50%, 50%)",
    cellBorderCommand: "hsl(220, 65%, 55%)",
    cellBorderSelected: "hsl(220, 40%, 70%)",

    editModeBg: "hsla(152, 40%, 50%, 0.08)",
    editModeText: "hsl(152, 40%, 38%)",
    commandModeBg: "hsla(220, 40%, 50%, 0.08)",
    commandModeText: "hsl(220, 40%, 45%)",

    chartBg: "hsla(220, 10%, 50%, 0.02)",
    chartGrid: "hsla(0, 0%, 50%, 0.08)",
    chartLabel: "hsl(0, 0%, 55%)",

    shadow: "0 4px 16px hsla(0, 0%, 0%, 0.12)",
    shadowStrong: "0 8px 32px hsla(0, 0%, 0%, 0.15)",
  };
}

/** React context for notebook theme colors */
export const NbThemeCtx = createContext<NbColors>(nbColors(false));

/** Hook to consume notebook theme */
export function useNbTheme(): NbColors {
  return useContext(NbThemeCtx);
}
