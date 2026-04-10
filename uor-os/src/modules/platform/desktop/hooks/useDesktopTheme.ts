/**
 * useDesktopTheme — Theme context for UOR OS desktop.
 * Three themes: immersive (photo bg), dark (solid black), light (solid white).
 */

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import React from "react";

export type DesktopTheme = "immersive" | "dark" | "light";

interface ThemeContextValue {
  theme: DesktopTheme;
  setTheme: (t: DesktopTheme) => void;
  isLight: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "immersive",
  setTheme: () => {},
  isLight: false,
});

const STORAGE_KEY = "uor:desktop-theme";

function loadTheme(): DesktopTheme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "immersive" || v === "dark" || v === "light") return v;
  } catch {}
  return "immersive";
}

export function DesktopThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DesktopTheme>(loadTheme);

  const setTheme = useCallback((t: DesktopTheme) => {
    setThemeState(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
  }, []);

  const isLight = theme === "light";

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, setTheme, isLight } },
    children
  );
}

export function useDesktopTheme() {
  return useContext(ThemeContext);
}
