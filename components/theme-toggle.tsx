/**
 * components/theme-toggle.tsx — Dark/light mode toggle button.
 *
 * Uses next-themes to switch between themes. Uses useSyncExternalStore
 * to safely detect client-side mounting without triggering cascading renders.
 * Has an aria-label that describes the action.
 */

"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const emptySubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  // Render a placeholder before mount to avoid hydration mismatch and layout shift
  if (!mounted) {
    return (
      <button
        type="button"
        className="theme-toggle inline-flex items-center justify-center w-11 h-11 border-[3px] border-border bg-card shadow-brut brut-interactive"
        aria-label="Toggle theme"
        disabled
      >
        <span className="w-5 h-5" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle inline-flex items-center justify-center w-11 h-11 border-[3px] border-border bg-card text-foreground shadow-brut brut-interactive focus-visible:outline-4 focus-visible:outline-offset-2 outline-foreground cursor-pointer"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-foreground" aria-hidden="true" />
      ) : (
        <Moon className="w-5 h-5 text-foreground" aria-hidden="true" />
      )}
    </button>
  );
}
