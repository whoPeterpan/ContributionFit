/**
 * app/layout.tsx — Root layout for Contribution Finder.
 *
 * Sets up the Archivo + Archivo Black fonts via next/font/google,
 * wraps the app in next-themes ThemeProvider for dark mode, and
 * provides the skip-to-content link, header, and footer shell.
 */

import type { Metadata } from "next";
import { Archivo, Archivo_Black } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Contribution Finder — Find your first open-source issue",
    template: "%s | Contribution Finder",
  },
  description:
    "Find beginner-friendly, unassigned GitHub issues with AI-powered summaries. Built for students and first-time open-source contributors.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${archivoBlack.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-dvh flex flex-col antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Skip-to-content link — first focusable element on every page */}
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>

          <Header />

          <main id="main-content" tabIndex={-1} className="flex-1">
            {children}
          </main>

          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
