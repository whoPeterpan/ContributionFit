"use client";

/**
 * components/theme-provider.tsx — Client-side ThemeProvider wrapper.
 *
 * Wraps next-themes ThemeProvider for React 19 / Next.js 16 compatibility.
 * Filters out the React 19 false-positive script tag console warning triggered
 * by next-themes's theme pre-hydration inline script.
 */

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

// Filter out React 19 development warning regarding next-themes pre-hydration script tag
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  /* eslint-disable no-console */
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };
  /* eslint-enable no-console */
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
