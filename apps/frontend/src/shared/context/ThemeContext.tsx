"use client";

import type React from "react";
import { createContext, useState, useContext, useEffect } from "react";

export type Theme = "light" | "dark" | "dracula";

const THEME_COOKIE = "st-theme";
const KNOWN_THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "dracula", label: "Dracula" },
];

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  themeOptions: { value: Theme; label: string }[];
  textScale: number;
  setTextScale: (scale: number) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialTheme?: Theme;
}> = ({
  children,
  initialTheme,
}) => {
  const [theme, setThemeState] = useState<Theme>(initialTheme ?? "light");
  const [textScale, setTextScaleState] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Client-side initialization
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const savedTextScale = localStorage.getItem("text-scale");

    let nextTheme: Theme =
      savedTheme && KNOWN_THEMES.some((t) => t.value === savedTheme)
        ? savedTheme
        : (initialTheme ?? "light");
    if (!KNOWN_THEMES.some((t) => t.value === nextTheme)) {
      nextTheme = "light";
    }

    setThemeState(nextTheme);
    if (savedTextScale !== null) {
      const parsed = Number(savedTextScale);
      if (Number.isFinite(parsed)) {
        setTextScaleState(Math.max(-2, Math.min(2, parsed)));
      }
    }
    setIsInitialized(true);
  }, [initialTheme]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("theme", theme);
      const root = document.documentElement;
      root.dataset.theme = theme;

      // Treat dark + dracula as dark-mode palettes for Tailwind's dark: classes
      if (theme === "dark" || theme === "dracula") {
        root.classList.add("dark");
        root.style.colorScheme = "dark";
      } else {
        root.classList.remove("dark");
        root.style.colorScheme = "light";
      }

      document.cookie = `${THEME_COOKIE}=${encodeURIComponent(theme)}; path=/; max-age=31536000; samesite=lax`;
    }
  }, [theme, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("text-scale", String(textScale));
    const root = document.documentElement;
    const basePx = 16;
    const nextPx = basePx + textScale;
    if (textScale === 0) {
      root.style.removeProperty("font-size");
      return;
    }
    root.style.fontSize = `${nextPx}px`;
  }, [isInitialized, textScale]);

  const toggleTheme = () => {
    setThemeState((prevTheme) => {
      const isDarkPalette =
        prevTheme === "dark" || prevTheme === "dracula";
      return isDarkPalette ? "light" : "dark";
    });
  };

  const setThemeSafe = (next: Theme) => {
    if (KNOWN_THEMES.some((t) => t.value === next)) {
      setThemeState(next);
      return;
    }
    setThemeState("light");
  };

  const themeOptions = KNOWN_THEMES;

  const setTextScale = (scale: number) => {
    const next = Math.max(-2, Math.min(2, Math.round(scale)));
    setTextScaleState(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme: setThemeSafe,
        themeOptions,
        textScale,
        setTextScale,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
