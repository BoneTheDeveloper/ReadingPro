"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useServerInsertedHTML } from "next/navigation";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  themes: Theme[];
};

const storageKey = "theme";
const themes: Theme[] = ["light", "dark", "system"];
const defaultTheme: Theme = "system";

const ThemeContext = createContext<ThemeContextValue>({
  theme: defaultTheme,
  setTheme: () => {},
  resolvedTheme: "light",
  systemTheme: "light",
  themes,
});

const themeInitScript = `
(function() {
  try {
    var storedTheme = localStorage.getItem("${storageKey}") || "${defaultTheme}";
    var systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    var resolvedTheme = storedTheme === "system" ? systemTheme : storedTheme;

    if (resolvedTheme !== "dark" && resolvedTheme !== "light") {
      resolvedTheme = systemTheme;
    }

    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolvedTheme);
    document.documentElement.style.colorScheme = resolvedTheme;
  } catch (_) {}
})();
`;

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") {
    return defaultTheme;
  }

  const storedTheme = localStorage.getItem(storageKey);
  return isTheme(storedTheme) ? storedTheme : defaultTheme;
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === "system" ? getSystemTheme() : theme;
}

function applyResolvedTheme(theme: ResolvedTheme) {
  document.documentElement.classList.remove("light", "dark");
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  useServerInsertedHTML(() => (
    <script
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: themeInitScript }}
    />
  ));

  const setTheme = useCallback((nextTheme: Theme) => {
    if (!isTheme(nextTheme)) {
      return;
    }

    setThemeState(nextTheme);
    localStorage.setItem(storageKey, nextTheme);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function handleSystemThemeChange() {
      const nextSystemTheme = mediaQuery.matches ? "dark" : "light";
      setSystemTheme(nextSystemTheme);
      setThemeState((currentTheme) => {
        if (currentTheme === "system") {
          applyResolvedTheme(nextSystemTheme);
        }

        return currentTheme;
      });
    }

    handleSystemThemeChange();
    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  useEffect(() => {
    applyResolvedTheme(resolveTheme(theme));
  }, [theme, systemTheme]);

  useEffect(() => {
    function handleStorageChange(event: StorageEvent) {
      if (event.key !== storageKey) {
        return;
      }

      setThemeState(isTheme(event.newValue) ? event.newValue : defaultTheme);
    }

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme: resolveTheme(theme),
      systemTheme,
      themes,
    }),
    [setTheme, systemTheme, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
